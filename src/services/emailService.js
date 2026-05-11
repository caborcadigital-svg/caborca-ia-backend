const { logger } = require('../utils/logger');

async function enviarEmail(para, asunto, html) {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'Caborca IA <onboarding@resend.dev>', to: [para], subject: asunto, html: html }),
    });
    const data = await res.json();
    if (!res.ok) { logger.error('Resend error: ' + JSON.stringify(data)); return false; }
    logger.info('Email enviado: ' + data.id);
    return true;
  } catch (err) { logger.error('Email error: ' + err.message); return false; }
}

async function notificarNuevoReporte(reporte) {
  const html = '<div style="font-family:sans-serif;max-width:500px;"><div style="background:linear-gradient(135deg,#1E3A5F,#E05C3A);padding:20px;border-radius:12px 12px 0 0;"><h2 style="color:white;margin:0;">Nuevo Reporte Ciudadano</h2></div><div style="background:#f5f5f5;padding:20px;border-radius:0 0 12px 12px;"><p><strong>Tipo:</strong> ' + reporte.tipo + '</p><p><strong>Descripcion:</strong> ' + reporte.descripcion + '</p><p><strong>Ubicacion:</strong> ' + reporte.ubicacion + '</p><a href="https://caborca.app/admin/reportes" style="display:inline-block;margin-top:15px;padding:10px 20px;background:#E05C3A;color:white;text-decoration:none;border-radius:8px;">Ver en admin</a></div></div>';
  await enviarEmail(process.env.ADMIN_EMAIL, 'Nuevo reporte: ' + reporte.tipo, html);
}

async function notificarNuevaSolicitudNegocio(solicitud) {
  const html = '<div style="font-family:sans-serif;max-width:500px;"><div style="background:linear-gradient(135deg,#1E3A5F,#2D5F8A);padding:20px;border-radius:12px 12px 0 0;"><h2 style="color:white;margin:0;">Nueva Solicitud de Negocio</h2></div><div style="background:#f5f5f5;padding:20px;border-radius:0 0 12px 12px;"><p><strong>Negocio:</strong> ' + solicitud.nombre + '</p><p><strong>Categoria:</strong> ' + solicitud.categoria + '</p><a href="https://caborca.app/admin/solicitudes" style="display:inline-block;margin-top:15px;padding:10px 20px;background:#E05C3A;color:white;text-decoration:none;border-radius:8px;">Ver solicitudes</a></div></div>';
  await enviarEmail(process.env.ADMIN_EMAIL, 'Nueva solicitud: ' + solicitud.nombre, html);
}

async function notificarNuevoResultado(resultado) {
  const html = '<div style="font-family:sans-serif;max-width:500px;"><div style="background:linear-gradient(135deg,#1E3A5F,#E8823A);padding:20px;border-radius:12px 12px 0 0;"><h2 style="color:white;margin:0;">Resultado Deportivo Enviado</h2></div><div style="background:#f5f5f5;padding:20px;border-radius:0 0 12px 12px;"><p><strong>Partido:</strong> ' + resultado.equipo_local + ' ' + resultado.marcador_local + ' - ' + resultado.marcador_visitante + ' ' + resultado.equipo_visitante + '</p><a href="https://caborca.app/admin/resultados" style="display:inline-block;margin-top:15px;padding:10px 20px;background:#E05C3A;color:white;text-decoration:none;border-radius:8px;">Revisar</a></div></div>';
  await enviarEmail(process.env.ADMIN_EMAIL, 'Nuevo resultado: ' + resultado.equipo_local + ' vs ' + resultado.equipo_visitante, html);
}

async function notificarAccionAdmin(accion, usuario, detalle, seccion) {
  const iconos = { noticias:'📰', eventos:'📅', deportes:'🏆', negocios:'🏪', reportes:'🚨' };
  const icono = iconos[seccion] || '⚙️';
  const html = '<div style="font-family:sans-serif;max-width:500px;"><div style="background:linear-gradient(135deg,#1E3A5F,#6B3FA0);padding:20px;border-radius:12px 12px 0 0;"><h2 style="color:white;margin:0;">' + icono + ' Actividad en el Admin</h2></div><div style="background:#f5f5f5;padding:20px;border-radius:0 0 12px 12px;"><p><strong>Accion:</strong> ' + accion + '</p><p><strong>Usuario:</strong> ' + usuario + '</p><p><strong>Detalle:</strong> ' + detalle + '</p><p><strong>Fecha:</strong> ' + new Date().toLocaleString('es-MX') + '</p><a href="https://caborca.app/admin" style="display:inline-block;margin-top:15px;padding:10px 20px;background:#E05C3A;color:white;text-decoration:none;border-radius:8px;">Ver admin</a></div></div>';
  await enviarEmail(process.env.ADMIN_EMAIL, icono + ' ' + accion + ' — Caborca IA', html);
}

module.exports = { notificarNuevoReporte, notificarNuevaSolicitudNegocio, notificarNuevoResultado, notificarAccionAdmin };
