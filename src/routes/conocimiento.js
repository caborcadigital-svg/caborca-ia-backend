const express = require('express');
const { supabase, supabaseAdmin } = require('../../config/supabase');
const { adminMiddleware } = require('../middleware/auth');
const router = express.Router();

router.get('/buscar', async (req, res) => {
  try {
    const q = req.query.q || '';
    const limit = parseInt(req.query.limit || '5');
    if (!q.trim()) return res.json([]);

    const palabras = q.toLowerCase().split(/\s+/).filter(p => p.length > 2);

    const result = await supabase
      .from('conocimiento_caborca')
      .select('id,categoria,titulo,contenido,tags,prioridad')
      .eq('activo', true)
      .order('prioridad', { ascending: false })
      .limit(50);

    if (result.error) throw result.error;

    const scored = (result.data || []).map(item => {
      let score = 0;
      const texto = (item.titulo + ' ' + item.contenido + ' ' + (item.tags || []).join(' ')).toLowerCase();
      palabras.forEach(p => {
        if (texto.includes(p)) score += item.prioridad || 1;
        if ((item.tags || []).some((t) => t.includes(p))) score += 3;
        if (item.titulo.toLowerCase().includes(p)) score += 5;
      });
      return { ...item, score };
    }).filter(i => i.score > 0).sort((a, b) => b.score - a.score).slice(0, limit);

    res.json(scored);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/', adminMiddleware, async (req, res) => {
  try {
    const categoria = req.query.categoria;
    let query = supabaseAdmin.from('conocimiento_caborca').select('*').order('prioridad', { ascending: false }).order('categoria', { ascending: true });
    if (categoria) query = query.eq('categoria', categoria);
    const result = await query;
    if (result.error) throw result.error;
    res.json(result.data || []);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', adminMiddleware, async (req, res) => {
  try {
    const { categoria, titulo, contenido, tags, prioridad } = req.body;
    if (!categoria || !titulo || !contenido) return res.status(400).json({ error: 'Categoria, titulo y contenido requeridos' });
    const tagsArray = Array.isArray(tags) ? tags : (tags || '').split(',').map(t => t.trim()).filter(Boolean);
    const result = await supabaseAdmin.from('conocimiento_caborca').insert([{ categoria, titulo, contenido, tags: tagsArray, prioridad: prioridad || 0, activo: true }]).select().single();
    if (result.error) throw result.error;
    res.status(201).json(result.data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', adminMiddleware, async (req, res) => {
  try {
    const { tags, ...rest } = req.body;
    const tagsArray = Array.isArray(tags) ? tags : (tags || '').split(',').map(t => t.trim()).filter(Boolean);
    const result = await supabaseAdmin.from('conocimiento_caborca').update({ ...rest, tags: tagsArray, updated_at: new Date().toISOString() }).eq('id', req.params.id).select().single();
    if (result.error) throw result.error;
    res.json(result.data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', adminMiddleware, async (req, res) => {
  try {
    const result = await supabaseAdmin.from('conocimiento_caborca').delete().eq('id', req.params.id);
    if (result.error) throw result.error;
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
