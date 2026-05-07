const express = require('express');
const { getDeportes, getProximosPartidos, getLigas } = require('../services/deportesService');
const router = express.Router();

router.get('/partidos', async (req, res) => {
  try {
    const { deporte, liga, limit = 10 } = req.query;
    const data = await getDeportes({ deporte, liga, limit: parseInt(limit) });
    res.json(data);
  } catch { res.status(500).json({ error: 'Error obteniendo partidos' }); }
});

router.get('/proximos', async (req, res) => {
  try {
    const data = await getProximosPartidos();
    res.json(data);
  } catch { res.status(500).json({ error: 'Error obteniendo próximos partidos' }); }
});

router.get('/ligas', async (req, res) => {
  try {
    const data = await getLigas();
    res.json(data);
  } catch { res.status(500).json({ error: 'Error obteniendo ligas' }); }
});

module.exports = router;
