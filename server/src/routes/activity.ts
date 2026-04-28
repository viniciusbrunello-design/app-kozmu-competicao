import { Router, Response, NextFunction } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import * as activityService from '../services/activity.service';

const router = Router();

router.use(requireAuth);

router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const limit = Number(req.query.limit) || 30;
    const feed = await activityService.getUserFeed(req.userId!, limit);
    res.json({ success: true, data: feed });
  } catch (err) {
    next(err);
  }
});

export default router;
