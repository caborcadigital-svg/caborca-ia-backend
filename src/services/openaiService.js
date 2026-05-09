const OpenAI = require('openai');
const { logger } = require('../utils/logger');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `Eres Caborca IA, asistente de Heroica Caborca, Sonora, México.
Hablas español mexicano natural.

REGLA PRINCIPAL: Solo puedes afirmar cosas que estén EXPLÍCITAMENTE en el contexto provisto o si esta en google.

SI HAY resultados de búsqueda web en el contexto:
- Úsalos para responder, citando la fuente
- No agregues información adicional que no esté en esos resultados

SI NO HAY resultados de búsqueda web o el contexto está vacío:
- Responde EXACTAMENTE esto: "No tengo información verificada sobre eso en este momento. Puedes buscar en Google o preguntarme sobre clima, negocios, eventos o deportes de Caborca."
- NO inventes, NO uses tu conocimiento de entrenamiento para dar datos específicos

Máximo 2 párrafos. Usa emojis ocasionalmente.`;
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
      contextoParts.push(`REPORTES ACTIVOS:\n${reps}`);
    }

    if (contexto.webSearch) {
      contextoParts.push(`RESULTADOS DE BÚSQUEDA WEB (usa esta información para responder):\n${contexto.webSearch}`);
    }

    const systemContent = contextoParts.length
      ? `${SYSTEM_PROMPT}\n\n=== CONTEXTO DISPONIBLE ===\n${contextoParts.join('\n\n')}\n=== FIN CONTEXTO ===`
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
    logger.info(`OpenAI: ${tokens} tokens | webSearch: ${!!contexto.webSearch}`);

    return respuesta;
  } catch (err) {
    logger.error('Error OpenAI:', err.message);
    if (err.status === 429) return 'El asistente está ocupado. Intenta en unos segundos.';
    return 'Lo siento, el asistente no está disponible en este momento.';
  }
}

module.exports = { askOpenAI };
