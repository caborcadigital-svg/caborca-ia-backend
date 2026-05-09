const express = require('express');
const { supabase, supabaseAdmin } = require('../../config/supabase');
const { adminMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('publicidad')
      .select('*')
      .eq('activo', true)
      .order('orden');
    if (error) throw error;
    res.json(data || []);
  } catch { res.status(500).json({ error: 'Error obteniendo publicidad' }); }
});

router.post('/', adminMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('publicidad')
      .insert([{ ...req.body, creado_por: req.user.id }])
      .select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch { res.status(500).json({ error: 'Error creando publicidad' }); }
});

router.put('/:id', adminMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('publicidad')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select().single();
    if (error) throw error;
    res.json(data);
  } catch { res.status(500).json({ error: 'Error actualizando publicidad' }); }
});

router.delete('/:id', adminMiddleware, async (req, res) => {
  try {
    const { error } = await supabaseAdmin.from('publicidad').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch { res.status(500).json({ error: 'Error eliminando publicidad' }); }
});

module.exports = router;
