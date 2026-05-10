const express = require('express');
const { supabase } = require('../../config/supabase');
const { notificarNuevoReporte } = require('../services/emailService');
const { logger } = require('../utils/logger');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { tipo, estado = 'aprobado', limit = 20 } = req.query;
    let query = supabase.from('reportes').select('*').eq('estado', estado).order('created_at', { ascending: false }).limit(parseInt(limit));
    if (tipo) query = query.eq('tipo', tipo);
    const { data, error } = await query;
    if (error) throw error;
    res.json(data || []);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { tipo, descripcion, ubicacion, lat, lng } = req.body;
    if (!descripcion || !ubicacion) return res.status(400).json({ error: 'Descripcion y ubicacion requeridas' });
    if (!tipo) return res.status(400).json({ error: 'Tipo requerido' });
    const { data, error } = await supabase.from('reportes').insert([{ tipo, descripcion, ubicacion, lat, lng, estado: 'pendiente' }]).select().single();
    if (error) throw error;
    notificarNuevoReporte(data).catch(err => logger.error('Email error:', err.message));
    res.status(201).json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;