const OpenAI = require('openai');
const { logger } = require('../utils/logger');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `Eres Caborca IA, el asistente oficial e inteligente de Heroica Caborca, Sonora, México.

IDENTIDAD:
- Eres 100% local de Caborca, Sonora
- Conoces la ciudad, sus colonias, calles principales y costumbres locales
- Hablas en español mexicano natural y amigable
- Eres preciso, útil y honesto

REGLAS ESTRICTAS:
1. SOLO hablas sobre Heroica Caborca, Sonora y su área metropolitana
2. NUNCA inventes negocios, restaurantes, direcciones o lugares que no estén en el contexto provisto
3. NUNCA menciones lugares de otras ciudades como si fueran de Caborca
4. Si no tienes datos de negocios en el contexto, dilo claramente: "No tengo negocios registrados en este momento para esa categoría en Caborca."
5. Usa SOLO la información del contexto para recomendaciones específicas
6. Si el contexto tiene negocios de Google Places, menciónalo: "Según Google Maps..."
7. Para clima, usa SOLO los datos del contexto, nunca inventes temperaturas
8. Para eventos y deportes, usa SOLO los datos de Supabase provistos

CONOCIMIENTO LOCAL DE CABORCA:
- Caborca está en el noroeste de Sonora, México
- Temperatura extrema en verano (hasta 50°C), inviernos suaves
- Economía basada en agricultura, minería y ganadería
- La Misión de la Purísima Concepción es el monumento más importante
- Zona comercial principal: centro y bulevar
- Colonias principales: Centro, INFONAVIT, Villas del Real, Bella Vista

FORMATO DE RESPUESTAS:
- Conciso: máximo 3 párrafos
- Usa emojis ocasionalmente para hacer la respuesta más amigable
- Si recomiendas un negocio, incluye nombre y categoría solamente (sin inventar teléfonos o direcciones que no estén en el contexto)
- Al final de recomendaciones, sugiere: "Visita la sección Negocios en Caborca IA para más información"`;

async function askOpenAI(mensaje, contexto = {}, historial = []) {
  try {
    const contextoParts = [];

    if (contexto.clima) {
      contextoParts.push(`CLIMA ACTUAL EN CABORCA:
- Temperatura: ${contexto.clima.temperatura}°C (sensación ${contexto.clima.sensacion}°C)
- Condición: ${contexto.clima.descripcion}
- Humedad: ${contexto.clima.humedad}%
- Viento: ${contexto.clima.viento} km/h
- Máxima: ${contexto.clima.maxima}°C / Mínima: ${contexto.clima.minima}°C`);
    }

    if (contexto.eventos?.length) {
      const evts = contexto.eventos.slice(0, 5).map(e =>
        `- ${e.nombre} | ${new Date(e.fecha_inicio).toLocaleDateString('es-MX')} | ${e.lugar || 'Lugar por confirmar'}`
      ).join('\n');
      contextoParts.push(`EVENTOS PRÓXIMOS EN CABORCA:\n${evts}`);
    }

    if (contexto.noticias?.length) {
      const news = contexto.noticias.slice(0, 5).map(n => `- ${n.titulo} (${n.categoria})`).join('\n');
      contextoParts.push(`NOTICIAS RECIENTES DE CABORCA:\n${news}`);
    }

    if (contexto.negocios?.length) {
      const negs = contexto.negocios.slice(0, 8).map(n => {
        const fuente = n.fuente === 'google_places' ? ' [Google Maps]' : '';
        const dir = n.direccion ? ` | ${n.direccion}` : '';
        const tel = n.telefono ? ` | Tel: ${n.telefono}` : '';
        const horario = n.horario ? ` | ${n.horario}` : '';
        return `- ${n.nombre} (${n.categoria})${dir}${tel}${horario}${fuente}`;
      }).join('\n');
      contextoParts.push(`NEGOCIOS EN CABORCA ENCONTRADOS:\n${negs}\n\nUSA SOLO ESTOS NEGOCIOS para recomendaciones. No inventes otros.`);
    } else {
      contextoParts.push(`NEGOCIOS: No hay negocios registrados en la base de datos para esta consulta. NO INVENTES negocios. Indica al usuario que no hay datos disponibles y sugiere visitar la sección Negocios.`);
    }

    if (contexto.deportes?.length) {
      const dep = contexto.deportes.slice(0, 5).map(p =>
        `- ${p.equipo_local} ${p.marcador_local ?? '?'}-${p.marcador_visitante ?? '?'} ${p.equipo_visitante} (${p.liga} | ${p.deporte})`
      ).join('\n');
      contextoParts.push(`RESULTADOS DEPORTIVOS RECIENTES EN CABORCA:\n${dep}`);
    }

    if (contexto.reportes?.length) {
      const reps = contexto.reportes.slice(0, 5).map(r =>
        `- [${r.tipo.toUpperCase()}] ${r.descripcion} | ${r.ubicacion}`
      ).join('\n');
      contextoParts.push(`REPORTES CIUDADANOS ACTIVOS EN CABORCA:\n${reps}`);
    }

    const systemContent = contextoParts.length
      ? `${SYSTEM_PROMPT}\n\n=== CONTEXTO ACTUAL DE CABORCA ===\n${contextoParts.join('\n\n')}\n=== FIN DEL CONTEXTO ===\n\nIMPORTANTE: Usa SOLO el contexto anterior para responder. No inventes información.`
      : SYSTEM_PROMPT;

    const messages = [
      { role: 'system', content: systemContent },
      ...historial.slice(-6),
      { role: 'user', content: mensaje },
    ];

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      max_tokens: 500,
      temperature: 0.5,
    });

    const respuesta = response.choices[0].message.content;
    const tokens = response.usage?.total_tokens || 0;
    logger.info(`OpenAI: ${tokens} tokens | "${mensaje.slice(0, 50)}"`);

    return respuesta;
  } catch (err) {
    logger.error('Error OpenAI:', err.message);
    if (err.status === 429) {
      return 'El asistente está recibiendo muchas consultas en este momento. Intenta en unos segundos.';
    }
    if (err.status === 401) {
      return 'Error de configuración del asistente. Contacta al administrador.';
    }
    return 'Lo siento, el asistente IA no está disponible en este momento. Puedes consultar el clima, eventos y noticias directamente desde el menú.';
  }
}

module.exports = { askOpenAI };
