const express = require('express');
const { supabaseAdmin } = require('../../config/supabase');
const { adminMiddleware } = require('../middleware/auth');

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
    res.json({
      noticias: noticias.count || 0,
      eventos: eventos.count || 0,
      reportes_pendientes: reportes.count || 0,
      usuarios: usuarios.count || 0,
    });
  } catch { res.status(500).json({ error: 'Error obteniendo stats' }); }
});

router.get('/chat-stats', async (req, res) => {
  try {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const [totalMensajes, totalConversaciones, usuariosActivos, mensajesHoy, tiposMensajes] = await Promise.all([
      supabaseAdmin.from('mensajes').select('id', { count: 'exact', head: true }).eq('rol', 'user'),
      supabaseAdmin.from('conversaciones').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('conversaciones').select('usuario_id', { count: 'exact', head: true }),
      supabaseAdmin.from('mensajes').select('id', { count: 'exact', head: true }).eq('rol', 'user').gte('created_at', hoy.toISOString()),
      supabaseAdmin.from('mensajes').select('contenido').eq('rol', 'user').order('created_at', { ascending: false }).limit(200),
    ]);

    const temas: Record<string, number> = { clima: 0, negocios: 0, eventos: 0, deportes: 0, noticias: 0, reportes: 0, otro: 0 };
    const regexTemas: Record<string, RegExp> = {
      clima: /clima|temperatura|lluvia|calor|frío/i,
      negocios: /restaurante|negocio|comer|cenar|tienda|farmacia/i,
      eventos: /evento|concierto|fiesta|festival/i,
      deportes: /deporte|partido|beisbol|fútbol|liga/i,
      noticias: /noticia|pasó|ocurrió|hoy|ayer/i,
      reportes: /reporte|accidente|tráfico|apagón/i,
    };

    (tiposMensajes.data || []).forEach((m: any) => {
      let encontrado = false;
      for (const [tema, regex] of Object.entries(regexTemas)) {
        if (regex.test(m.contenido)) { temas[tema]++; encontrado = true; break; }
      }
      if (!encontrado) temas.otro++;
    });

    const temas_frecuentes = Object.entries(temas)
      .map(([tipo, count]) => ({ tipo, count }))
      .filter(t => t.count > 0)
      .sort((a, b) => b.count - a.count);

    res.json({
      total_mensajes: totalMensajes.count || 0,
      total_conversaciones: totalConversaciones.count || 0,
      usuarios_activos: usuariosActivos.count || 0,
      mensajes_hoy: mensajesHoy.count || 0,
      temas_frecuentes,
    });
  } catch { res.status(500).json({ error: 'Error obteniendo stats chat' }); }
});

router.get('/reportes/pendientes', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('reportes').select('*').eq('estado', 'pendiente')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch { res.status(500).json({ error: 'Error obteniendo reportes' }); }
});

router.put('/reportes/:id/estado', async (req, res) => {
  try {
    const { estado } = req.body;
    const { data, error } = await supabaseAdmin
      .from('reportes').update({ estado, updated_at: new Date().toISOString() })
      .eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch { res.status(500).json({ error: 'Error actualizando reporte' }); }
});

router.get('/noticias', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('noticias').select('*').order('created_at', { ascending: false }).limit(50);
    if (error) throw error;
    res.json(data || []);
  } catch { res.status(500).json({ error: 'Error obteniendo noticias' }); }
});

router.post('/noticias', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('noticias').insert([{ ...req.body, autor_id: req.user.id }]).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch { res.status(500).json({ error: 'Error creando noticia' }); }
});

router.put('/noticias/:id', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('noticias').update({ ...req.body, updated_at: new Date().toISOString() }).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch { res.status(500).json({ error: 'Error actualizando noticia' }); }
});

router.delete('/noticias/:id', async (req, res) => {
  try {
    const { error } = await supabaseAdmin.from('noticias').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch { res.status(500).json({ error: 'Error eliminando noticia' }); }
});

router.post('/eventos', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('eventos').insert([req.body]).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch { res.status(500).json({ error: 'Error creando evento' }); }
});

router.put('/eventos/:id', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('eventos').update({ ...req.body, updated_at: new Date().toISOString() }).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch { res.status(500).json({ error: 'Error actualizando evento' }); }
});

router.delete('/eventos/:id', async (req, res) => {
  try {
    const { error } = await supabaseAdmin.from('eventos').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch { res.status(500).json({ error: 'Error eliminando evento' }); }
});

router.post('/deportes/partidos', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('partidos').insert([req.body]).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch { res.status(500).json({ error: 'Error creando partido' }); }
});

router.put('/deportes/partidos/:id', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('partidos').update({ ...req.body, updated_at: new Date().toISOString() }).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch { res.status(500).json({ error: 'Error actualizando partido' }); }
});

module.exports = router;
