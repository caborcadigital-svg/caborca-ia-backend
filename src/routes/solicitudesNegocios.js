const express = require('express');
const { supabase, supabaseAdmin } = require('../../config/supabase');
const { adminMiddleware } = require('../middleware/auth');
const { notificarNuevaSolicitudNegocio } = require('../services/emailService');
const { logger } = require('../utils/logger');
const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const nombre = req.body.nombre;
    const categoria = req.body.categoria;
    const descripcion = req.body.descripcion;
    const telefono_contacto = req.body.telefono_contacto;
    if (!nombre) return res.status(400).json({ error: 'Nombre requerido' });
    const result = await supabaseAdmin.from('solicitudes_negocios').insert([{ nombre: nombre, categoria: categoria, descripcion: descripcion, telefono_contacto: telefono_contacto, estado: 'pendiente' }]).select().single();
    if (result.error) throw result.error;
    notificarNuevaSolicitudNegocio(result.data).catch(function(err) { logger.error('Email solicitud error: ' + err.message); });
    res.status(201).json(result.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', adminMiddleware, async (req, res) => {
  try {
    const result = await supabaseAdmin.from('solicitudes_negocios').select('*').order('created_at', { ascending: false });
    if (result.error) throw result.error;
    res.json(result.data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', adminMiddleware, async (req, res) => {
  try {
    const result = await supabaseAdmin.from('solicitudes_negocios').update(Object.assign({}, req.body, { updated_at: new Date().toISOString() })).eq('id', req.params.id).select().single();
    if (result.error) throw result.error;
    res.json(result.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
