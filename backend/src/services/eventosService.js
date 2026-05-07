const { supabase } = require('../../config/supabase');

async function getEventos({ proximos = false, limit = 10, page = 1 } = {}) {
  let query = supabase
    .from('eventos')
    .select('id, nombre, descripcion, fecha_inicio, fecha_fin, lugar, imagen_url, categoria, link_externo, created_at')
    .eq('activo', true)
    .order('fecha_inicio', { ascending: true })
    .range((page - 1) * limit, page * limit - 1);

  if (proximos) {
    query = query.gte('fecha_inicio', new Date().toISOString());
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function crearEvento(evento) {
  const { data, error } = await supabase.from('eventos').insert([evento]).select().single();
  if (error) throw error;
  return data;
}

async function actualizarEvento(id, cambios) {
  const { data, error } = await supabase
    .from('eventos')
    .update({ ...cambios, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function eliminarEvento(id) {
  const { error } = await supabase.from('eventos').delete().eq('id', id);
  if (error) throw error;
}

module.exports = { getEventos, crearEvento, actualizarEvento, eliminarEvento };
