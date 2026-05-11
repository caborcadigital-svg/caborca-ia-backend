const express = require('express');
const { supabase, supabaseAdmin } = require('../../config/supabase');
const { adminMiddleware } = require('../middleware/auth');
const { notificarAccionAdmin } = require('../services/emailService');
const { logger } = require('../utils/logger');
const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { titulo, descripcion, fuente, nombre_contacto, email_contacto, telefono_contacto } = req.body;
    if (!titulo || !descripcion) return res.status(400).json({ error: 'Titulo y descripcion requeridos' });
    const result = await supabaseAdmin.from('sugerencias_noticias').insert([{
      titulo, descripcion, fuente, nombre_contacto, email_contacto, telefono_contacto, estado: 'pendiente'
    }]).select().single();
    if (result.error) throw result.error;
    notificarAccionAdmin('Nueva sugerencia de noticia recibida', nombre_contacto || 'Anonimo', titulo, 'noticias').catch(function(err) { logger.error('Email error: ' + err.message); });
    res.status(201).json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/', adminMiddleware, async (req, res) => {
  try {
    const estado = req.query.estado || 'pendiente';
    const result = await supabaseAdmin.from('sugerencias_noticias').select('*').eq('estado', estado).order('created_at', { ascending: false });
    if (result.error) throw result.error;
    res.json(result.data || []);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', adminMiddleware, async (req, res) => {
  try {
    const result = await supabaseAdmin.from('sugerencias_noticias').update({ estado: req.body.estado, updated_at: new Date().toISOString() }).eq('id', req.params.id).select().single();
    if (result.error) throw result.error;
    res.json(result.data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
