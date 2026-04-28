import { Router, Response, NextFunction } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createSubmissionSchema } from '../schemas/submissions.schema';
import * as submissionsService from '../services/submissions.service';

const router = Router();

router.use(requireAuth);

router.post('/', validate(createSubmissionSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const submission = await submissionsService.createSubmission(req.userId!, req.body);
    res.status(201).json({ success: true, data: submission });
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const status = req.query.status as string | undefined;
    const submissions = await submissionsService.getUserSubmissions(req.userId!, status);
    res.json({ success: true, data: submissions });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/validate', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const submission = await submissionsService.validateSubmission(req.params.id, req.userId!, 'moderator');
    res.json({ success: true, data: submission });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/reject', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { reason } = req.body;
    await submissionsService.rejectSubmission(req.params.id, req.userId!, reason ?? 'Conteúdo inválido');
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
