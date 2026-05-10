const { logger } = require('../utils/logger');

async function enviarEmail(para, asunto, html) {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + process.env.RESEND_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Caborca IA <onboarding@resend.dev>',
        to: [para],
        subject: asunto,
        html: html,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      logger.error('Resend error: ' + JSON.stringify(data));
      return false;
    }
    logger.info('Email enviado: ' + data.id);
    return true;
  } catch (err) {
    logger.error('Email fetch error: ' + err.message);
    return false;
  }
}

async function notificarNuevoReporte(reporte) {
  const html = '<div style="font-family:sans-serif;max-width:500px;margin:0 auto;">'
    + '<div style="background:linear-gradient(135deg,#1E3A5F,#E05C3A);padding:20px;border-radius:12px 12px 0 0;">'
    + '<h2 style="color:white;margin:0;">Nuevo Reporte Ciudadano</h2>'
    + '<p style="color:rgba(255,255,255,0.7);margin:5px 0 0;">Caborca IA</p>'
    + '</div>'
    + '<div style="background:#f5f5f5;padding:20px;border-radius:0 0 12px 12px;">'
    + '<p><strong>Tipo:</strong> ' + reporte.tipo + '</p>'
    + '<p><strong>Descripcion:</strong> ' + reporte.descripcion + '</p>'
    + '<p><strong>Ubicacion:</strong> ' + reporte.ubicacion + '</p>'
    + '<p><strong>Fecha:</strong> ' + new Date().toLocaleString('es-MX') + '</p>'
    + '<a href="https://caborca.app/admin/reportes" style="display:inline-block;margin-top:15px;padding:10px 20px;background:linear-gradient(135deg,#E05C3A,#E8823A);color:white;text-decoration:none;border-radius:8px;font-weight:bold;">Ver en panel admin</a>'
    + '</div></div>';
  await enviarEmail(process.env.ADMIN_EMAIL, 'Nuevo reporte en Caborca IA: ' + reporte.tipo, html);
}

async function notificarNuevaSolicitudNegocio(solicitud) {
  const html = '<div style="font-family:sans-serif;max-width:500px;margin:0 auto;">'
    + '<div style="background:linear-gradient(135deg,#1E3A5F,#2D5F8A);padding:20px;border-radius:12px 12px 0 0;">'
    + '<h2 style="color:white;margin:0;">Nueva Solicitud de Negocio</h2>'
    + '<p style="color:rgba(255,255,255,0.7);margin:5px 0 0;">Caborca IA</p>'
    + '</div>'
    + '<div style="background:#f5f5f5;padding:20px;border-radius:0 0 12px 12px;">'
    + '<p><strong>Negocio:</strong> ' + solicitud.nombre + '</p>'
    + '<p><strong>Categoria:</strong> ' + solicitud.categoria + '</p>'
    + (solicitud.descripcion ? '<p><strong>Info:</strong> ' + solicitud.descripcion + '</p>' : '')
    + (solicitud.telefono_contacto ? '<p><strong>Contacto:</strong> ' + solicitud.telefono_contacto + '</p>' : '')
    + '<a href="https://caborca.app/admin/solicitudes" style="display:inline-block;margin-top:15px;padding:10px 20px;background:linear-gradient(135deg,#E05C3A,#E8823A);color:white;text-decoration:none;border-radius:8px;font-weight:bold;">Ver solicitudes</a>'
    + '</div></div>';
  await enviarEmail(process.env.ADMIN_EMAIL, 'Nueva solicitud de negocio: ' + solicitud.nombre, html);
}

module.exports = { notificarNuevoReporte, notificarNuevaSolicitudNegocio };
