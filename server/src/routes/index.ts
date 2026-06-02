import { Router } from 'express';
import authRouter from './auth';
import usersRouter from './users';
import groupsRouter from './groups';
import submissionsRouter from './submissions';
import challengesRouter from './challenges';
import rankingRouter from './ranking';
import activityRouter from './activity';
import notificationsRouter from './notifications';
import goalsRouter from './goals';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

router.use('/auth', authRouter);
router.use('/users', usersRouter);
router.use('/groups', groupsRouter);
router.use('/submissions', submissionsRouter);
router.use('/challenges', challengesRouter);
router.use('/ranking', rankingRouter);
router.use('/activity', activityRouter);
router.use('/notifications', notificationsRouter);
router.use('/goals', goalsRouter);

export default router;
