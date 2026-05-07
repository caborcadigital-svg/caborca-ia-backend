const { supabase } = require('../../config/supabase');

async function getDeportes({ limit = 10, deporte = null, liga = null } = {}) {
  let query = supabase
    .from('partidos')
    .select('id, deporte, liga, equipo_local, equipo_visitante, marcador_local, marcador_visitante, fecha, estado, lugar')
    .order('fecha', { ascending: false })
    .limit(limit);

  if (deporte) query = query.eq('deporte', deporte);
  if (liga) query = query.eq('liga', liga);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function getProximosPartidos(limit = 10) {
  const { data, error } = await supabase
    .from('partidos')
    .select('*')
    .eq('estado', 'programado')
    .gte('fecha', new Date().toISOString())
    .order('fecha', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

async function getLigas() {
  const { data, error } = await supabase
    .from('ligas')
    .select('id, nombre, deporte, temporada, activa')
    .eq('activa', true);
  if (error) throw error;
  return data || [];
}

async function crearPartido(partido) {
  const { data, error } = await supabase.from('partidos').insert([partido]).select().single();
  if (error) throw error;
  return data;
}

async function actualizarPartido(id, cambios) {
  const { data, error } = await supabase
    .from('partidos')
    .update({ ...cambios, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

module.exports = { getDeportes, getProximosPartidos, getLigas, crearPartido, actualizarPartido };
