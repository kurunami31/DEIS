import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes.js';
import catalogRoutes from '../modules/catalog/catalog.routes.js';
import studentRoutes from '../modules/students/students.routes.js';
import enrollmentRoutes from '../modules/enrollments/enrollments.routes.js';
import sectionRoutes from '../modules/sections/sections.routes.js';
import gradeRoutes from '../modules/grades/grades.routes.js';
import analyticsRoutes from '../modules/analytics/analytics.routes.js';
import adminRoutes from '../modules/admin/admin.routes.js';

export const routes = Router();

routes.use('/auth', authRoutes);
routes.use('/catalog', catalogRoutes);
routes.use('/students', studentRoutes);
routes.use('/enrollments', enrollmentRoutes);
routes.use('/sections', sectionRoutes);
routes.use('/grades', gradeRoutes);
routes.use('/analytics', analyticsRoutes);
routes.use('/admin', adminRoutes);