const OpenAI = require('openai');
const { logger } = require('../utils/logger');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `Eres Caborca IA, el asistente inteligente de Heroica Caborca, Sonora, México.
Hablas español mexicano natural, eres amigable, preciso y honesto.

CÓMO RESPONDER:

1. Si tienes RESULTADOS DE BÚSQUEDA WEB en el contexto:
   - Úsalos para dar una respuesta completa e informativa
   - Menciona la fuente cuando sea relevante
   - Puedes complementar con conocimiento general de Caborca/Sonora
   - Sé específico y útil

2. Si el contexto tiene datos locales (clima, negocios, eventos, deportes):
   - Úsalos directamente para responder
   - Sé claro y conciso

3. Si NO tienes información suficiente sobre algo específico:
   - Dilo honestamente con este formato:
     "Nuestra IA está aprendiendo sobre [tema] 🤖📚 Aún no tenemos datos verificados sobre eso, pero puedes consultarlo aquí: [URL de Google]"
   - La URL de Google debe ser: https://www.google.com/search?q=[query+con+signos+más]
   - Luego sugiere preguntas que sí puedes responder

TONO: Amigable, local, caborqueño. Máximo 3 párrafos. Emojis ocasionales.`;

function generarUrlGoogle(query) {
  const encoded = encodeURIComponent(query + ' Caborca Sonora').replace(/%20/g, '+');
  return `https://www.google.com/search?q=${encoded}`;
}

async function askOpenAI(mensaje, contexto = {}, historial = []) {
  try {
    const contextoParts = [];

    if (contexto.clima) {
      contextoParts.push(`CLIMA ACTUAL EN CABORCA: ${contexto.clima.temperatura}°C, ${contexto.clima.descripcion}, humedad ${contexto.clima.humedad}%, viento ${contexto.clima.viento} km/h, max ${contexto.clima.maxima}° min ${contexto.clima.minima}°`);
    }

    if (contexto.noticias?.length) {
      const news = contexto.noticias.slice(0, 5).map(n => `- ${n.titulo}`).join('\n');
      contextoParts.push(`NOTICIAS RECIENTES DE CABORCA:\n${news}`);
    }

    if (contexto.eventos?.length) {
      const evts = contexto.eventos.slice(0, 4).map(e =>
        `- ${e.nombre} | ${new Date(e.fecha_inicio).toLocaleDateString('es-MX')} | ${e.lugar || ''}`
      ).join('\n');
      contextoParts.push(`EVENTOS PROXIMOS:\n${evts}`);
    }

    if (contexto.negocios?.length) {
      const negs = contexto.negocios.slice(0, 6).map(n =>
        `- ${n.nombre} (${n.categoria})${n.direccion ? ' | ' + n.direccion : ''}${n.telefono ? ' | ' + n.telefono : ''}`
      ).join('\n');
      contextoParts.push(`NEGOCIOS EN CABORCA:\n${negs}`);
    }

    if (contexto.deportes?.length) {
      const dep = contexto.deportes.slice(0, 4).map(p =>
        `- ${p.equipo_local} ${p.marcador_local ?? '?'}-${p.marcador_visitante ?? '?'} ${p.equipo_visitante} (${p.liga})`
      ).join('\n');
      contextoParts.push(`DEPORTES:\n${dep}`);
    }

    if (contexto.reportes?.length) {
      const reps = contexto.reportes.slice(0, 4).map(r =>
        `- [${r.tipo}] ${r.descripcion} | ${r.ubicacion}`
      ).join('\n');
      contextoParts.push(`REPORTES ACTIVOS:\n${reps}`);
    }

    if (contexto.webSearch) {
      contextoParts.push(`RESULTADOS DE BUSQUEDA WEB (usa esta informacion para responder):\n${contexto.webSearch}`);
    }

    const urlGoogle = generarUrlGoogle(mensaje);

    const systemContent = contextoParts.length
      ? `${SYSTEM_PROMPT}\n\nURL de Google para esta consulta (usa si no tienes info suficiente): ${urlGoogle}\n\n=== CONTEXTO DISPONIBLE ===\n${contextoParts.join('\n\n')}\n=== FIN CONTEXTO ===`
      : `${SYSTEM_PROMPT}\n\nURL de Google para esta consulta: ${urlGoogle}\n\nNo hay contexto local disponible. Si no puedes responder con certeza, indica que nuestra IA esta aprendiendo sobre el tema y proporciona la URL de Google.`;

    const messages = [
      { role: 'system', content: systemContent },
      ...historial.slice(-6),
      { role: 'user', content: mensaje },
    ];

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      max_tokens: 600,
      temperature: 0.4,
    });

    const respuesta = response.choices[0].message.content;
    const tokens = response.usage?.total_tokens || 0;
    logger.info(`OpenAI: ${tokens} tokens | webSearch: ${!!contexto.webSearch}`);

    return respuesta;
  } catch (err) {
    logger.error('Error OpenAI:', err.message);
    if (err.status === 429) return 'El asistente esta ocupado. Intenta en unos segundos.';
    return 'Lo siento, el asistente no esta disponible en este momento.';
  }
}

module.exports = { askOpenAI };
