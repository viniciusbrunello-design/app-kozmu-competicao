import { Router, Response, NextFunction } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createChallengeSchema } from '../schemas/challenges.schema';
import * as challengesService from '../services/challenges.service';

const router = Router();

router.use(requireAuth);

router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const challenges = await challengesService.getUserChallenges(req.userId!);
    res.json({ success: true, data: challenges });
  } catch (err) {
    next(err);
  }
});

router.post('/', validate(createChallengeSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const challenge = await challengesService.createChallenge(req.userId!, req.body);
    res.status(201).json({ success: true, data: challenge });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const challenge = await challengesService.getChallengeDetails(req.params.id, req.userId);
    res.json({ success: true, data: challenge });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/join', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const participant = await challengesService.joinChallenge(req.userId!, req.params.id);
    res.json({ success: true, data: participant });
  } catch (err) {
    next(err);
  }
});

export default router;
