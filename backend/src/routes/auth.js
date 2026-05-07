const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { supabaseAdmin } = require('../../config/supabase');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.post('/registro', async (req, res) => {
  try {
    const { nombre, username, email, password, codigo_admin } = req.body;

    if (!nombre || !username || !email || !password) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
    }

    const { data: existe } = await supabaseAdmin
      .from('usuarios')
      .select('id')
      .or(`email.eq.${email},username.eq.${username}`)
      .maybeSingle();

    if (existe) return res.status(409).json({ error: 'El usuario o email ya está registrado' });

    const role = codigo_admin === process.env.ADMIN_REGISTRATION_CODE ? 'admin' : 'usuario';
    const hash = await bcrypt.hash(password, 12);

    const { data: usuario, error } = await supabaseAdmin
      .from('usuarios')
      .insert([{ nombre, username: username.toLowerCase(), email: email.toLowerCase(), password_hash: hash, role }])
      .select('id, nombre, username, email, role, created_at')
      .single();

    if (error) throw error;

    const token = jwt.sign({ id: usuario.id, role: usuario.role }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

    res.status(201).json({ usuario, token });
  } catch (err) {
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { identificador, password } = req.body;

    if (!identificador || !password) {
      return res.status(400).json({ error: 'Usuario/email y contraseña requeridos' });
    }

    const id = identificador.toLowerCase();

    const { data: usuario } = await supabaseAdmin
      .from('usuarios')
      .select('id, nombre, username, email, password_hash, role, activo')
      .or(`email.eq.${id},username.eq.${id}`)
      .maybeSingle();

    if (!usuario) return res.status(401).json({ error: 'Credenciales incorrectas' });
    if (!usuario.activo) return res.status(403).json({ error: 'Cuenta suspendida' });

    const valido = await bcrypt.compare(password, usuario.password_hash);
    if (!valido) return res.status(401).json({ error: 'Credenciales incorrectas' });

    const token = jwt.sign({ id: usuario.id, role: usuario.role }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

    const { password_hash, ...userData } = usuario;
    res.json({ usuario: userData, token });
  } catch (err) {
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const { data: usuario } = await supabaseAdmin
      .from('usuarios')
      .select('id, nombre, username, email, role, created_at')
      .eq('id', req.user.id)
      .single();
    res.json({ usuario });
  } catch {
    res.status(500).json({ error: 'Error al obtener usuario' });
  }
});

module.exports = router;
