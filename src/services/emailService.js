const nodemailer = require('nodemailer');
const { logger } = require('../utils/logger');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: true,
  auth: {
    user: process.env.SMTP_USER || 'noreply.ysks@gmail.com',
    pass: process.env.SMTP_PASS || '',
  },
});

async function notificarNuevoReporte(reporte) {
  try {
    await transporter.sendMail({
      from: `"Caborca IA" <${process.env.SMTP_USER}>`,
      to: process.env.ADMIN_EMAIL,
      subject: `Nuevo reporte en Caborca IA: ${reporte.tipo}`,
      html: `
        <div style="font-family:sans-serif;max-width:500px;margin:0 auto;">
          <div style="background:linear-gradient(135deg,#1E3A5F,#E05C3A);padding:20px;border-radius:12px 12px 0 0;">
            <h2 style="color:white;margin:0;">Nuevo Reporte Ciudadano</h2>
            <p style="color:rgba(255,255,255,0.7);margin:5px 0 0;">Caborca IA</p>
          </div>
          <div style="background:#f5f5f5;padding:20px;border-radius:0 0 12px 12px;">
            <p><strong>Tipo:</strong> ${reporte.tipo}</p>
            <p><strong>Descripcion:</strong> ${reporte.descripcion}</p>
            <p><strong>Ubicacion:</strong> ${reporte.ubicacion}</p>
            <p><strong>Fecha:</strong> ${new Date().toLocaleString('es-MX')}</p>
            <a href="https://caborca.app/admin/reportes"
               style="display:inline-block;margin-top:15px;padding:10px 20px;background:linear-gradient(135deg,#E05C3A,#E8823A);color:white;text-decoration:none;border-radius:8px;font-weight:bold;">
              Ver en panel admin
            </a>
          </div>
        </div>
      `,
    });
    logger.info(`Email reporte enviado a ${process.env.ADMIN_EMAIL}`);
  } catch (err) {
    logger.error('Email reporte error:', err.message);
  }
}

async function notificarNuevaSolicitudNegocio(solicitud) {
  try {
    await transporter.sendMail({
      from: `"Caborca IA" <${process.env.SMTP_USER}>`,
      to: process.env.ADMIN_EMAIL,
      subject: `Nueva solicitud de negocio: ${solicitud.nombre}`,
      html: `
        <div style="font-family:sans-serif;max-width:500px;margin:0 auto;">
          <div style="background:linear-gradient(135deg,#1E3A5F,#2D5F8A);padding:20px;border-radius:12px 12px 0 0;">
            <h2 style="color:white;margin:0;">Nueva Solicitud de Negocio</h2>
            <p style="color:rgba(255,255,255,0.7);margin:5px 0 0;">Caborca IA</p>
          </div>
          <div style="background:#f5f5f5;padding:20px;border-radius:0 0 12px 12px;">
            <p><strong>Negocio:</strong> ${solicitud.nombre}</p>
            <p><strong>Categoria:</strong> ${solicitud.categoria}</p>
            ${solicitud.descripcion ? `<p><strong>Info:</strong> ${solicitud.descripcion}</p>` : ''}
            ${solicitud.telefono_contacto ? `<p><strong>Contacto:</strong> ${solicitud.telefono_contacto}</p>` : ''}
            <a href="https://caborca.app/admin/solicitudes"
               style="display:inline-block;margin-top:15px;padding:10px 20px;background:linear-gradient(135deg,#E05C3A,#E8823A);color:white;text-decoration:none;border-radius:8px;font-weight:bold;">
              Ver solicitudes
            </a>
          </div>
        </div>
      `,
    });
    logger.info(`Email solicitud enviado a ${process.env.ADMIN_EMAIL}`);
  } catch (err) {
    logger.error('Email solicitud error:', err.message);
  }
}

module.exports = { notificarNuevoReporte, notificarNuevaSolicitudNegocio };