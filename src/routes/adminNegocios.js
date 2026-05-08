const express = require('express');
const { adminMiddleware } = require('../middleware/auth');
const { supabaseAdmin } = require('../../config/supabase');

const router = express.Router();
router.use(adminMiddleware);

router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('negocios')
      .select('*')
      .order('nombre');
    if (error) throw error;
    res.json(data || []);
  } catch { res.status(500).json({ error: 'Error obteniendo negocios' }); }
});

router.post('/', async (req, res) => {
  try {
    const { nombre, categoria, descripcion, direccion, telefono, horario, imagen_url, lat, lng } = req.body;
    if (!nombre) return res.status(400).json({ error: 'Nombre requerido' });
    const { data, error } = await supabaseAdmin
      .from('negocios')
      .insert([{ nombre, categoria, descripcion, direccion, telefono, horario, imagen_url, lat, lng, activo: true, creado_por: req.user.id }])
      .select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch { res.status(500).json({ error: 'Error creando negocio' }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('negocios')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select().single();
    if (error) throw error;
    res.json(data);
  } catch { res.status(500).json({ error: 'Error actualizando negocio' }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabaseAdmin.from('negocios').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch { res.status(500).json({ error: 'Error eliminando negocio' }); }
});

module.exports = router;
