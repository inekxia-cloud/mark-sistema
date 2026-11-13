// Balance de cargas: middleware de rate limiting por IP.
// Implementación en memoria (ventana fija). En serverless cada instancia
// mantiene su propio contador; para límites estrictos globales conviene
// respaldarlo con una tabla en Supabase o un servicio externo.

function getKey(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.socket.remoteAddress ||
    'unknown'
  );
}

function prune(store, now) {
  if (store.size < 5000) return;
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key);
  }
}

export function rateLimit({ windowMs, max } = {}) {
  const win = windowMs ?? Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000);
  const limit = max ?? Number(process.env.RATE_LIMIT_MAX || 100);
  const store = new Map(); // ip -> { count, resetAt } (por instancia de middleware)

  return (req, res, next) => {
    const now = Date.now();
    const key = getKey(req);
    let entry = store.get(key);

    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + win };
      store.set(key, entry);
    }

    entry.count += 1;
    prune(store, now);

    res.setHeader('X-RateLimit-Limit', String(limit));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, limit - entry.count)));

    if (entry.count > limit) {
      res.setHeader('Retry-After', Math.ceil((entry.resetAt - now) / 1000));
      return res.status(429).json({
        error: 'Demasiadas peticiones. Intenta de nuevo más tarde.',
      });
    }
    next();
  };
}

// Límite estricto para endpoints sensibles (login/registro)
export const authRateLimit = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  max: Number(process.env.AUTH_RATE_LIMIT_MAX || 10),
});

export default rateLimit;
