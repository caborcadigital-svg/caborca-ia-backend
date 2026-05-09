const OpenAI = require('openai');
const axios = require('axios');
const { logger } = require('../utils/logger');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `Eres Caborca IA, el asistente oficial de Heroica Caborca, Sonora, México.
Hablas en español mexicano natural, eres preciso, útil y honesto.
Cuando tengas resultados de búsqueda web en el contexto, úsalos para responder con información real.
Cuando uses info de internet menciona la fuente brevemente.
Máximo 3 párrafos. Usa emojis ocasionalmente.
Solo respondes temas relacionados con Caborca, Sonora y México en general.`;

async function buscarTavily(query) {
  try {
    const res = await axios.post('https://api.tavily.com/search', {
      api_key: process.env.TAVILY_API_KEY,
      query: `${query} Caborca Sonora México`,
      search_depth: 'basic',
      max_results: 5,
      include_answer: true,
      include_raw_content: false,
    }, { timeout: 8000 });

    const data = res.data;
    const partes = [];

    if (data.answer) {
      partes.push(`Resumen: ${data.answer}`);
    }

    if (data.results?.length) {
      data.results.slice(0, 4).forEach(r => {
        partes.push(`[${r.title}] ${r.content?.slice(0, 300) || ''} (${r.url})`);
      });
    }

    return partes.length ? partes.join('\n\n') : null;
  } catch (err) {
    logger.error('Error Tavily:', err.message);
    return null;
  }
}

function necesitaBusqueda(mensaje, contexto) {
  const tieneContextoRelevante =
    contexto.noticias?.some(n => mensaje.toLowerCase().split(' ').some(p => p.length > 3 && n.titulo?.toLowerCase().includes(p))) ||
    contexto.negocios?.length > 0 ||
    contexto.eventos?.length > 0 ||
    contexto.deportes?.length > 0;

  const esClimaOReporte = /clima|temperatura|lluvia|calor|reporte|tráfico|accidente/i.test(mensaje);

  if (esClimaOReporte && (contexto.clima || contexto.reportes?.length)) return false;

  return !tieneContextoRelevante;
}

async function askOpenAI(mensaje, contexto = {}, historial = []) {
  try {
    const contextoParts = [];

    if (contexto.clima) {
      contextoParts.push(`CLIMA ACTUAL EN CABORCA: ${contexto.clima.temperatura}°C, ${contexto.clima.descripcion}, humedad ${contexto.clima.humedad}%, viento ${contexto.clima.viento} km/h, máx ${contexto.clima.maxima}° mín ${contexto.clima.minima}°`);
    }

    if (contexto.noticias?.length) {
      const news = contexto.noticias.slice(0, 5).map(n => `- ${n.titulo}`).join('\n');
      contextoParts.push(`NOTICIAS RECIENTES DE CABORCA:\n${news}`);
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
      contextoParts.push(`REPORTES CIUDADANOS ACTIVOS:\n${reps}`);
    }

    if (necesitaBusqueda(mensaje, contexto)) {
      logger.info(`Buscando en Tavily: "${mensaje}"`);
      const webResult = await buscarTavily(mensaje);
      if (webResult) {
        contextoParts.push(`RESULTADOS DE BÚSQUEDA WEB:\n${webResult}`);
        logger.info('Tavily devolvió resultados');
      } else {
        logger.info('Tavily no devolvió resultados');
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
    logger.info(`OpenAI: ${tokens} tokens | "${mensaje.slice(0, 50)}"`);

    return respuesta;
  } catch (err) {
    logger.error('Error OpenAI:', err.message);
    if (err.status === 429) return 'El asistente está ocupado. Intenta en unos segundos.';
    return 'Lo siento, el asistente no está disponible en este momento.';
  }
}

module.exports = { askOpenAI };
