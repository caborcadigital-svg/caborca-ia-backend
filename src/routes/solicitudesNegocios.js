const express = require('express');
const { supabase, supabaseAdmin } = require('../../config/supabase');
const { adminMiddleware } = require('../middleware/auth');
const { notificarNuevaSolicitudNegocio } = require('../services/emailService');
const { logger } = require('../utils/logger');
const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { nombre, categoria, descripcion, telefono_contacto } = req.body;
    if (!nombre) return res.status(400).json({ error:'Nombre requerido' });
    const { data, error } = await supabaseAdmin.from('solicitudes_negocios').insert([{ nombre, categoria, descripcion, telefono_contacto, estado:'pendiente' }]).select().single();
    if (error) throw error;
    notificarNuevaSolicitudNegocio(data).catch(err => logger.error('Email error:', err.message));
    res.status(201).json(data);
  } catch { res.status(500).json({ error:'Error enviando solicitud' }); }
});

router.get('/', adminMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('solicitudes_negocios').select('*').order('created_at', { ascending:false });
    if (error) throw error;
    res.json(data || []);
  } catch { res.status(500).json({ error:'Error obteniendo solicitudes' }); }
});

router.put('/:id', adminMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('solicitudes_negocios').update({ ...req.body, updated_at: new Date().toISOString() }).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch { res.status(500).json({ error:'Error actualizando solicitud' }); }
});

module.exports = router;
