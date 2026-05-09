const OpenAI = require('openai');
const axios = require('axios');
const { logger } = require('../utils/logger');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `Eres Caborca IA, el asistente oficial de Heroica Caborca, Sonora, México.
Hablas en español mexicano natural. Eres preciso, útil y honesto.
Si tienes resultados de búsqueda web en el contexto, úsalos para responder.
Cuando uses info de internet menciona la fuente brevemente.
Máximo 3 párrafos. Usa emojis ocasionalmente.
Solo hablas de temas relacionados con Caborca, Sonora.`;

async function buscarEnInternet(query) {
  try {
    const res = await axios.get('https://api.duckduckgo.com/', {
      params: {
        q: `${query} Caborca Sonora`,
        format: 'json',
        no_html: 1,
        skip_disambig: 1,
      },
      timeout: 5000,
    });

    const data = res.data;
    const resultados = [];

    if (data.AbstractText) {
      resultados.push(`[${data.AbstractSource}] ${data.AbstractText}`);
    }

    if (data.RelatedTopics?.length) {
      data.RelatedTopics.slice(0, 3).forEach(t => {
        if (t.Text) resultados.push(`- ${t.Text}`);
      });
    }

    if (data.Answer) {
      resultados.push(`Respuesta directa: ${data.Answer}`);
    }

    return resultados.length ? resultados.join('\n') : null;
  } catch (err) {
    logger.error('Error búsqueda web:', err.message);
    return null;
  }
}

async function necesitaBusqueda(mensaje, contexto) {
  const tieneContexto = contexto.noticias?.length || contexto.negocios?.length ||
    contexto.eventos?.length || contexto.deportes?.length;

  const palabrasClave = ['quién', 'quien', 'qué es', 'que es', 'historia', 'cuándo', 'cuando',
    'cómo', 'como', 'dónde', 'donde', 'equipo', 'rojos', 'liga', 'torneo', 'iglesia',
    'misión', 'mision', 'fundación', 'fundacion', 'alcalde', 'presidente', 'famoso'];

  const necesita = palabrasClave.some(p => mensaje.toLowerCase().includes(p));
  return necesita || !tieneContexto;
}

async function askOpenAI(mensaje, contexto = {}, historial = []) {
  try {
    const contextoParts = [];

    if (contexto.clima) {
      contextoParts.push(`CLIMA ACTUAL: ${contexto.clima.temperatura}°C, ${contexto.clima.descripcion}, humedad ${contexto.clima.humedad}%, viento ${contexto.clima.viento} km/h, máx ${contexto.clima.maxima}° mín ${contexto.clima.minima}°`);
    }

    if (contexto.noticias?.length) {
      const news = contexto.noticias.slice(0, 5).map(n => `- ${n.titulo}`).join('\n');
      contextoParts.push(`NOTICIAS RECIENTES:\n${news}`);
    }

    if (contexto.eventos?.length) {
      const evts = contexto.eventos.slice(0, 4).map(e =>
        `- ${e.nombre} | ${new Date(e.fecha_inicio).toLocaleDateString('es-MX')} | ${e.lugar || ''}`
      ).join('\n');
      contextoParts.push(`EVENTOS PRÓXIMOS:\n${evts}`);
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

    if (await necesitaBusqueda(mensaje, contexto)) {
      logger.info(`Buscando en internet: "${mensaje}"`);
      const webResult = await buscarEnInternet(mensaje);
      if (webResult) {
        contextoParts.push(`RESULTADOS DE BÚSQUEDA WEB:\n${webResult}`);
      }
    }

    const systemContent = contextoParts.length
      ? `${SYSTEM_PROMPT}\n\n=== CONTEXTO ===\n${contextoParts.join('\n\n')}\n=== FIN ===`
      : SYSTEM_PROMPT;

    const messages = [
      { role: 'system', content: systemContent },
      ...historial.slice(-6),
      { role: 'user', content: mensaje },
    ];

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      max_tokens: 600,
      temperature: 0.6,
    });

    const respuesta = response.choices[0].message.content;
    const tokens = response.usage?.total_tokens || 0;
    logger.info(`OpenAI: ${tokens} tokens`);

    return respuesta;
  } catch (err) {
    logger.error('Error OpenAI:', err.message);
    if (err.status === 429) return 'El asistente está ocupado. Intenta en unos segundos.';
    return 'Lo siento, el asistente no está disponible en este momento.';
  }
}

module.exports = { askOpenAI };
