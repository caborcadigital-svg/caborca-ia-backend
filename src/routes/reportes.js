const express = require('express');
const { getReportes, crearReporte } = require('../services/reportesService');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { tipo, limit = 20, page = 1 } = req.query;
    const data = await getReportes({ estado: 'aprobado', tipo, limit: parseInt(limit), page: parseInt(page) });
    res.json(data);
  } catch { res.status(500).json({ error: 'Error obteniendo reportes' }); }
});

router.post('/', async (req, res) => {
  try {
    const { tipo, descripcion, ubicacion, usuario_id } = req.body;
    if (!tipo || !descripcion || !ubicacion) {
      return res.status(400).json({ error: 'Tipo, descripción y ubicación son requeridos' });
    }
    const reporte = await crearReporte({ tipo, descripcion, ubicacion, usuario_id });
    res.status(201).json(reporte);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Error creando reporte' });
  }
});

module.exports = router;
