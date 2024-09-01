import { badImplementation } from '@hapi/boom';
import jsonwebtoken from 'jsonwebtoken';
import pino from './logHelper';

export const JWT = {
  sign: (payload: object, options?: jsonwebtoken.SignOptions) => {
    try {
      const secret = Bun.env.JWT_SECRET;
      return jsonwebtoken.sign(payload, secret, options);
    } catch (_err: any) {
      pino.logger.error(`JWT.sign: ${_err}`);
      throw badImplementation('UNABLE_TO_SIGN_TOKEN');
    }
  },
  verify: (token: string) => {
    try {
      const secret = Bun.env.JWT_SECRET;
      return jsonwebtoken.verify(token, secret);
    } catch (_err: any) {
      throw badImplementation('UNVERIFIED_TOKEN');
    }
  },
};
