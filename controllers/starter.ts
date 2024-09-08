import { type Boom, boomify } from '@hapi/boom';
import { type Response, Router } from 'express';
import authenticate, { type IUserRequest } from 'middleware/authMiddleware';
import wrapAsync from 'utils/wrapHandler';

const LOG = 'STARTER_LOG:';
const router = Router();

const starter = async (req: IUserRequest, res: Response) => {
  try {
    const user_name = req.user.name;
    res.send({ message: `Hello ${user_name}!` });
  } catch (err: any) {
    console.error(`${LOG} ${err}`);
    const error: Boom = boomify(err);
    res.status(error.output.statusCode).send(error.output.payload);
  }
};

router.get('/', authenticate, wrapAsync(starter));

export default router;
