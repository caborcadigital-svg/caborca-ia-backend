const express = require('express');
const { supabase, supabaseAdmin } = require('../../config/supabase');
const { adminMiddleware } = require('../middleware/auth');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const result = await supabase.from('config_sitio').select('clave,valor');
    if (result.error) throw result.error;
    const config = {};
    (result.data || []).forEach(function(row) { config[row.clave] = row.valor; });
    res.json(config);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', adminMiddleware, async (req, res) => {
  try {
    const entries = Object.entries(req.body);
    for (const entry of entries) {
      const clave = entry[0];
      const valor = entry[1];
      await supabaseAdmin.from('config_sitio').upsert({ clave: clave, valor: valor }, { onConflict: 'clave' });
    }
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
