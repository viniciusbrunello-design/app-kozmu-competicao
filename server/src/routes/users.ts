import { Router, Response, NextFunction } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import * as usersService from '../services/users.service';

const router = Router();

router.use(requireAuth);

router.get('/me/stats', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const formatBreakdown = await usersService.getFormatStats(req.userId!);
    res.json({ success: true, data: { formatBreakdown } });
  } catch (err) {
    next(err);
  }
});

router.get('/me/heatmap', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const heatmap = await usersService.getUserHeatmap(req.userId!);
    res.json({ success: true, data: heatmap });
  } catch (err) {
    next(err);
  }
});

router.get('/me', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await usersService.getUserProfile(req.userId!);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});

router.put('/me', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await usersService.updateUserProfile(req.userId!, req.body);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});

router.get('/:username', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await usersService.getPublicProfile(req.params.username);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});

export default router;
