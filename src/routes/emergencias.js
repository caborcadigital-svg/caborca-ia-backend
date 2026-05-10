const express = require('express');
const { supabase, supabaseAdmin } = require('../../config/supabase');
const { adminMiddleware, superadminMiddleware } = require('../middleware/auth');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const result = await supabase.from('emergencias').select('*').eq('activo', true).order('orden', { ascending: true }).order('categoria', { ascending: true });
    if (result.error) throw result.error;
    res.json(result.data || []);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/admin', adminMiddleware, async (req, res) => {
  try {
    const result = await supabaseAdmin.from('emergencias').select('*').order('orden', { ascending: true }).order('categoria', { ascending: true });
    if (result.error) throw result.error;
    res.json(result.data || []);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', adminMiddleware, async (req, res) => {
  try {
    const { nombre, tipo, categoria, telefono, telefono2, descripcion, direccion, activo } = req.body;
    if (!nombre || !telefono) return res.status(400).json({ error: 'Nombre y telefono requeridos' });
    const result = await supabaseAdmin.from('emergencias').insert([{ nombre, tipo, categoria, telefono, telefono2, descripcion, direccion, activo: activo !== false }]).select().single();
    if (result.error) throw result.error;
    res.status(201).json(result.data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', adminMiddleware, async (req, res) => {
  try {
    const result = await supabaseAdmin.from('emergencias').update({ ...req.body, updated_at: new Date().toISOString() }).eq('id', req.params.id).select().single();
    if (result.error) throw result.error;
    res.json(result.data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', superadminMiddleware, async (req, res) => {
  try {
    const result = await supabaseAdmin.from('emergencias').delete().eq('id', req.params.id);
    if (result.error) throw result.error;
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
