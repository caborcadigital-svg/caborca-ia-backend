const { logger } = require('../utils/logger');
const { supabase } = require('../../config/supabase');

const SYSTEM_PROMPT = `Eres Caborca IA, el asistente inteligente oficial de Heroica Caborca, Sonora, México. Tu personalidad es amigable, directa y orgullosa de ser caborqueña.

DATOS CLAVE DE CABORCA:
- Apodo: "La Perla del Desierto"
- Población: ~90,000 habitantes
- Altitud: 280 metros sobre el nivel del mar
- Clima: Desértico extremoso. Veranos hasta 48°C, inviernos con noches hasta 0°C
- Principal productor de espárrago de México y del mundo
- También produce uva, olivo, nuez y tiene minas de oro (La Herradura)
- Historia: Gesta Heroica del 6 de abril de 1857 contra filibusteros de Henry Crabb
- Fundación: Misión de Kino en 1692
- Deporte rey: Béisbol. Equipo: Rojos de Caborca (Liga Norte de México)

CALLES PRINCIPALES:
- Calle Álvaro Obregón (Calle 5): principal del centro, este-oeste
- Av. Quiroz y Mora: arteria norte-sur más importante
- Calle 6: conecta centro con IMSS
- Calzada 6 de Septiembre: hacia carretera internacional

SERVICIOS CLAVE:
- IMSS HGZ 8: Calle Obregón 185, Centro
- Cruz Roja: Av. K 50, tel 637-637-2626
- Bomberos: Calle 8 entre Av. P y Q
- Palacio Municipal: Calle 6 entre Av. M y N
- OOMAPAS (agua): Calle 7ma

RESTAURANTES:
- El Timón: Quiroz y Mora entre Calles 10 y 11, tel 637-372-0525
- Palo Verde: Quiroz y Mora 165 Nte, tel 637-372-0466
- Asadero La Carreta: Obregón 204, tel 637-372-4538
- Borca 26: Calle 6 esquina Av. J, tel 637-124-7431

FARMACIAS:
- La Plaza: Obregón y Calle 7ma, tel 637-372-0010
- Benavides: Obregón y Calle 4ta, tel 637-372-3644
- Guadalajara: Av. Tecnológico 312, tel 637-126-0772

SUPERMERCADOS:
- Bodega Aurrera: Calle 3ra y 4ta, tel 637-372-8400
- Super Hayashi: Quiroz y Mora 100, tel 637-372-4011
- Del Mayo: Quiroz y Mora 14 Nte, tel 637-372-3555

REGLAS:
1. Responde siempre en español
2. Si te preguntan algo que no sabes, sugiere a dónde ir o a quién preguntar
3. Para emergencias siempre menciona el 911
4. Sé conciso pero completo. No más de 300 palabras salvo necesidad
5. Si el CONTEXTO LOCAL tiene información relevante, úsala con prioridad
6. Cuando menciones teléfonos o direcciones, sé específico`;

async function buscarConocimientoLocal(mensaje) {
  try {
    const palabras = mensaje.toLowerCase().split(/\s+/).filter(function(p) { return p.length > 2; });
    if (palabras.length === 0) return [];

    const result = await supabase
      .from('conocimiento_caborca')
      .select('id,categoria,titulo,contenido,tags,prioridad')
      .eq('activo', true)
      .order('prioridad', { ascending: false })
      .limit(50);

    if (result.error || !result.data) return [];

    var scored = result.data.map(function(item) {
      var score = 0;
      var texto = (item.titulo + ' ' + item.contenido + ' ' + (item.tags || []).join(' ')).toLowerCase();
      palabras.forEach(function(p) {
        if (texto.includes(p)) score += (item.prioridad || 1);
        if ((item.tags || []).some(function(t) { return t.includes(p); })) score += 3;
        if (item.titulo.toLowerCase().includes(p)) score += 5;
      });
      return Object.assign({}, item, { score: score });
    }).filter(function(i) { return i.score > 0; }).sort(function(a, b) { return b.score - a.score; }).slice(0, 5);

    return scored;
  } catch (err) {
    logger.error('Error buscando conocimiento: ' + err.message);
    return [];
  }
}

async function buscarEnApp(mensaje) {
  try {
    var palabras = mensaje.toLowerCase();
    var resultados = [];

    if (palabras.includes('notici') || palabras.includes('pas') || palabras.includes('ocurri') || palabras.includes('hoy')) {
      var noticias = await supabase.from('noticias').select('titulo,categoria,created_at').order('created_at', { ascending: false }).limit(3);
      if (noticias.data && noticias.data.length) {
        resultados.push('NOTICIAS RECIENTES: ' + noticias.data.map(function(n) { return n.titulo + ' (' + n.categoria + ')'; }).join('. '));
      }
    }

    if (palabras.includes('negocio') || palabras.includes('restaurante') || palabras.includes('farmacia') || palabras.includes('tienda') || palabras.includes('comer') || palabras.includes('cenar') || palabras.includes('donde')) {
      var negocios = await supabase.from('negocios').select('nombre,categoria,telefono,direccion').eq('activo', true).limit(5);
      if (negocios.data && negocios.data.length) {
        resultados.push('NEGOCIOS EN LA APP: ' + negocios.data.map(function(n) { return n.nombre + ' (' + n.categoria + ')' + (n.telefono ? ' tel ' + n.telefono : '') + (n.direccion ? ' en ' + n.direccion : ''); }).join('. '));
      }
    }

    if (palabras.includes('evento') || palabras.includes('fiesta') || palabras.includes('concierto') || palabras.includes('festival')) {
      var eventos = await supabase.from('eventos').select('nombre,fecha_inicio,lugar').gte('fecha_inicio', new Date().toISOString()).order('fecha_inicio', { ascending: true }).limit(3);
      if (eventos.data && eventos.data.length) {
        resultados.push('EVENTOS PROXIMOS: ' + eventos.data.map(function(e) { return e.nombre + (e.lugar ? ' en ' + e.lugar : '') + ' el ' + new Date(e.fecha_inicio).toLocaleDateString('es-MX'); }).join('. '));
      }
    }

    if (palabras.includes('partido') || palabras.includes('beisbol') || palabras.includes('futbol') || palabras.includes('resultado') || palabras.includes('deporte')) {
      var partidos = await supabase.from('partidos').select('equipo_local,equipo_visitante,marcador_local,marcador_visitante,liga').order('created_at', { ascending: false }).limit(3);
      if (partidos.data && partidos.data.length) {
        resultados.push('RESULTADOS DEPORTIVOS: ' + partidos.data.map(function(p) { return p.equipo_local + ' ' + (p.marcador_local != null ? p.marcador_local : '-') + ' - ' + (p.marcador_visitante != null ? p.marcador_visitante : '-') + ' ' + p.equipo_visitante + ' (' + p.liga + ')'; }).join('. '));
      }
    }

    if (palabras.includes('reporte') || palabras.includes('accidente') || palabras.includes('trafico') || palabras.includes('apagon')) {
      var reportes = await supabase.from('reportes').select('tipo,descripcion,ubicacion').eq('estado', 'aprobado').order('created_at', { ascending: false }).limit(3);
      if (reportes.data && reportes.data.length) {
        resultados.push('REPORTES ACTIVOS: ' + reportes.data.map(function(r) { return r.tipo.toUpperCase() + ': ' + r.descripcion + ' en ' + r.ubicacion; }).join('. '));
      }
    }

    return resultados.join('\n\n');
  } catch (err) {
    logger.error('Error buscando en app: ' + err.message);
    return '';
  }
}

async function generarRespuesta(mensaje, historial) {
  try {
    var conocimientoLocal = await buscarConocimientoLocal(mensaje);
    var datosApp = await buscarEnApp(mensaje);

    var contextoCaborca = '';

    if (conocimientoLocal.length > 0) {
      contextoCaborca += '\n\nCONTEXTO LOCAL ESPECIFICO (usa esto con prioridad):\n';
      conocimientoLocal.forEach(function(item) {
        contextoCaborca += '--- ' + item.titulo + ' ---\n' + item.contenido + '\n\n';
      });
    }

    if (datosApp) {
      contextoCaborca += '\n\nDATOS EN TIEMPO REAL DE LA APP:\n' + datosApp;
    }

    var mensajes = [
      { role: 'system', content: SYSTEM_PROMPT + (contextoCaborca ? '\n\n' + contextoCaborca : '') },
    ];

    if (historial && historial.length) {
      historial.slice(-6).forEach(function(h) { mensajes.push(h); });
    }

    mensajes.push({ role: 'user', content: mensaje });

    var response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + process.env.OPENAI_API_KEY },
      body: JSON.stringify({ model: 'gpt-4o-mini', messages: mensajes, max_tokens: 500, temperature: 0.4 }),
    });

    var data = await response.json();
    if (!response.ok) throw new Error(data.error ? data.error.message : 'OpenAI error');

    return {
      respuesta: data.choices[0].message.content,
      fuente: conocimientoLocal.length > 0 ? 'caborca-ia-local' : 'caborca-ia',
    };
  } catch (err) {
    logger.error('OpenAI error: ' + err.message);
    throw err;
  }
}

module.exports = { generarRespuesta };


async function askOpenAI(mensaje, contexto, historial) {
  try {
    var resultado = await generarRespuesta(mensaje, historial);
    return resultado.respuesta;
  } catch (err) {
    logger.error('askOpenAI error: ' + err.message);
    return 'Lo siento, no pude procesar tu pregunta en este momento. Intenta de nuevo.';
  }
}

module.exports = { generarRespuesta, askOpenAI };
