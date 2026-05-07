const { supabase } = require('../../config/supabase');

const TIPOS_VALIDOS = ['accidente', 'apagón', 'tráfico', 'retén', 'seguridad', 'promoción', 'evento', 'calle_cerrada', 'otro'];

async function getReportes({ estado = 'aprobado', limit = 20, page = 1, tipo = null } = {}) {
  let query = supabase
    .from('reportes')
    .select('id, tipo, descripcion, ubicacion, estado, created_at, usuario_id')
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (estado) query = query.eq('estado', estado);
  if (tipo) query = query.eq('tipo', tipo);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function crearReporte(reporte) {
  if (!TIPOS_VALIDOS.includes(reporte.tipo)) {
    throw new Error('Tipo de reporte inválido');
  }

  const { data, error } = await supabase
    .from('reportes')
    .insert([{ ...reporte, estado: 'pendiente' }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function actualizarEstadoReporte(id, estado) {
  const estadosValidos = ['pendiente', 'aprobado', 'rechazado', 'resuelto'];
  if (!estadosValidos.includes(estado)) throw new Error('Estado inválido');

  const { data, error } = await supabase
    .from('reportes')
    .update({ estado, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function eliminarReporte(id) {
  const { error } = await supabase.from('reportes').delete().eq('id', id);
  if (error) throw error;
}

module.exports = { getReportes, crearReporte, actualizarEstadoReporte, eliminarReporte };
