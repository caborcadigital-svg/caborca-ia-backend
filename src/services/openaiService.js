const OpenAI = require('openai');
const { logger } = require('../utils/logger');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `Eres Caborca IA, el asistente oficial e inteligente de Heroica Caborca, Sonora, México.

IDENTIDAD:
- Eres 100% local de Caborca, Sonora
- Hablas en español mexicano natural y amigable
- Eres preciso, útil y honesto

INSTRUCCIONES IMPORTANTES:
1. Primero revisa el contexto local provisto (Supabase)
2. Si el contexto no tiene la información, usa tu herramienta de búsqueda web para buscar en Google, Wikipedia y otros portales
3. Siempre busca información específica de Caborca, Sonora cuando no la tengas
4. Cuando uses información de internet, menciona brevemente la fuente
5. NUNCA inventes información — si no encuentras nada, dilo claramente

TEMAS QUE PUEDES RESPONDER:
- Clima, noticias, eventos, reportes, negocios, deportes de Caborca
- Historia, cultura, lugares, personas y equipos de Caborca
- Cualquier pregunta relacionada con Heroica Caborca, Sonora

TEMAS FUERA DE SCOPE:
- Preguntas sin relación alguna con Caborca o Sonora

CONOCIMIENTO LOCAL:
- Caborca está en el noroeste de Sonora, México, cerca de la frontera con Arizona
- Temperatura extrema en verano (hasta 50°C), inviernos suaves
- Economía: agricultura (espárrago, uva), minería y ganadería
- La Misión de la Purísima Concepción es el monumento histórico más importante
- Colonias: Centro, INFONAVIT, Villas del Real, Bella Vista, El Ranchito
- Equipos deportivos conocidos: Los Rojos de Caborca (béisbol)

FORMATO:
- Máximo 3 párrafos, conciso y directo
- Usa emojis ocasionalmente para hacerlo amigable
- Si es información de internet, indica "Según [fuente]..."`;

async function askOpenAI(mensaje, contexto = {}, historial = []) {
  try {
    const contextoParts = [];

    if (contexto.clima) {
      contextoParts.push(`CLIMA ACTUAL EN CABORCA:
- Temperatura: ${contexto.clima.temperatura}°C (sensación ${contexto.clima.sensacion}°C)
- Condición: ${contexto.clima.descripcion}
- Humedad: ${contexto.clima.humedad}% | Viento: ${contexto.clima.viento} km/h
- Máxima: ${contexto.clima.maxima}°C / Mínima: ${contexto.clima.minima}°C`);
    }

    if (contexto.eventos?.length) {
      const evts = contexto.eventos.slice(0, 5).map(e =>
        `- ${e.nombre} | ${new Date(e.fecha_inicio).toLocaleDateString('es-MX')} | ${e.lugar || 'Por confirmar'}`
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
        return `- ${n.nombre} (${n.categoria})${dir}${tel}${fuente}`;
      }).join('\n');
      contextoParts.push(`NEGOCIOS REGISTRADOS EN CABORCA:\n${negs}`);
    }

    if (contexto.deportes?.length) {
      const dep = contexto.deportes.slice(0, 5).map(p =>
        `- ${p.equipo_local} ${p.marcador_local ?? '?'}-${p.marcador_visitante ?? '?'} ${p.equipo_visitante} (${p.liga} | ${p.deporte})`
      ).join('\n');
      contextoParts.push(`RESULTADOS DEPORTIVOS RECIENTES:\n${dep}`);
    }

    if (contexto.reportes?.length) {
      const reps = contexto.reportes.slice(0, 5).map(r =>
        `- [${r.tipo.toUpperCase()}] ${r.descripcion} | ${r.ubicacion}`
      ).join('\n');
      contextoParts.push(`REPORTES CIUDADANOS ACTIVOS:\n${reps}`);
    }

    const systemContent = contextoParts.length
      ? `${SYSTEM_PROMPT}\n\n=== CONTEXTO LOCAL DISPONIBLE ===\n${contextoParts.join('\n\n')}\n=== FIN CONTEXTO ===\n\nSi el contexto anterior no responde la pregunta del usuario, usa la búsqueda web para encontrar información.`
      : `${SYSTEM_PROMPT}\n\nNo hay contexto local disponible. Usa la búsqueda web para responder preguntas sobre Caborca.`;

    const messages = [
      { role: 'system', content: systemContent },
      ...historial.slice(-6),
      { role: 'user', content: mensaje },
    ];

    const response = await openai.responses.create({
      model: 'gpt-4o-mini',
      instructions: systemContent,
      input: mensaje,
      tools: [{ type: 'web_search_preview' }],
      max_output_tokens: 600,
    });

    const respuesta = response.output_text;
    logger.info(`OpenAI web search: "${mensaje.slice(0, 50)}"`);

    return respuesta || 'No pude obtener una respuesta en este momento.';
  } catch (err) {
    logger.error('Error OpenAI:', err.message);

    try {
      const fallback = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...historial.slice(-4),
          { role: 'user', content: mensaje },
        ],
        max_tokens: 500,
        temperature: 0.6,
      });
      return fallback.choices[0].message.content;
    } catch (fallbackErr) {
      logger.error('Fallback OpenAI error:', fallbackErr.message);
      if (err.status === 429) return 'El asistente está recibiendo muchas consultas. Intenta en unos segundos.';
      return 'Lo siento, el asistente IA no está disponible en este momento.';
    }
  }
}

module.exports = { askOpenAI };
