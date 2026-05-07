const express = require('express');
const { getNoticias, getNoticiaById } = require('../services/noticiasService');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { limit = 10, categoria, page = 1 } = req.query;
    const data = await getNoticias({ limit: parseInt(limit), categoria, page: parseInt(page) });
    res.json(data);
  } catch { res.status(500).json({ error: 'Error obteniendo noticias' }); }
});

router.get('/:id', async (req, res) => {
  try {
    const noticia = await getNoticiaById(req.params.id);
    if (!noticia) return res.status(404).json({ error: 'Noticia no encontrada' });
    res.json(noticia);
  } catch { res.status(500).json({ error: 'Error obteniendo noticia' }); }
});

module.exports = router;
