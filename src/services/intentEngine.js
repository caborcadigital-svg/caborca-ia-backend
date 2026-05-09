const { getClima } = require('./climaService');
const { buscarNegocios } = require('./negociosService');
const { getEventos } = require('./eventosService');
const { getNoticias } = require('./noticiasService');
const { getDeportes } = require('./deportesService');
const { getReportes } = require('./reportesService');
const { askOpenAI } = require('./openaiService');
const axios = require('axios');
const { logger } = require('../utils/logger');

const INTENTS = {
  CLIMA: /\b(clima|tiempo|temperatura|lluvia|calor|frio|viento|pronóstico|pronostico|nublado|sol|fresco|húmedo)\b/i,
  NEGOCIOS: /\b(restaurante|negocio|tienda|servicio|comer|cenar|donde|abierto|horario|lugar|café|cafe|taqueria|farmacia|hotel|supermercado)\b/i,
  EVENTOS: /\b(evento|concierto|fiesta|actividad|que hay|que hacer|fin de semana|este fin|festival)\b/i,
  NOTICIAS: /\b(noticia|pasó|paso|ocurrió|ocurrio|hoy|ayer|caborca|municipio|gobierno|alcalde)\b/i,
  DEPORTES: /\b(deporte|partido|juego|liga|beisbol|béisbol|futbol|fútbol|basquet|resultado|marcador|torneo|equipo|rojos|temporada)\b/i,
  REPORTES: /\b(reporte|accidente|apagón|apagon|trafico|tráfico|reten|retén|calle cerrada|peligro|alerta|bloqueo)\b/i,
  SALUDO: /^(hola|buenas|buenos|hi|hey|que tal|qué tal|como estas|cómo estás|buenas tardes|buenas noches|buenos días)[\s!?.]*$/i,
};

async function buscarTavily(query, incluirCaborca = true) {
  if (!process.env.TAVILY_API_KEY) return null;
  try {
    const queryFinal = incluirCaborca ? `${query} Caborca Sonora` : query;
    const res = await axios.post('https://api.tavily.com/search', {
      api_key: process.env.TAVILY_API_KEY,
      query: queryFinal,
      search_depth: 'basic',
      max_results: 5,
      include_answer: true,
    }, { timeout: 8000 });

    const data = res.data;
    const partes = [];

    if (data.answer) partes.push(`Resumen: ${data.answer}`);

    if (data.results?.length) {
      data.results.slice(0, 4).forEach(r => {
        if (r.content) partes.push(`[${r.title}] ${r.content.slice(0, 400)}`);
      });
    }

    logger.info(`Tavily (${queryFinal}): ${partes.length} resultados`);
    return partes.length ? partes.join('\n\n') : null;
  } catch (err) {
    logger.error('Error Tavily:', err.message);
    return null;
  }
}

async function buscarConFallback(mensaje) {
  let resultado = await buscarTavily(mensaje, true);
  if (!resultado) {
    logger.info('Tavily sin resultados con Caborca, intentando sin ubicacion...');
    resultado = await buscarTavily(mensaje, false);
  }
  return resultado;
}

function tieneIntentEspecifico(lower) {
  return INTENTS.CLIMA.test(lower) || INTENTS.NEGOCIOS.test(lower) ||
    INTENTS.EVENTOS.test(lower) || INTENTS.NOTICIAS.test(lower) ||
    INTENTS.DEPORTES.test(lower) || INTENTS.REPORTES.test(lower);
}

async function resolveIntent(mensaje, historial = []) {
  const lower = mensaje.toLowerCase();

  if (INTENTS.SALUDO.test(lower.trim())) {
    return {
      tipo: 'directo',
      respuesta: '¡Hola! Soy Caborca IA, tu asistente inteligente de Heroica Caborca, Sonora. ¿En qué puedo ayudarte hoy? Puedo darte info sobre clima, negocios, eventos, noticias, deportes, reportes ciudadanos y mucho más 😊',
      fuente: 'sistema',
    };
  }

  const contexto = {};

  if (INTENTS.CLIMA.test(lower)) {
    const clima = await getClima();
    if (!INTENTS.NEGOCIOS.test(lower) && !INTENTS.DEPORTES.test(lower)) {
      return { tipo: 'directo', respuesta: formatClima(clima), fuente: 'openweather', data: clima };
    }
    contexto.clima = clima;
  }

  if (INTENTS.DEPORTES.test(lower)) {
    const deportes = await getDeportes({ limit: 5 });
    contexto.deportes = deportes;
    const webResult = await buscarConFallback(mensaje);
    if (webResult) contexto.webSearch = webResult;
    const respuestaIA = await askOpenAI(mensaje, contexto, historial);
    return { tipo: 'ia', respuesta: respuestaIA, fuente: 'openai', data: contexto };
  }

  if (INTENTS.REPORTES.test(lower)) {
    const reportes = await getReportes({ estado: 'aprobado', limit: 5 });
    return { tipo: 'directo', respuesta: formatReportes(reportes), fuente: 'supabase', data: reportes };
  }

  if (INTENTS.EVENTOS.test(lower)) {
    const eventos = await getEventos({ proximos: true });
    contexto.eventos = eventos;
  }

  if (INTENTS.NOTICIAS.test(lower)) {
    const noticias = await getNoticias({ limit: 5 });
    contexto.noticias = noticias;
    const webResult = await buscarConFallback(mensaje);
    if (webResult) contexto.webSearch = webResult;
  }

  if (INTENTS.NEGOCIOS.test(lower)) {
    const negocios = await buscarNegocios(mensaje);
    contexto.negocios = negocios;
  }

  if (!tieneIntentEspecifico(lower)) {
    logger.info(`Sin intent especifico, buscando en Tavily: "${mensaje}"`);
    const webResult = await buscarConFallback(mensaje);
    if (webResult) contexto.webSearch = webResult;
  }

  const respuestaIA = await askOpenAI(mensaje, contexto, historial);
  return { tipo: 'ia', respuesta: respuestaIA, fuente: 'openai', data: contexto };
}

function formatClima(c) {
  if (!c) return 'No pude obtener el clima en este momento.';
  return `🌡️ **Clima en Caborca ahora mismo:**\n- Temperatura: ${c.temperatura}°C (sensación ${c.sensacion}°C)\n- Condición: ${c.descripcion}\n- Humedad: ${c.humedad}%\n- Viento: ${c.viento} km/h\n- Visibilidad: ${c.visibilidad} km`;
}

function formatReportes(r) {
  if (!r?.length) return 'No hay reportes ciudadanos activos en este momento.';
  const lineas = r.map(rep => `🚨 **${rep.tipo}**: ${rep.descripcion} - ${rep.ubicacion}`);
  return `⚠️ **Reportes ciudadanos activos:**\n${lineas.join('\n')}`;
}

module.exports = { resolveIntent };
