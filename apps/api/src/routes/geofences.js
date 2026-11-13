import { Router } from 'express';
import { supabase } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const SELECT_FIELDS =
  'id, nombre, geojson, color, created_by, created_at, updated_at';

const COLORS = ['#b4552d', '#2e7d6b', '#3a6ea5', '#8a4a8f', '#c99a2c', '#555555'];

function isValidGeoJSON(g) {
  return (
    g &&
    typeof g === 'object' &&
    g.type === 'Feature' &&
    g.geometry &&
    ['Polygon', 'MultiPolygon'].includes(g.geometry.type) &&
    Array.isArray(g.geometry.coordinates)
  );
}

// GET público: lista todas las geocercas
router.get('/', async (_req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('geocercas')
      .select(SELECT_FIELDS)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ items: data });
  } catch (err) {
    next(err);
  }
});

// POST — requiere autenticación
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { nombre, geojson, color } = req.body || {};
    if (!nombre || typeof nombre !== 'string' || !nombre.trim()) {
      return res.status(400).json({ error: 'nombre es requerido' });
    }
    if (!isValidGeoJSON(geojson)) {
      return res.status(400).json({
        error: 'geojson debe ser un Feature con geometría Polygon o MultiPolygon',
      });
    }

    const { data, error } = await supabase
      .from('geocercas')
      .insert({
        nombre: nombre.trim(),
        geojson,
        color: COLORS.includes(color) ? color : '#b4552d',
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

// PUT /:id — requiere autenticación
router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const { data: existing, error: findErr } = await supabase
      .from('geocercas')
      .select('id')
      .eq('id', req.params.id)
      .maybeSingle();
    if (findErr) throw findErr;
    if (!existing) return res.status(404).json({ error: 'Geocerca no encontrada' });

    const body = req.body || {};
    const updates = {};
    if (body.nombre !== undefined) {
      if (typeof body.nombre !== 'string' || !body.nombre.trim()) {
        return res.status(400).json({ error: 'nombre inválido' });
      }
      updates.nombre = body.nombre.trim();
    }
    if (body.geojson !== undefined) {
      if (!isValidGeoJSON(body.geojson)) {
        return res.status(400).json({ error: 'geojson inválido' });
      }
      updates.geojson = body.geojson;
    }
    if (body.color !== undefined) {
      updates.color = COLORS.includes(body.color) ? body.color : '#b4552d';
    }
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('geocercas')
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
      .from('geocercas')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
