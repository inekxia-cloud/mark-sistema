import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { supabase } from '../config/supabase.js';
import { signToken, requireAuth } from '../middleware/auth.js';
import { authRateLimit } from '../middleware/rateLimit.js';

const router = Router();
const BCRYPT_ROUNDS = 12;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post('/register', authRateLimit, async (req, res, next) => {
  try {
    const { email, password, full_name, role } = req.body || {};
    if (!email || !password || !full_name) {
      return res.status(400).json({ error: 'email, password y full_name son requeridos' });
    }
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'Email inválido' });
    }
    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
    }

    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle();
    if (existing) {
      return res.status(409).json({ error: 'El correo ya está registrado' });
    }

    const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    // El rol siempre se asigna en el servidor; nunca confiar en el cliente.
    const allowedRoles = ['investigador', 'editor'];
    const safeRole = allowedRoles.includes(role) ? role : 'investigador';

    const { data: user, error } = await supabase
      .from('users')
      .insert({
        email: email.toLowerCase(),
        password_hash,
        full_name,
        role: safeRole,
      })
      .select('id, email, full_name, role, created_at')
      .single();

    if (error) throw error;

    res.status(201).json({
      token: signToken(user.id),
      user,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/login', authRateLimit, async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'email y password son requeridos' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, full_name, role, password_hash')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (error) throw error;

    // Respuesta genérica para no revelar si el correo existe.
    if (
      !user ||
      !user.password_hash ||
      !(await bcrypt.compare(password, user.password_hash))
    ) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const { password_hash, ...safeUser } = user;
    res.json({ token: signToken(user.id), user: safeUser });
  } catch (err) {
    next(err);
  }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, full_name, role, created_at')
      .eq('id', req.user.sub)
      .single();
    if (error) throw error;
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

export default router;
