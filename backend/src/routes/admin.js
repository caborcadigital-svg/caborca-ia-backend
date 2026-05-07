const express = require('express');
const { adminMiddleware } = require('../middleware/auth');
const { crearNoticia, actualizarNoticia, eliminarNoticia } = require('../services/noticiasService');
const { crearEvento, actualizarEvento, eliminarEvento } = require('../services/eventosService');
const { getReportes, actualizarEstadoReporte, eliminarReporte } = require('../services/reportesService');
const { crearPartido, actualizarPartido } = require('../services/deportesService');
const { supabaseAdmin } = require('../../config/supabase');

const router = express.Router();

router.use(adminMiddleware);

router.post('/noticias', async (req, res) => {
  try {
    const { titulo, contenido, resumen, imagen_url, categoria, link_externo } = req.body;
    if (!titulo || !contenido) return res.status(400).json({ error: 'Título y contenido requeridos' });
    const data = await crearNoticia({ titulo, contenido, resumen, imagen_url, categoria, link_externo, autor: req.user.id, publicada: true });
    res.status(201).json(data);
  } catch { res.status(500).json({ error: 'Error creando noticia' }); }
});

router.put('/noticias/:id', async (req, res) => {
  try {
    const data = await actualizarNoticia(req.params.id, req.body);
    res.json(data);
  } catch { res.status(500).json({ error: 'Error actualizando noticia' }); }
});

router.delete('/noticias/:id', async (req, res) => {
  try {
    await eliminarNoticia(req.params.id);
    res.json({ ok: true });
  } catch { res.status(500).json({ error: 'Error eliminando noticia' }); }
});

router.post('/eventos', async (req, res) => {
  try {
    const data = await crearEvento({ ...req.body, activo: true });
    res.status(201).json(data);
  } catch { res.status(500).json({ error: 'Error creando evento' }); }
});

router.put('/eventos/:id', async (req, res) => {
  try {
    const data = await actualizarEvento(req.params.id, req.body);
    res.json(data);
  } catch { res.status(500).json({ error: 'Error actualizando evento' }); }
});

router.delete('/eventos/:id', async (req, res) => {
  try {
    await eliminarEvento(req.params.id);
    res.json({ ok: true });
  } catch { res.status(500).json({ error: 'Error eliminando evento' }); }
});

router.get('/reportes/pendientes', async (req, res) => {
  try {
    const data = await getReportes({ estado: 'pendiente', limit: 50 });
    res.json(data);
  } catch { res.status(500).json({ error: 'Error obteniendo reportes' }); }
});

router.put('/reportes/:id/estado', async (req, res) => {
  try {
    const { estado } = req.body;
    const data = await actualizarEstadoReporte(req.params.id, estado);
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/reportes/:id', async (req, res) => {
  try {
    await eliminarReporte(req.params.id);
    res.json({ ok: true });
  } catch { res.status(500).json({ error: 'Error eliminando reporte' }); }
});

router.post('/deportes/partidos', async (req, res) => {
  try {
    const data = await crearPartido(req.body);
    res.status(201).json(data);
  } catch { res.status(500).json({ error: 'Error creando partido' }); }
});

router.put('/deportes/partidos/:id', async (req, res) => {
  try {
    const data = await actualizarPartido(req.params.id, req.body);
    res.json(data);
  } catch { res.status(500).json({ error: 'Error actualizando partido' }); }
});

router.get('/stats', async (req, res) => {
  try {
    const [noticias, eventos, reportes, usuarios] = await Promise.all([
      supabaseAdmin.from('noticias').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('eventos').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('reportes').select('id', { count: 'exact', head: true }).eq('estado', 'pendiente'),
      supabaseAdmin.from('usuarios').select('id', { count: 'exact', head: true }),
    ]);
    res.json({
      noticias: noticias.count || 0,
      eventos: eventos.count || 0,
      reportes_pendientes: reportes.count || 0,
      usuarios: usuarios.count || 0,
    });
  } catch { res.status(500).json({ error: 'Error obteniendo estadísticas' }); }
});

module.exports = router;
