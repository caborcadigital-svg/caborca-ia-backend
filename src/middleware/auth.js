const jwt = require('jsonwebtoken');
const { supabase } = require('../../config/supabase');

const JWT_SECRET = process.env.JWT_SECRET || 'caborca_secret_2024';

const PERMISOS = {
  superadmin: ['*'],
  admin: ['noticias:crear','noticias:editar','eventos:crear','eventos:editar','deportes:crear','deportes:editar','negocios:crear','negocios:editar','reportes:ver','reportes:moderar','resultados:moderar','solicitudes:ver','sugerencias:ver','sugerencias:editar','publicidad:ver'],
  editor_noticias: ['noticias:crear','noticias:editar'],
  editor_eventos: ['eventos:crear','eventos:editar'],
  moderador: ['reportes:ver','reportes:moderar','resultados:moderar'],
};

function tienePermiso(rol, permiso) {
  const perms = PERMISOS[rol] || [];
  return perms.includes('*') || perms.includes(permiso);
}

async function authMiddleware(req, res, next) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Token requerido' });
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Token invalido' });
  }
}

async function adminMiddleware(req, res, next) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Token requerido' });
    const decoded = jwt.verify(token, JWT_SECRET);
    const rol = decoded.role || decoded.rol;
    if (!['superadmin','admin','editor_noticias','editor_eventos','moderador'].includes(rol)) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    req.user = decoded;
    req.rol = rol;
    next();
  } catch {
    return res.status(401).json({ error: 'Token invalido' });
  }
}

function superadminMiddleware(req, res, next) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Token requerido' });
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'superadmin') return res.status(403).json({ error: 'Solo el superadmin puede hacer esto' });
    req.user = decoded;
    req.rol = 'superadmin';
    next();
  } catch {
    return res.status(401).json({ error: 'Token invalido' });
  }
}

function permisoMiddleware(permiso) {
  return function(req, res, next) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) return res.status(401).json({ error: 'Token requerido' });
      const decoded = jwt.verify(token, JWT_SECRET);
      const rol = decoded.role || decoded.rol;
      if (!tienePermiso(rol, permiso)) {
        return res.status(403).json({ error: 'No tienes permiso para esta accion' });
      }
      req.user = decoded;
      req.rol = rol;
      next();
    } catch {
      return res.status(401).json({ error: 'Token invalido' });
    }
  };
}

module.exports = { authMiddleware, adminMiddleware, superadminMiddleware, permisoMiddleware, tienePermiso, PERMISOS };
