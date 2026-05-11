const express = require('express');
const { supabaseAdmin } = require('../../config/supabase');
const { adminMiddleware, superadminMiddleware } = require('../middleware/auth');
const router = express.Router();

router.use(adminMiddleware);

router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '50');
    const page = parseInt(req.query.page || '1');
    const offset = (page - 1) * limit;
    const seccion = req.query.seccion;
    const usuario_id = req.query.usuario_id;

    let query = supabaseAdmin.from('logs_actividad').select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (seccion) query = query.eq('seccion', seccion);
    if (usuario_id) query = query.eq('usuario_id', usuario_id);

    const { data, error, count } = await query;
    if (error) throw error;
    res.json({ data: data || [], total: count || 0, page, limit });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { accion, seccion, detalle, usuario_id, usuario_nombre } = req.body;
    const result = await supabaseAdmin.from('logs_actividad').insert([{
      accion, seccion, detalle,
      usuario_id: usuario_id || req.user?.id,
      usuario_nombre: usuario_nombre || req.user?.nombre || req.user?.username,
      ip: req.ip,
    }]).select().single();
    if (result.error) throw result.error;
    res.status(201).json(result.data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/limpiar', superadminMiddleware, async (req, res) => {
  try {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - 90);
    const result = await supabaseAdmin.from('logs_actividad').delete().lt('created_at', fecha.toISOString());
    if (result.error) throw result.error;
    res.json({ ok: true, mensaje: 'Logs anteriores a 90 dias eliminados' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
