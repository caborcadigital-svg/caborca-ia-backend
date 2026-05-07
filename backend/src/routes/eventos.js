const express = require('express');
const { getEventos } = require('../services/eventosService');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { proximos, limit = 10, page = 1 } = req.query;
    const data = await getEventos({ proximos: proximos === 'true', limit: parseInt(limit), page: parseInt(page) });
    res.json(data);
  } catch { res.status(500).json({ error: 'Error obteniendo eventos' }); }
});

module.exports = router;
