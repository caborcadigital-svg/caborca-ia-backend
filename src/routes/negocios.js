const express = require('express');
const { getNegocios, buscarNegocios } = require('../services/negociosService');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { categoria, limit = 20, page = 1, q } = req.query;
    const data = q ? await buscarNegocios(q, categoria) : await getNegocios({ categoria, limit: parseInt(limit), page: parseInt(page) });
    res.json(data);
  } catch { res.status(500).json({ error: 'Error obteniendo negocios' }); }
});

module.exports = router;
