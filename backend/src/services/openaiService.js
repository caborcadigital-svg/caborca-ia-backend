const OpenAI = require('openai');
const { logger } = require('../utils/logger');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `Eres Caborca IA, el asistente inteligente de Heroica Caborca, Sonora, México. 
Eres local, amigable y conoces bien la ciudad. Respondes en español mexicano natural.
Cuando tengas contexto de datos locales (clima, eventos, negocios, deportes, noticias), úsalos para dar respuestas precisas.
Mantén respuestas concisas pero útiles. Máximo 3 párrafos salvo que sea necesario más.
Si no tienes información suficiente, dilo honestamente y sugiere cómo el usuario puede obtenerla.
Nunca inventes negocios, lugares o hechos específicos de Caborca que no estén en el contexto provisto.`;

async function askOpenAI(mensaje, contexto = {}, historial = []) {
  try {
    const contextoParts = [];

    if (contexto.clima) contextoParts.push(`CLIMA ACTUAL: ${JSON.stringify(contexto.clima)}`);
    if (contexto.eventos?.length) contextoParts.push(`EVENTOS PRÓXIMOS: ${JSON.stringify(contexto.eventos.slice(0, 5))}`);
    if (contexto.noticias?.length) contextoParts.push(`NOTICIAS RECIENTES: ${JSON.stringify(contexto.noticias.slice(0, 5))}`);
    if (contexto.negocios?.length) contextoParts.push(`NEGOCIOS RELEVANTES: ${JSON.stringify(contexto.negocios.slice(0, 5))}`);
    if (contexto.deportes?.length) contextoParts.push(`RESULTADOS DEPORTIVOS: ${JSON.stringify(contexto.deportes.slice(0, 5))}`);

    const systemContent = contextoParts.length
      ? `${SYSTEM_PROMPT}\n\nCONTEXTO ACTUAL DE CABORCA:\n${contextoParts.join('\n\n')}`
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
      temperature: 0.7,
    });

    const respuesta = response.choices[0].message.content;
    const tokens = response.usage?.total_tokens || 0;
    logger.info(`OpenAI: ${tokens} tokens usados para: "${mensaje.slice(0, 50)}"`);

    return respuesta;
  } catch (err) {
    logger.error('Error OpenAI:', err.message);
    return 'Lo siento, el asistente IA no está disponible en este momento. Intenta con preguntas específicas como el clima, eventos o noticias.';
  }
}

module.exports = { askOpenAI };
