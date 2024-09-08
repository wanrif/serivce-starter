// auth.middleware.ts

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

    try {
      const decode = JWT.verify(token);
      const { email } = decode as JwtPayload;
      const findUser = await getUserService(email);
      if (!findUser) {
        console.error(`${LOG} AUTHENTICATE User not found!`);
        throw unauthorized('Please authenticate!');
      }

      (req as IUserRequest).user = findUser;
      next();
    } catch (_jwtError) {
      // If token is expired, check for a refresh token
      const refreshToken = req.header('X-Refresh-Token');
      if (!refreshToken) {
        throw unauthorized('INVALID_ACCESS_TOKEN');
      }

      const refresh_token = refreshToken.replace('Bearer ', '');
      const findRefreshToken = await getTokenService(refresh_token);
      if (!findRefreshToken) {
        throw unauthorized('INVALID_REFRESH_TOKEN');
      }

      // Verify refresh token
      const decoded = JWT.verify(refresh_token);
      const { email } = decoded as JwtPayload;
      const findUser = await getUserService(email);
      if (!findUser) {
        throw unauthorized('User not found');
      }

      (req as IUserRequest).user = findUser;
      next();
    }
  } catch (err: any) {
    console.error(`${LOG} AUTHENTICATE ${err}`);
    const error = boomify(err);
    res.status(error.output.statusCode).send(error.output.payload);
  }
};

export default authenticate;
