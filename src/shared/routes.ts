import { Router } from 'express';
import { patientRouter } from '../modules/patients/patient.controller';
import { readingRouter } from '../modules/readings/reading.controller';
import { syncRouter } from '../modules/sync/sync.controller';
import { analyticsRouter } from '../modules/analytics/analytics.controller';
import { alertsRouter } from '../modules/alerts/alerts.controller';

export const routes = Router();
routes.use('/patients', patientRouter);
routes.use('/readings', readingRouter);
routes.use('/sync', syncRouter);
routes.use('/analytics', analyticsRouter);
routes.use('/alerts', alertsRouter);
