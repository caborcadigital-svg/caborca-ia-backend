const express = require('express');
const { supabase, supabaseAdmin } = require('../../config/supabase');
const { resolveIntent } = require('../services/intentEngine');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.post('/mensaje', async (req, res) => {
  try {
    const { mensaje, conversacion_id, usuario_id } = req.body;

    if (!mensaje?.trim()) return res.status(400).json({ error: 'Mensaje requerido' });
    if (mensaje.length > 500) return res.status(400).json({ error: 'Mensaje demasiado largo' });

    let historial = [];
    if (conversacion_id) {
      const { data: mensajes } = await supabase
        .from('mensajes')
        .select('rol, contenido')
        .eq('conversacion_id', conversacion_id)
        .order('created_at', { ascending: true })
        .limit(10);

      historial = (mensajes || []).map(m => ({ role: m.rol, content: m.contenido }));
    }

    const resultado = await resolveIntent(mensaje, historial);

    if (conversacion_id && usuario_id) {
      await supabaseAdmin.from('mensajes').insert([
        { conversacion_id, rol: 'user', contenido: mensaje },
        { conversacion_id, rol: 'assistant', contenido: resultado.respuesta },
      ]);
    }

    res.json({
      respuesta: resultado.respuesta,
      fuente: resultado.fuente,
      tipo: resultado.tipo,
      data: resultado.data,
    });
  } catch (err) {
    res.status(500).json({ error: 'Error procesando mensaje' });
  }
});

router.post('/conversacion', authMiddleware, async (req, res) => {
  try {
    const { titulo } = req.body;
    const { data, error } = await supabaseAdmin
      .from('conversaciones')
      .insert([{ usuario_id: req.user.id, titulo: titulo || 'Nueva conversación' }])
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch {
    res.status(500).json({ error: 'Error creando conversación' });
  }
});

router.get('/conversaciones', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('conversaciones')
      .select('id, titulo, created_at, updated_at')
      .eq('usuario_id', req.user.id)
      .order('updated_at', { ascending: false })
      .limit(20);
    if (error) throw error;
    res.json(data || []);
  } catch {
    res.status(500).json({ error: 'Error obteniendo conversaciones' });
  }
});

router.get('/conversacion/:id', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('mensajes')
      .select('id, rol, contenido, created_at')
      .eq('conversacion_id', req.params.id)
      .order('created_at', { ascending: true });
    if (error) throw error;
    res.json(data || []);
  } catch {
    res.status(500).json({ error: 'Error obteniendo mensajes' });
  }
});

router.delete('/conversacion/:id', authMiddleware, async (req, res) => {
  try {
    await supabaseAdmin.from('mensajes').delete().eq('conversacion_id', req.params.id);
    await supabaseAdmin.from('conversaciones').delete().eq('id', req.params.id).eq('usuario_id', req.user.id);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Error eliminando conversación' });
  }
});

module.exports = router;
