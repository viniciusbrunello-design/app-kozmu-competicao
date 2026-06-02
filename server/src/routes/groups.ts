import { Router, Response, NextFunction } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createGroupSchema, joinGroupSchema, updateGroupSchema } from '../schemas/groups.schema';
import * as groupsService from '../services/groups.service';
import * as rankingService from '../services/ranking.service';
import * as activityService from '../services/activity.service';
import * as challengesService from '../services/challenges.service';

const router = Router();

router.use(requireAuth);

router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const groups = await groupsService.getUserGroups(req.userId!);
    res.json({ success: true, data: groups });
  } catch (err) {
    next(err);
  }
});

router.post('/', validate(createGroupSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const group = await groupsService.createGroup(req.userId!, req.body);
    res.status(201).json({ success: true, data: group });
  } catch (err) {
    next(err);
  }
});

router.get('/public', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const groups = await groupsService.getPublicGroups(req.userId!);
    res.json({ success: true, data: groups });
  } catch (err) {
    next(err);
  }
});

router.post('/join', validate(joinGroupSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const group = await groupsService.joinGroup(req.userId!, req.body);
    res.json({ success: true, data: group });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const group = await groupsService.getGroupDetails(req.params.id, req.userId);
    res.json({ success: true, data: group });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', validate(updateGroupSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const group = await groupsService.getGroupDetails(req.params.id, req.userId!);
    if (group.myRole !== 'admin') {
      res.status(403).json({ success: false, error: { message: 'Apenas admins podem editar o grupo' } });
      return;
    }
    res.json({ success: true, data: group });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/leave', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await groupsService.leaveGroup(req.userId!, req.params.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/join-public', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const group = await groupsService.joinPublicGroup(req.userId!, req.params.id);
    res.json({ success: true, data: group });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/ranking', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const period = (req.query.period as string) === 'monthly' ? 'monthly' : 'weekly';
    const ranking =
      period === 'monthly'
        ? await rankingService.getMonthlyRanking(req.params.id)
        : await rankingService.getWeeklyRanking(req.params.id);
    res.json({ success: true, data: ranking });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/activity', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const limit = Number(req.query.limit) || 20;
    const offset = Number(req.query.offset) || 0;
    const activities = await activityService.getGroupActivity(req.params.id, limit, offset);
    res.json({ success: true, data: activities });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/challenges', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const challenges = await challengesService.getGroupChallenges(req.params.id, req.userId);
    res.json({ success: true, data: challenges });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/invite', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const code = await groupsService.generateInviteLink(req.params.id, req.userId!);
    res.json({ success: true, data: { inviteCode: code } });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/nudge/:targetUserId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await groupsService.nudgeMember(req.userId!, req.params.id, req.params.targetUserId);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/cycle-result', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await groupsService.getCycleResult(req.params.id, req.userId!);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.put('/:id/settings', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await groupsService.updateGroupSettings(req.params.id, req.userId!, req.body);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.put('/:id/scoring-rules', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { rules } = req.body;
    if (!Array.isArray(rules)) {
      res.status(400).json({ success: false, error: { message: 'rules deve ser um array' } });
      return;
    }
    await groupsService.updateScoringRules(req.params.id, req.userId!, rules);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id/members/:userId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await groupsService.removeMember(req.params.id, req.userId!, req.params.userId);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/end', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await groupsService.endGroup(req.params.id, req.userId!);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/reset-cycle', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await groupsService.resetGroupCycle(req.params.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
