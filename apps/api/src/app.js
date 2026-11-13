import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import gastronomyRoutes from './routes/gastronomy.js';
import geofenceRoutes from './routes/geofences.js';
import rateLimit from './middleware/rateLimit.js';

const app = express();

// Cabeceras de seguridad básicas
app.disable('x-powered-by');
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));

// Balance de cargas: límite global de peticiones por IP
app.use(rateLimit());

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/gastronomy', gastronomyRoutes);
app.use('/api/geofences', geofenceRoutes);

// 404
app.use((_req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

// Manejador de errores centralizado
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[api] Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Error interno del servidor',
  });
});

export default app;
