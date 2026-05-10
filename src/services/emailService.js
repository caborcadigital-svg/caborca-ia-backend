const tls = require('tls');
const { logger } = require('../utils/logger');

const SMTP_HOST = process.env.SMTP_HOST || 'mail.caborca.app';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '465');
const SMTP_USER = process.env.SMTP_USER || 'noreply@caborca.app';
const SMTP_PASS = process.env.SMTP_PASS || '';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@caborca.app';

function b64(s) { return Buffer.from(s).toString('base64'); }

async function enviarEmail({ para, asunto, html }) {
  return new Promise((resolve, reject) => {
    const boundary = `bound_${Date.now()}`;
    const msg = [
      `From: Caborca IA <${SMTP_USER}>`, `To: ${para}`, `Subject: ${asunto}`,
      `MIME-Version: 1.0`, `Content-Type: multipart/alternative; boundary="${boundary}"`, '',
      `--${boundary}`, `Content-Type: text/plain; charset=UTF-8`, '', html.replace(/<[^>]+>/g,''), '',
      `--${boundary}`, `Content-Type: text/html; charset=UTF-8`, '', html, '', `--${boundary}--`, '',
    ].join('\r\n');

    let buf = '', step = 0;
    const socket = tls.connect({ host: SMTP_HOST, port: SMTP_PORT }, () => {});
    socket.setEncoding('utf8');
    socket.setTimeout(10000);
    socket.on('timeout', () => { socket.destroy(); reject(new Error('SMTP timeout')); });
    socket.on('error', reject);
    socket.on('data', data => {
      buf += data;
      if (!buf.includes('\n')) return;
      const lines = buf.split('\n'); buf = lines.pop() || '';
      for (const line of lines) {
        const code = line.substring(0,3), cont = line[3] === '-';
        if (cont) continue;
        if (step===0 && code==='220') { socket.write(`EHLO ${SMTP_HOST}\r\n`); step=1; }
        else if (step===1 && code==='250') { socket.write('AUTH LOGIN\r\n'); step=2; }
        else if (step===2 && code==='334') { socket.write(`${b64(SMTP_USER)}\r\n`); step=3; }
        else if (step===3 && code==='334') { socket.write(`${b64(SMTP_PASS)}\r\n`); step=4; }
        else if (step===4 && code==='235') { socket.write(`MAIL FROM:<${SMTP_USER}>\r\n`); step=5; }
        else if (step===5 && code==='250') { socket.write(`RCPT TO:<${para}>\r\n`); step=6; }
        else if (step===6 && code==='250') { socket.write('DATA\r\n'); step=7; }
        else if (step===7 && code==='354') { socket.write(`${msg}\r\n.\r\n`); step=8; }
        else if (step===8 && code==='250') { socket.write('QUIT\r\n'); step=9; resolve({ ok:true }); }
        else if (step===9) { socket.destroy(); }
        else if (code.startsWith('4') || code.startsWith('5')) { socket.destroy(); reject(new Error(`SMTP: ${line}`)); }
      }
    });
  });
}

async function notificarNuevoReporte(r) {
  try {
    await enviarEmail({ para: ADMIN_EMAIL, asunto: `Nuevo reporte en Caborca IA: ${r.tipo}`,
      html: `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;"><div style="background:linear-gradient(135deg,#1E3A5F,#E05C3A);padding:20px;border-radius:12px 12px 0 0;"><h2 style="color:white;margin:0;">Nuevo Reporte Ciudadano</h2></div><div style="background:#f5f5f5;padding:20px;border-radius:0 0 12px 12px;"><p><strong>Tipo:</strong> ${r.tipo}</p><p><strong>Descripción:</strong> ${r.descripcion}</p><p><strong>Ubicación:</strong> ${r.ubicacion}</p><p><strong>Fecha:</strong> ${new Date().toLocaleString('es-MX')}</p><a href="https://caborca.app/admin/reportes" style="display:inline-block;margin-top:15px;padding:10px 20px;background:linear-gradient(135deg,#E05C3A,#E8823A);color:white;text-decoration:none;border-radius:8px;">Ver en admin</a></div></div>` });
    logger.info(`Email reporte enviado a ${ADMIN_EMAIL}`);
  } catch (err) { logger.error('Email reporte error:', err.message); }
}

async function notificarNuevaSolicitudNegocio(s) {
  try {
    await enviarEmail({ para: ADMIN_EMAIL, asunto: `Nueva solicitud de negocio: ${s.nombre}`,
      html: `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;"><div style="background:linear-gradient(135deg,#1E3A5F,#2D5F8A);padding:20px;border-radius:12px 12px 0 0;"><h2 style="color:white;margin:0;">Nueva Solicitud de Negocio</h2></div><div style="background:#f5f5f5;padding:20px;border-radius:0 0 12px 12px;"><p><strong>Negocio:</strong> ${s.nombre}</p><p><strong>Categoría:</strong> ${s.categoria}</p>${s.descripcion?`<p><strong>Info:</strong> ${s.descripcion}</p>`:''}<a href="https://caborca.app/admin/solicitudes" style="display:inline-block;margin-top:15px;padding:10px 20px;background:linear-gradient(135deg,#E05C3A,#E8823A);color:white;text-decoration:none;border-radius:8px;">Ver solicitudes</a></div></div>` });
    logger.info(`Email solicitud enviado a ${ADMIN_EMAIL}`);
  } catch (err) { logger.error('Email solicitud error:', err.message); }
}

module.exports = { enviarEmail, notificarNuevoReporte, notificarNuevaSolicitudNegocio };
