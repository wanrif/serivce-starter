import { Router } from 'express';
import auth from 'controllers/auth';
import starter from 'controllers/starter';
import chatting from 'controllers/chatting';
import qna from 'controllers/qna';

const router = Router();

router.use('/', starter);
router.use('/auth', auth);
router.use('/chatting', chatting);
router.use('/qna', qna);

export default router;
