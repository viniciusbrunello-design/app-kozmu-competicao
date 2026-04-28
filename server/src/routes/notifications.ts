import { Router, Response, NextFunction } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import * as notificationsService from '../services/notifications.service';

const router = Router();

router.use(requireAuth);

router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const unreadOnly = req.query.unread === 'true';
    const notifications = await notificationsService.getUserNotifications(req.userId!, unreadOnly);
    const unreadCount = await notificationsService.getUnreadCount(req.userId!);
    res.json({ success: true, data: { notifications, unreadCount } });
  } catch (err) {
    next(err);
  }
});

router.put('/read-all', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await notificationsService.markAllNotificationsRead(req.userId!);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.put('/:id/read', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await notificationsService.markNotificationRead(req.params.id, req.userId!);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
