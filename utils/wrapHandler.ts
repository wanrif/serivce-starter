import type { NextFunction, Request, Response } from 'express';
import type { IUserRequest } from 'middleware/authMiddleware';

const isUserRequest = (req: Request): req is IUserRequest => {
  return (req as IUserRequest).user !== undefined;
};

// const wrapAsync = (fn: (req: IUserRequest, res: Response, next: NextFunction) => Promise<any>) => {
//   return (req: Request, res: Response, next: NextFunction) => {
//     fn(req as IUserRequest, res, next).catch(next);
//   };
// };

const wrapHandler = (handler: (req: IUserRequest, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (isUserRequest(req)) {
      handler(req, res, next).catch(next);
    } else {
      res.status(500).json({ message: 'Internal server error' });
    }
  };
};

export default wrapHandler;
