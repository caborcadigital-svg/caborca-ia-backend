const express = require('express');
const { supabase, supabaseAdmin } = require('../../config/supabase');
const { adminMiddleware } = require('../middleware/auth');
const { notificarNuevoResultado } = require('../services/emailService');
const { logger } = require('../utils/logger');
const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const deporte = req.body.deporte;
    const liga = req.body.liga;
    const equipo_local = req.body.equipo_local;
    const equipo_visitante = req.body.equipo_visitante;
    const marcador_local = req.body.marcador_local;
    const marcador_visitante = req.body.marcador_visitante;
    const lugar = req.body.lugar;
    const fecha = req.body.fecha;
    const comentario = req.body.comentario;
    const enviado_por = req.body.enviado_por;
    if (!equipo_local || !equipo_visitante) return res.status(400).json({ error: 'Equipos requeridos' });
    if (marcador_local === undefined || marcador_visitante === undefined) return res.status(400).json({ error: 'Marcadores requeridos' });
    const result = await supabaseAdmin.from('resultados_deportivos_pendientes').insert([{
      deporte: deporte || 'beisbol',
      liga: liga,
      equipo_local: equipo_local,
      equipo_visitante: equipo_visitante,
      marcador_local: parseInt(marcador_local),
      marcador_visitante: parseInt(marcador_visitante),
      lugar: lugar,
      fecha: fecha,
      comentario: comentario,
      enviado_por: enviado_por,
      estado: 'pendiente'
    }]).select().single();
    if (result.error) throw result.error;
    notificarNuevoResultado(result.data).catch(function(err) { logger.error('Email resultado error: ' + err.message); });
    res.status(201).json(result.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', adminMiddleware, async (req, res) => {
  try {
    const estado = req.query.estado || 'pendiente';
    const result = await supabaseAdmin.from('resultados_deportivos_pendientes').select('*').eq('estado', estado).order('created_at', { ascending: false });
    if (result.error) throw result.error;
    res.json(result.data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/aprobar', adminMiddleware, async (req, res) => {
  try {
    const getPendiente = await supabaseAdmin.from('resultados_deportivos_pendientes').select('*').eq('id', req.params.id).single();
    if (getPendiente.error) throw getPendiente.error;
    const r = getPendiente.data;
    const insertPartido = await supabaseAdmin.from('partidos').insert([{
      deporte: r.deporte,
      liga: r.liga,
      equipo_local: r.equipo_local,
      equipo_visitante: r.equipo_visitante,
      marcador_local: r.marcador_local,
      marcador_visitante: r.marcador_visitante,
      lugar: r.lugar,
      fecha: r.fecha,
      estado: 'finalizado'
    }]).select().single();
    if (insertPartido.error) throw insertPartido.error;
    await supabaseAdmin.from('resultados_deportivos_pendientes').update({ estado: 'aprobado' }).eq('id', req.params.id);
    res.json({ ok: true, partido: insertPartido.data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/rechazar', adminMiddleware, async (req, res) => {
  try {
    const result = await supabaseAdmin.from('resultados_deportivos_pendientes').update({ estado: 'rechazado' }).eq('id', req.params.id).select().single();
    if (result.error) throw result.error;
    res.json(result.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
