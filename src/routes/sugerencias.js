const express = require('express');
const { supabase, supabaseAdmin } = require('../../config/supabase');
const { adminMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('sugerencias_chat')
      .select('*')
      .eq('activo', true)
      .order('orden');
    if (error) throw error;
    res.json(data || []);
  } catch { res.status(500).json({ error: 'Error obteniendo sugerencias' }); }
});

router.get('/todas', adminMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('sugerencias_chat')
      .select('*')
      .order('orden');
    if (error) throw error;
    res.json(data || []);
  } catch { res.status(500).json({ error: 'Error obteniendo sugerencias' }); }
});

router.post('/', adminMiddleware, async (req, res) => {
  try {
    const { texto, activo = true, orden = 0 } = req.body;
    if (!texto) return res.status(400).json({ error: 'Texto requerido' });
    const { data, error } = await supabaseAdmin
      .from('sugerencias_chat')
      .insert([{ texto, activo, orden }])
      .select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch { res.status(500).json({ error: 'Error creando sugerencia' }); }
});

router.put('/:id', adminMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('sugerencias_chat')
      .update(req.body)
      .eq('id', req.params.id)
      .select().single();
    if (error) throw error;
    res.json(data);
  } catch { res.status(500).json({ error: 'Error actualizando sugerencia' }); }
});

router.delete('/:id', adminMiddleware, async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('sugerencias_chat')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch { res.status(500).json({ error: 'Error eliminando sugerencia' }); }
});

module.exports = router;
