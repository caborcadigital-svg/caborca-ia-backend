const express = require('express');
const bcrypt = require('bcryptjs');
const { supabaseAdmin } = require('../../config/supabase');
const { superadminMiddleware } = require('../middleware/auth');
const router = express.Router();

router.use(superadminMiddleware);

router.get('/', async (req, res) => {
  try {
    const result = await supabaseAdmin.from('usuarios').select('id,nombre,username,email,role,created_at,activo').order('created_at',{ascending:false});
    if (result.error) throw result.error;
    res.json(result.data || []);
  } catch { res.status(500).json({ error: 'Error obteniendo usuarios' }); }
});

router.post('/', async (req, res) => {
  try {
    const { nombre, username, email, password, role } = req.body;
    if (!nombre || !username || !email || !password) return res.status(400).json({ error: 'Todos los campos son requeridos' });
    const roles = ['admin','editor_noticias','editor_eventos','moderador'];
    if (!roles.includes(role)) return res.status(400).json({ error: 'Rol invalido' });
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    const result = await supabaseAdmin.from('usuarios').insert([{ nombre, username, email, password_hash, role, activo: true }]).select('id,nombre,username,email,role,created_at').single();
    if (result.error) throw result.error;
    res.status(201).json(result.data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { nombre, email, role, activo, password } = req.body;
    const updates = { nombre, email, role, activo, updated_at: new Date().toISOString() };
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updates.password_hash = await bcrypt.hash(password, salt);
    }
    const result = await supabaseAdmin.from('usuarios').update(updates).eq('id', req.params.id).select('id,nombre,username,email,role,activo').single();
    if (result.error) throw result.error;
    res.json(result.data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    if (req.params.id === req.user.id) return res.status(400).json({ error: 'No puedes eliminarte a ti mismo' });
    const result = await supabaseAdmin.from('usuarios').update({ activo: false }).eq('id', req.params.id);
    if (result.error) throw result.error;
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
