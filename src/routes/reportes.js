const express = require('express');
const { supabase } = require('../../config/supabase');
const { notificarNuevoReporte } = require('../services/emailService');
const { logger } = require('../utils/logger');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const tipo = req.query.tipo;
    const estado = req.query.estado || 'aprobado';
    const limit = parseInt(req.query.limit || '20');
    let query = supabase.from('reportes').select('*').eq('estado', estado).order('created_at', { ascending: false }).limit(limit);
    if (tipo) query = query.eq('tipo', tipo);
    const result = await query;
    if (result.error) throw result.error;
    res.json(result.data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const tipo = req.body.tipo;
    const descripcion = req.body.descripcion;
    const ubicacion = req.body.ubicacion;
    const lat = req.body.lat;
    const lng = req.body.lng;
    if (!descripcion || !ubicacion) return res.status(400).json({ error: 'Descripcion y ubicacion requeridas' });
    if (!tipo) return res.status(400).json({ error: 'Tipo requerido' });
    const result = await supabase.from('reportes').insert([{ tipo: tipo, descripcion: descripcion, ubicacion: ubicacion, lat: lat, lng: lng, estado: 'pendiente' }]).select().single();
    if (result.error) throw result.error;
    notificarNuevoReporte(result.data).catch(function(err) { logger.error('Email async error: ' + err.message); });
    res.status(201).json(result.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
