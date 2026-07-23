import { Hono } from 'hono';
import type { Env, AdminUser } from './types';
import { cors } from './middleware/cors';
import { publicCache } from './middleware/cache';
import { errorHandler } from './middleware/error-handler';
import { verifyAdmin } from './middleware/auth';
import { loginHandler, refreshHandler, checkHandler, logoutHandler } from './routes/auth';
import productsRoutes from './routes/products';
import categoriesRoutes from './routes/categories';
import sizesRoutes from './routes/sizes';
import brandsRoutes from './routes/brands';
import imagesRoutes from './routes/images';
import settingsRoutes from './routes/settings';
import { adminsRouter } from './routes/settings';
import statsRoutes from './routes/stats';
import analyticsRoutes from './routes/analytics';
import analyticsPublicRoutes from './routes/analytics_public';
import rendimientoRoutes from './routes/rendimiento';
import videoDropsRoutes from './routes/video-drops';
import { legacyFetch } from './legacy';

const app = new Hono<{ Bindings: Env }>();

// Global middlewares
app.use('*', cors);
app.onError(errorHandler);

// Public cache for GET endpoints
app.use('/api/products/*', publicCache);
app.use('/api/categories/*', publicCache);
app.use('/api/sizes/*', publicCache);
app.use('/api/brands/*', publicCache);
app.use('/api/settings/*', publicCache);
app.use('/api/video-drops/*', publicCache);

// Public routes
app.route('/api/products', productsRoutes);
app.route('/api/categories', categoriesRoutes);
app.route('/api/sizes', sizesRoutes);
app.route('/api/brands', brandsRoutes);
app.route('/api/settings', settingsRoutes);
app.route('/api/video-drops', videoDropsRoutes);

// Public analytics tracking (sin auth, sin cache)
app.route('/api/analytics/track', analyticsPublicRoutes);

// Auth routes (públicas, sin verifyAdmin)
app.post('/api/admin/login', loginHandler);
app.post('/api/admin/refresh', refreshHandler);
app.get('/api/admin/check', checkHandler);
app.post('/api/admin/logout', logoutHandler);

// Admin routes (autenticadas con verifyAdmin)
const admin = new Hono<{ Bindings: Env; Variables: { adminUser: AdminUser } }>();
admin.use('/api/admin/products*', verifyAdmin);
admin.use('/api/admin/categories*', verifyAdmin);
admin.use('/api/admin/sizes*', verifyAdmin);
admin.use('/api/admin/brands*', verifyAdmin);
admin.use('/api/admin/images*', verifyAdmin);
admin.use('/api/admin/settings*', verifyAdmin);
admin.use('/api/admin/admins*', verifyAdmin);
admin.use('/api/admin/stats*', verifyAdmin);
admin.use('/api/admin/analytics*', verifyAdmin);
admin.use('/api/admin/rendimiento*', verifyAdmin);
admin.use('/api/admin/video-drops*', verifyAdmin);
admin.route('/api/admin/products', productsRoutes);
admin.route('/api/admin/categories', categoriesRoutes);
admin.route('/api/admin/sizes', sizesRoutes);
admin.route('/api/admin/brands', brandsRoutes);
admin.route('/api/admin/images', imagesRoutes);
admin.route('/api/admin/settings', settingsRoutes);
admin.route('/api/admin/admins', adminsRouter);
admin.route('/api/admin/stats', statsRoutes);
admin.route('/api/admin/analytics', analyticsRoutes);
admin.route('/api/admin/rendimiento', rendimientoRoutes);
admin.route('/api/admin/video-drops', videoDropsRoutes);

app.route('/', admin);

// Legacy fallback — routes not yet migrated to Hono
app.all('*', async (c) => {
  return legacyFetch(c.req.raw, c.env);
});

export default app;
