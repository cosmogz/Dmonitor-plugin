import { Router, Request, Response } from 'express';
import { AlertsRepository } from '../../shared/repositories/alerts.repository';

export const alertsRouter = Router();

alertsRouter.get('/', async (req: Request, res: Response) => {
  const { patientId } = req.query as { patientId?: string };
  if (patientId) {
    const alerts = await AlertsRepository.findByPatient(patientId);
    return res.json({ patientId, alerts });
  }

  // fallback: return empty (pagination not implemented)
  return res.json({ alerts: [] });
});

alertsRouter.post('/:id/ack', async (req: Request, res: Response) => {
  const { id } = req.params;
  const updated = await AlertsRepository.acknowledge(id);
  if (!updated) return res.status(404).json({ error: 'Alert not found' });
  return res.json({ message: 'Alert acknowledged', alert: updated });
});
