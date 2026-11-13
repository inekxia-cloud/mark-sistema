import { Router } from 'express';
import { supabase } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const CATEGORIES = ['fonda', 'platillo', 'mercado', 'bebida', 'postre', 'otro'];
const ZONES = ['zona_centro', 'avenida_juarez', 'mercado_cuauhtemoc', 'otra'];
const STATUSES = ['borrador', 'publicado'];

const SELECT_FIELDS =
  'id, titulo, categoria, zona, direccion, descripcion, historia, imagen_url, ingredientes, estado, created_by, created_at, updated_at';

// GET público: solo entradas publicadas
router.get('/', async (req, res, next) => {
  try {
    let query = supabase
      .from('patrimonio_gastronomico')
      .select(SELECT_FIELDS)
      .eq('estado', 'publicado')
      .order('created_at', { ascending: false });

    if (req.query.categoria) query = query.eq('categoria', req.query.categoria);
    if (req.query.zona) query = query.eq('zona', req.query.zona);
    if (req.query.q) query = query.ilike('titulo', `%${req.query.q}%`);

    const { data, error } = await query;
    if (error) throw error;
    res.json({ items: data });
  } catch (err) {
    next(err);
  }
});

// GET /all — todos los registros (incluye borradores), solo autenticados
router.get('/all', requireAuth, async (_req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('patrimonio_gastronomico')
      .select(SELECT_FIELDS)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ items: data });
  } catch (err) {
    next(err);
  }
});

// GET /:id público
router.get('/:id', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('patrimonio_gastronomico')
      .select(SELECT_FIELDS)
      .eq('id', req.params.id)
      .eq('estado', 'publicado')
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Registro no encontrado' });
    res.json({ item: data });
  } catch (err) {
    next(err);
  }
});

// POST — requiere autenticación
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const body = req.body || {};
    const { titulo, categoria, zona, descripcion, historia, imagen_url, ingredientes } = body;

    if (!titulo || !categoria) {
      return res.status(400).json({ error: 'titulo y categoria son requeridos' });
    }
    if (!CATEGORIES.includes(categoria)) {
      return res.status(400).json({ error: `categoria debe ser una de: ${CATEGORIES.join(', ')}` });
    }
    if (zona && !ZONES.includes(zona)) {
      return res.status(400).json({ error: `zona debe ser una de: ${ZONES.join(', ')}` });
    }

    const { data, error } = await supabase
      .from('patrimonio_gastronomico')
      .insert({
        titulo,
        categoria,
        zona: zona || 'otra',
        direccion: body.direccion || null,
        descripcion: descripcion || null,
        historia: historia || null,
        imagen_url: imagen_url || null,
        ingredientes: Array.isArray(ingredientes) ? ingredientes : [],
        estado: 'borrador',
        created_by: req.user.sub,
      })
      .select(SELECT_FIELDS)
      .single();

    if (error) throw error;
    res.status(201).json({ item: data });
  } catch (err) {
    next(err);
  }
});

// PUT /:id — requiere autenticación (el creador o cualquier editor autenticado)
router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const { data: existing, error: findErr } = await supabase
      .from('patrimonio_gastronomico')
      .select('id, created_by')
      .eq('id', req.params.id)
      .maybeSingle();
    if (findErr) throw findErr;
    if (!existing) return res.status(404).json({ error: 'Registro no encontrado' });

    const body = req.body || {};
    const updates = {};
    const allowed = ['titulo', 'categoria', 'zona', 'direccion', 'descripcion', 'historia', 'imagen_url', 'ingredientes', 'estado'];
    for (const key of allowed) {
      if (key in body) updates[key] = body[key];
    }
    if (updates.categoria && !CATEGORIES.includes(updates.categoria)) {
      return res.status(400).json({ error: 'categoria inválida' });
    }
    if (updates.zona && !ZONES.includes(updates.zona)) {
      return res.status(400).json({ error: 'zona inválida' });
    }
    if (updates.estado && !STATUSES.includes(updates.estado)) {
      return res.status(400).json({ error: 'estado inválido' });
    }
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('patrimonio_gastronomico')
      .update(updates)
      .eq('id', req.params.id)
      .select(SELECT_FIELDS)
      .single();

    if (error) throw error;
    res.json({ item: data });
  } catch (err) {
    next(err);
  }
});

// DELETE /:id — requiere autenticación
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const { error } = await supabase
      .from('patrimonio_gastronomico')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
