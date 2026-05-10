const express = require('express');
const { supabaseAdmin } = require('../../config/supabase');
const { adminMiddleware, superadminMiddleware, permisoMiddleware } = require('../middleware/auth');
const { notificarAccionAdmin } = require('../services/emailService');

const router = express.Router();
router.use(adminMiddleware);

router.get('/stats', async (req, res) => {
  try {
    const [noticias, eventos, reportes, usuarios] = await Promise.all([
      supabaseAdmin.from('noticias').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('eventos').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('reportes').select('id', { count: 'exact', head: true }).eq('estado', 'pendiente'),
      supabaseAdmin.from('usuarios').select('id', { count: 'exact', head: true }),
    ]);
    res.json({ noticias: noticias.count || 0, eventos: eventos.count || 0, reportes_pendientes: reportes.count || 0, usuarios: usuarios.count || 0 });
  } catch { res.status(500).json({ error: 'Error obteniendo stats' }); }
});

router.get('/chat-stats', async (req, res) => {
  try {
    const hoy = new Date(); hoy.setHours(0,0,0,0);
    const [totalMensajes, totalConversaciones, usuariosActivos, mensajesHoy, tiposMensajes] = await Promise.all([
      supabaseAdmin.from('mensajes').select('id', { count:'exact', head:true }).eq('rol','user'),
      supabaseAdmin.from('conversaciones').select('id', { count:'exact', head:true }),
      supabaseAdmin.from('conversaciones').select('usuario_id', { count:'exact', head:true }),
      supabaseAdmin.from('mensajes').select('id', { count:'exact', head:true }).eq('rol','user').gte('created_at', hoy.toISOString()),
      supabaseAdmin.from('mensajes').select('contenido').eq('rol','user').order('created_at',{ascending:false}).limit(200),
    ]);
    const temas = { clima:0, negocios:0, eventos:0, deportes:0, noticias:0, reportes:0, otro:0 };
    const regexTemas = { clima:/clima|temperatura|lluvia|calor/i, negocios:/restaurante|negocio|comer|cenar/i, eventos:/evento|concierto|fiesta/i, deportes:/deporte|partido|beisbol/i, noticias:/noticia|pasó|hoy|ayer/i, reportes:/reporte|accidente|tráfico/i };
    (tiposMensajes.data || []).forEach(function(m) {
      var encontrado = false;
      for (var tema in regexTemas) { if (regexTemas[tema].test(m.contenido)) { temas[tema]++; encontrado = true; break; } }
      if (!encontrado) temas.otro++;
    });
    const temas_frecuentes = Object.entries(temas).map(function(e) { return { tipo:e[0], count:e[1] }; }).filter(function(t) { return t.count > 0; }).sort(function(a,b) { return b.count - a.count; });
    res.json({ total_mensajes: totalMensajes.count||0, total_conversaciones: totalConversaciones.count||0, usuarios_activos: usuariosActivos.count||0, mensajes_hoy: mensajesHoy.count||0, temas_frecuentes });
  } catch { res.status(500).json({ error: 'Error stats chat' }); }
});

router.get('/reportes/pendientes', async (req, res) => {
  try {
    const result = await supabaseAdmin.from('reportes').select('*').eq('estado','pendiente').order('created_at',{ascending:false});
    if (result.error) throw result.error;
    res.json(result.data || []);
  } catch { res.status(500).json({ error: 'Error obteniendo reportes' }); }
});

router.put('/reportes/:id/estado', async (req, res) => {
  try {
    const result = await supabaseAdmin.from('reportes').update({ estado: req.body.estado, updated_at: new Date().toISOString() }).eq('id', req.params.id).select().single();
    if (result.error) throw result.error;
    res.json(result.data);
  } catch { res.status(500).json({ error: 'Error actualizando reporte' }); }
});

router.get('/noticias', async (req, res) => {
  try {
    const result = await supabaseAdmin.from('noticias').select('*').order('created_at',{ascending:false}).limit(50);
    if (result.error) throw result.error;
    res.json(result.data || []);
  } catch { res.status(500).json({ error: 'Error obteniendo noticias' }); }
});

router.post('/noticias', permisoMiddleware('noticias:crear'), async (req, res) => {
  try {
    const result = await supabaseAdmin.from('noticias').insert([{ ...req.body, autor_id: req.user.id }]).select().single();
    if (result.error) throw result.error;
    notificarAccionAdmin('Nueva noticia publicada', req.user.nombre || req.user.username, result.data.titulo, 'noticias').catch(function(){});
    res.status(201).json(result.data);
  } catch { res.status(500).json({ error: 'Error creando noticia' }); }
});

router.put('/noticias/:id', permisoMiddleware('noticias:editar'), async (req, res) => {
  try {
    const result = await supabaseAdmin.from('noticias').update({ ...req.body, updated_at: new Date().toISOString() }).eq('id', req.params.id).select().single();
    if (result.error) throw result.error;
    notificarAccionAdmin('Noticia editada', req.user.nombre || req.user.username, result.data.titulo, 'noticias').catch(function(){});
    res.json(result.data);
  } catch { res.status(500).json({ error: 'Error actualizando noticia' }); }
});

router.delete('/noticias/:id', superadminMiddleware, async (req, res) => {
  try {
    const result = await supabaseAdmin.from('noticias').delete().eq('id', req.params.id);
    if (result.error) throw result.error;
    notificarAccionAdmin('Noticia eliminada', req.user.nombre || req.user.username, 'ID: ' + req.params.id, 'noticias').catch(function(){});
    res.json({ ok: true });
  } catch { res.status(500).json({ error: 'Error eliminando noticia' }); }
});

router.post('/eventos', permisoMiddleware('eventos:crear'), async (req, res) => {
  try {
    const result = await supabaseAdmin.from('eventos').insert([req.body]).select().single();
    if (result.error) throw result.error;
    notificarAccionAdmin('Nuevo evento creado', req.user.nombre || req.user.username, result.data.nombre, 'eventos').catch(function(){});
    res.status(201).json(result.data);
  } catch { res.status(500).json({ error: 'Error creando evento' }); }
});

router.put('/eventos/:id', permisoMiddleware('eventos:editar'), async (req, res) => {
  try {
    const result = await supabaseAdmin.from('eventos').update({ ...req.body, updated_at: new Date().toISOString() }).eq('id', req.params.id).select().single();
    if (result.error) throw result.error;
    notificarAccionAdmin('Evento editado', req.user.nombre || req.user.username, result.data.nombre, 'eventos').catch(function(){});
    res.json(result.data);
  } catch { res.status(500).json({ error: 'Error actualizando evento' }); }
});

router.delete('/eventos/:id', superadminMiddleware, async (req, res) => {
  try {
    const result = await supabaseAdmin.from('eventos').delete().eq('id', req.params.id);
    if (result.error) throw result.error;
    notificarAccionAdmin('Evento eliminado', req.user.nombre || req.user.username, 'ID: ' + req.params.id, 'eventos').catch(function(){});
    res.json({ ok: true });
  } catch { res.status(500).json({ error: 'Error eliminando evento' }); }
});

router.post('/deportes/partidos', permisoMiddleware('deportes:crear'), async (req, res) => {
  try {
    const result = await supabaseAdmin.from('partidos').insert([req.body]).select().single();
    if (result.error) throw result.error;
    notificarAccionAdmin('Partido registrado', req.user.nombre || req.user.username, req.body.equipo_local + ' vs ' + req.body.equipo_visitante, 'deportes').catch(function(){});
    res.status(201).json(result.data);
  } catch { res.status(500).json({ error: 'Error creando partido' }); }
});

router.put('/deportes/partidos/:id', permisoMiddleware('deportes:editar'), async (req, res) => {
  try {
    const result = await supabaseAdmin.from('partidos').update({ ...req.body, updated_at: new Date().toISOString() }).eq('id', req.params.id).select().single();
    if (result.error) throw result.error;
    res.json(result.data);
  } catch { res.status(500).json({ error: 'Error actualizando partido' }); }
});

module.exports = router;
