import { Router } from 'express';
import auth from 'controllers/auth';
import starter from 'controllers/starter';
import chatting from 'controllers/chatting';

const router = Router();

router.use('/', starter);
router.use('/auth', auth);
router.use('/chatting', chatting);

export default router;
