const nodemailer = require('nodemailer');
const { logger } = require('../utils/logger');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function notificarNuevoReporte(reporte) {
  try {
    const info = await transporter.sendMail({
      from: '"Caborca IA" <' + process.env.SMTP_USER + '>',
      to: process.env.ADMIN_EMAIL,
      subject: 'Nuevo reporte en Caborca IA: ' + reporte.tipo,
      html: '<div style="font-family:sans-serif;max-width:500px;margin:0 auto;"><div style="background:linear-gradient(135deg,#1E3A5F,#E05C3A);padding:20px;border-radius:12px 12px 0 0;"><h2 style="color:white;margin:0;">Nuevo Reporte Ciudadano</h2><p style="color:rgba(255,255,255,0.7);margin:5px 0 0;">Caborca IA</p></div><div style="background:#f5f5f5;padding:20px;border-radius:0 0 12px 12px;"><p><strong>Tipo:</strong> ' + reporte.tipo + '</p><p><strong>Descripcion:</strong> ' + reporte.descripcion + '</p><p><strong>Ubicacion:</strong> ' + reporte.ubicacion + '</p><p><strong>Fecha:</strong> ' + new Date().toLocaleString("es-MX") + '</p><a href="https://caborca.app/admin/reportes" style="display:inline-block;margin-top:15px;padding:10px 20px;background:linear-gradient(135deg,#E05C3A,#E8823A);color:white;text-decoration:none;border-radius:8px;font-weight:bold;">Ver en panel admin</a></div></div>',
    });
    logger.info('Email reporte enviado: ' + info.messageId);
  } catch (err) {
    logger.error('Email reporte error code: ' + err.code);
    logger.error('Email reporte error msg: ' + err.message);
    logger.error('Email reporte error resp: ' + err.response);
  }
}

async function notificarNuevaSolicitudNegocio(solicitud) {
  try {
    const info = await transporter.sendMail({
      from: '"Caborca IA" <' + process.env.SMTP_USER + '>',
      to: process.env.ADMIN_EMAIL,
      subject: 'Nueva solicitud de negocio: ' + solicitud.nombre,
      html: '<div style="font-family:sans-serif;max-width:500px;margin:0 auto;"><div style="background:linear-gradient(135deg,#1E3A5F,#2D5F8A);padding:20px;border-radius:12px 12px 0 0;"><h2 style="color:white;margin:0;">Nueva Solicitud de Negocio</h2></div><div style="background:#f5f5f5;padding:20px;border-radius:0 0 12px 12px;"><p><strong>Negocio:</strong> ' + solicitud.nombre + '</p><p><strong>Categoria:</strong> ' + solicitud.categoria + '</p><a href="https://caborca.app/admin/solicitudes" style="display:inline-block;margin-top:15px;padding:10px 20px;background:linear-gradient(135deg,#E05C3A,#E8823A);color:white;text-decoration:none;border-radius:8px;">Ver solicitudes</a></div></div>',
    });
    logger.info('Email solicitud enviado: ' + info.messageId);
  } catch (err) {
    logger.error('Email solicitud error code: ' + err.code);
    logger.error('Email solicitud error msg: ' + err.message);
  }
}

module.exports = { notificarNuevoReporte, notificarNuevaSolicitudNegocio };
