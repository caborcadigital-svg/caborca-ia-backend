// clima.js
const express = require('express');
const { getClima, getPronostico } = require('../services/climaService');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const clima = await getClima();
    if (!clima) return res.status(503).json({ error: 'Clima no disponible' });
    res.json(clima);
  } catch { res.status(500).json({ error: 'Error obteniendo clima' }); }
});

router.get('/pronostico', async (req, res) => {
  try {
    const pronostico = await getPronostico();
    res.json(pronostico);
  } catch { res.status(500).json({ error: 'Error obteniendo pronóstico' }); }
});

module.exports = router;
