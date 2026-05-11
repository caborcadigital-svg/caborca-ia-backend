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

RESTAURANTES CONOCIDOS:
- El Timón: Quiroz y Mora entre Calles 10 y 11, tel 637-372-0525
- Palo Verde: Quiroz y Mora 165 Nte, tel 637-372-0466
- Asadero La Carreta: Obregón 204, tel 637-372-4538

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
2. Si te preguntan algo de Caborca que no sabes, di que no tienes esa información actualizada pero sugiere a dónde ir o a quién preguntar
3. Para emergencias siempre menciona el 911
4. Sé conciso pero completo. No des respuestas de más de 300 palabras a menos que sea necesario
5. Si el CONTEXTO LOCAL contiene información relevante, úsala con prioridad
6. Cuando menciones teléfonos o direcciones, sé específico`;

async function buscarConocimientoLocal(mensaje) {
  try {
    const res = await fetch(process.env.API_URL || 'http://localhost:' + (process.env.PORT || 4000) + '/api/conocimiento/buscar?q=' + encodeURIComponent(mensaje) + '&limit=5');
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

async function buscarEnApp(mensaje) {
  try {
    const palabras = mensaje.toLowerCase();
    const resultados = [];

    if (palabras.includes('notici') || palabras.includes('pasó') || palabras.includes('ocurrió') || palabras.includes('hoy')) {
      const { data } = await supabase.from('noticias').select('titulo,categoria,created_at').order('created_at', { ascending: false }).limit(3);
      if (data && data.length) {
        resultados.push('NOTICIAS RECIENTES EN CABORCA: ' + data.map(n => n.titulo + ' (' + n.categoria + ')').join('. '));
      }
    }

    if (palabras.includes('negocio') || palabras.includes('restaurante') || palabras.includes('farmacia') || palabras.includes('tienda') || palabras.includes('comer') || palabras.includes('cenar')) {
      const { data } = await supabase.from('negocios').select('nombre,categoria,telefono,direccion').eq('activo', true).limit(5);
      if (data && data.length) {
        resultados.push('NEGOCIOS REGISTRADOS EN LA APP: ' + data.map(n => n.nombre + ' (' + n.categoria + ')' + (n.telefono ? ' tel ' + n.telefono : '') + (n.direccion ? ' en ' + n.direccion : '')).join('. '));
      }
    }

    if (palabras.includes('evento') || palabras.includes('fiesta') || palabras.includes('concierto') || palabras.includes('festival')) {
      const { data } = await supabase.from('eventos').select('nombre,fecha_inicio,lugar').gte('fecha_inicio', new Date().toISOString()).order('fecha_inicio', { ascending: true }).limit(3);
      if (data && data.length) {
        resultados.push('EVENTOS PROXIMOS: ' + data.map(e => e.nombre + (e.lugar ? ' en ' + e.lugar : '') + ' el ' + new Date(e.fecha_inicio).toLocaleDateString('es-MX')).join('. '));
      }
    }

    if (palabras.includes('partido') || palabras.includes('beisbol') || palabras.includes('futbol') || palabras.includes('resultado') || palabras.includes('deporte')) {
      const { data } = await supabase.from('partidos').select('equipo_local,equipo_visitante,marcador_local,marcador_visitante,liga,estado').order('created_at', { ascending: false }).limit(3);
      if (data && data.length) {
        resultados.push('RESULTADOS DEPORTIVOS RECIENTES: ' + data.map(p => p.equipo_local + ' ' + (p.marcador_local ?? '-') + ' - ' + (p.marcador_visitante ?? '-') + ' ' + p.equipo_visitante + ' (' + p.liga + ')').join('. '));
      }
    }

    if (palabras.includes('reporte') || palabras.includes('accidente') || palabras.includes('trafico') || palabras.includes('apagon') || palabras.includes('emergencia')) {
      const { data } = await supabase.from('reportes').select('tipo,descripcion,ubicacion,created_at').eq('estado', 'aprobado').order('created_at', { ascending: false }).limit(3);
      if (data && data.length) {
        resultados.push('REPORTES CIUDADANOS ACTIVOS: ' + data.map(r => r.tipo.toUpperCase() + ': ' + r.descripcion + ' en ' + r.ubicacion).join('. '));
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
    const [conocimientoLocal, datosApp] = await Promise.all([
      buscarConocimientoLocal(mensaje),
      buscarEnApp(mensaje),
    ]);

    let contextoCaborca = '';

    if (conocimientoLocal.length > 0) {
      contextoCaborca += '\n\nCONTEXTO LOCAL ESPECÍFICO (usa esto con prioridad):\n';
      conocimientoLocal.forEach(item => {
        contextoCaborca += '--- ' + item.titulo + ' ---\n' + item.contenido + '\n\n';
      });
    }

    if (datosApp) {
      contextoCaborca += '\n\nDATOS EN TIEMPO REAL DE LA APP:\n' + datosApp;
    }

    const mensajes = [
      { role: 'system', content: SYSTEM_PROMPT + (contextoCaborca ? '\n\n' + contextoCaborca : '') },
      ...(historial || []).slice(-6),
      { role: 'user', content: mensaje },
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + process.env.OPENAI_API_KEY },
      body: JSON.stringify({ model: 'gpt-4o-mini', messages: mensajes, max_tokens: 500, temperature: 0.4 }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'OpenAI error');

    return {
      respuesta: data.choices[0].message.content,
      fuente: conocimientoLocal.length > 0 ? 'caborca-ia-local' : 'caborca-ia',
      contexto_usado: conocimientoLocal.map(i => i.titulo),
    };
  } catch (err) {
    logger.error('OpenAI error: ' + err.message);
    throw err;
  }
}

module.exports = { generarRespuesta };
