import { Router, Response, NextFunction } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import * as rankingService from '../services/ranking.service';

const router = Router();

router.use(requireAuth);

router.get('/weekly', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const groupId = req.query.groupId as string | undefined;
    const ranking = await rankingService.getWeeklyRanking(groupId);
    res.json({ success: true, data: ranking });
  } catch (err) {
    next(err);
  }
});

router.get('/monthly', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const groupId = req.query.groupId as string | undefined;
    const ranking = await rankingService.getMonthlyRanking(groupId);
    res.json({ success: true, data: ranking });
  } catch (err) {
    next(err);
  }
});

router.get('/streak', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const ranking = await rankingService.getStreakRanking();
    res.json({ success: true, data: ranking });
  } catch (err) {
    next(err);
  }
});

router.get('/me', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const period = (req.query.period as string) === 'monthly' ? 'monthly' : 'weekly';
    const groupId = req.query.groupId as string | undefined;
    const rank = await rankingService.getUserRank(req.userId!, period, groupId);
    res.json({ success: true, data: rank });
  } catch (err) {
    next(err);
  }
});

export default router;
