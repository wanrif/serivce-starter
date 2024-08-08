import { boomify, unauthorized } from '@hapi/boom';
import type { NextFunction, Request, Response } from 'express';
import type { JwtPayload } from 'jsonwebtoken';
import { getTokenService } from 'services/tokenService';
import { getUserService } from 'services/userService';
import { JWT } from 'utils/JWT';

const LOG = 'STARTER_MIDDLEWARE_LOG:';

interface User {
  id?: string;
  name: string;
  email: string;
}

export interface IUserRequest extends Request {
  user: User;
}

const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      console.error(`${LOG} AUTHENTICATE Token not found!`);
      throw unauthorized('Please authenticate!');
    }

    const decode = JWT.verify(token);

    const findToken = await getTokenService(token);
    if (!findToken) {
      console.error(`${LOG} AUTHENTICATE Token not found!`);
      throw unauthorized('Please authenticate!');
    }

    const { email } = decode as JwtPayload;
    const findUser = await getUserService(email);
    if (!findUser) {
      console.error(`${LOG} AUTHENTICATE User not found!`);
      throw unauthorized('Please authenticate!');
    }

    (req as IUserRequest).user = findUser;
    next();
  } catch (err: any) {
    console.error(`${LOG} AUTHENTICATE ${err}`);
    const error = boomify(err);
    res.status(error.output.statusCode).send(error.output.payload);
  }
};

export default authenticate;
