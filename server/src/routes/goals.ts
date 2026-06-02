import { Router, Response, NextFunction } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import * as goalsService from '../services/goals.service';

const router = Router();
router.use(requireAuth);

router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const goals = await goalsService.getUserGoals(req.userId!);
    res.json({ success: true, data: goals });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { title, targetCount, format, startDate, endDate } = req.body;
    if (!title || !targetCount || !startDate || !endDate) {
      res.status(400).json({ success: false, error: { message: 'Campos obrigatórios: title, targetCount, startDate, endDate' } });
      return;
    }
    const goal = await goalsService.createUserGoal(req.userId!, {
      title,
      targetCount: Number(targetCount),
      format: format || undefined,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    });
    res.status(201).json({ success: true, data: goal });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await goalsService.deleteUserGoal(req.userId!, req.params.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
