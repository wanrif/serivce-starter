import { type Boom, badImplementation, badRequest, boomify, unauthorized } from '@hapi/boom';
import { type Request, type Response, Router } from 'express';
import qrCode from 'qrcode';
import { sendMail } from 'services/mailService';
import { createTokenService, getTokenService } from 'services/tokenService';
import { createUserService, getUserService } from 'services/userService';
import speakeasy from 'speakeasy';
import otpEmail from 'templates/otpEmail';
import { JWT } from 'utils/JWT';
import { getCache, setCache } from 'utils/redisHelper';
import { z } from 'zod';

const LOG = 'STARTER_AUTH_LOG:';
const router = Router();

const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const validation = z
      .object({
        email: z.string().email(),
        password: z.string().min(8),
      })
      .safeParse({ email, password });

    if (!validation.success) {
      const formatted = validation.error.flatten();
      const simplifiedErrors: Record<string, string> = {};

      for (const key of Object.keys(formatted.fieldErrors)) {
        const errors = formatted.fieldErrors as Record<string, string[]>;
        simplifiedErrors[key] = errors[key][0];
      }

      console.error(`${LOG} LOGIN ${JSON.stringify(simplifiedErrors)}`);

      const error = unauthorized('Invalid validation!');
      return res.status(error.output.statusCode).json({
        statusCode: error.output.statusCode,
        error: error.output.payload.error,
        message: error.message,
        validation_error: simplifiedErrors,
      });
    }

    const findUser = await getUserService(email, true);
    console.log('findUser', findUser);

    if (!findUser) {
      console.error(`${LOG} LOGIN User not found!`);
      throw unauthorized('Invalid credentials!');
    }

    const verifyPassword = await Bun.password.verify(password, findUser.password);

    if (!verifyPassword) {
      console.error(`${LOG} LOGIN Invalid credentials!`);
      throw unauthorized('Invalid credentials!');
    }

    const access_token = JWT.sign({ id: findUser._id, email, name: findUser.name });
    const refresh_token = JWT.sign({ email, name: findUser.name }, { expiresIn: '7d' });

    const findToken = await getTokenService(findUser._id as string);
    if (findToken) {
      await findToken.updateOne({ access_token, refresh_token });
    } else {
      await createTokenService({
        access_token,
        refresh_token,
        user: findUser._id as string,
      });
    }

    res.json({
      message: 'User logged in successfully',
      data: {
        access_token,
        refresh_token,
      },
    });
  } catch (err: any) {
    console.error(`${LOG} LOGIN ${err}`);
    const error = boomify(err);
    res.status(error.output.statusCode).send(error.output.payload);
  }
};

const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    const validation = z
      .object({
        name: z.string().min(3),
        email: z.string().email(),
        password: z.string().min(8),
      })
      .safeParse({ name, email, password });

    if (!validation.success) {
      const formatted = validation.error.flatten();

      console.error(`${LOG} REGISTER ${JSON.stringify(formatted)}`);

      const error = badRequest('Invalid validation!');
      return res.status(error.output.statusCode).json({
        statusCode: error.output.statusCode,
        error: error.output.payload.error,
        message: error.message,
        validation_error: formatted,
      });
    }

    const findUser = await getUserService(email);

    if (findUser) {
      throw badRequest('User already exists!');
    }

    const hashedPassword = await Bun.password.hash(password, {
      algorithm: 'argon2id',
      memoryCost: 4,
      timeCost: 3,
    });

    await createUserService({ name, email, password: hashedPassword });

    res.json({
      message: 'User registered successfully',
    });
  } catch (err: any) {
    console.error(`${LOG} REGISTER ${err}`);
    const error: Boom = boomify(err);
    res.status(error.output.statusCode).send(error.output.payload);
  }
};

const enableTwoFA = async (_req: Request, res: Response) => {
  try {
    const secret = speakeasy.generateSecret({
      length: 20,
      name: 'Starter',
      issuer: 'Starter',
    });

    if (secret.otpauth_url) {
      qrCode.toDataURL(secret.otpauth_url, (err, data_url) => {
        if (err) {
          console.error(`${LOG} Enable TwoFA ${err}`);
          throw badImplementation('Error generating QR code!');
        }

        res.send({
          statusCode: 200,
          message: 'success',
          qrCode: data_url,
          secret: secret.base32,
        });
      });
    }
  } catch (error: any) {
    console.error(`${LOG} Enable TwoFA ${error}`);
    const err = boomify(error);
    res.status(err.output.statusCode).send(err.output.payload);
  }
};

const verifyTwoFA = async (req: Request, res: Response) => {
  try {
    const { token, secret } = req.body;

    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
    });

    if (!verified) {
      throw unauthorized('Invalid 2FA token!');
    }

    res.send({
      statusCode: 200,
      message: '2FA token verified successfully',
      verified,
    });
  } catch (err: any) {
    console.error(`${LOG} VERIFY 2FA ${err}`);
    const error: Boom = boomify(err);
    res.status(error.output.statusCode).send(error.output.payload);
  }
};

const refresh = async (req: Request, res: Response) => {
  try {
    const { refresh_token } = req.body;

    const findToken = await getTokenService(refresh_token);

    if (!findToken) {
      console.error(`${LOG} REFRESH Token not found!`);
      throw unauthorized('Invalid refresh token!');
    }

    const findUser = await getUserService(findToken.user);

    if (!findUser) {
      console.error(`${LOG} REFRESH User not found!`);
      throw unauthorized('Invalid refresh token!');
    }

    const access_token = JWT.sign({ email: findUser.email });
    const new_refresh_token = JWT.sign({ email: findUser.email }, { expiresIn: '7d' });

    await findToken.updateOne({
      access_token,
      refresh_token: new_refresh_token,
    });

    res.json({
      message: 'Token refreshed successfully',
      token: {
        access_token,
        refresh_token: new_refresh_token,
      },
    });
  } catch (err: any) {
    console.error(`${LOG} REFRESH ${err}`);
    const error = boomify(err);
    res.status(error.output.statusCode).send(error.output.payload);
  }
};

const sendOTP = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    const validation = z
      .object({
        email: z.string().email(),
      })
      .safeParse({ email });

    if (!validation.success) {
      const formatted = validation.error.flatten();
      const simplifiedErrors: Record<string, string> = {};

      for (const key of Object.keys(formatted.fieldErrors)) {
        const errors = formatted.fieldErrors as Record<string, string[]>;
        simplifiedErrors[key] = errors[key][0];
      }

      console.error(`${LOG} SEND OTP ${JSON.stringify(simplifiedErrors)}`);

      const error = badRequest('Invalid validation!');
      return res.status(error.output.statusCode).json({
        statusCode: error.output.statusCode,
        error: error.output.payload.error,
        message: error.message,
        validation_error: simplifiedErrors,
      });
    }

    const checkCache = await getCache(email);
    if (checkCache) {
      console.error(`${LOG} SEND OTP OTP already sent! Please wait for 5 minutes.`);
      throw unauthorized('OTP already sent! Please wait for 5 minutes.');
    }

    const findUser = await getUserService(email);

    if (!findUser) {
      console.error(`${LOG} SEND OTP User not found!`);
      throw unauthorized('User not found!');
    }

    /* Generate a random 6 digit OTP */
    const otp = Math.floor(100000 + Math.random() * 900000);

    /* Set the OTP in the database with expires 5 second */
    await setCache(email, otp.toString(), 5);

    await sendMail(email, 'OTP for password reset', otpEmail(otp));

    res.json({
      statusCode: 200,
      message: 'OTP sent successfully',
    });
  } catch (err: any) {
    console.error(`${LOG} SEND OTP ${err}`);
    const error = boomify(err);
    res.status(error.output.statusCode).send(error.output.payload);
  }
};

router.post('/login', login);
router.post('/register', register);
router.post('/enable-2fa', enableTwoFA);
router.post('/verify-2fa', verifyTwoFA);
router.post('/refresh', refresh);
router.post('/send-otp', sendOTP);

export default router;
