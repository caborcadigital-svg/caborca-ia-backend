const { supabase } = require('../../config/supabase');

async function getNoticias({ limit = 10, categoria = null, page = 1 } = {}) {
  let query = supabase
    .from('noticias')
    .select('id, titulo, resumen, imagen_url, categoria, link_externo, created_at, autor')
    .eq('publicada', true)
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (categoria) query = query.eq('categoria', categoria);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function getNoticiaById(id) {
  const { data, error } = await supabase
    .from('noticias')
    .select('*')
    .eq('id', id)
    .eq('publicada', true)
    .single();
  if (error) throw error;
  return data;
}

async function crearNoticia(noticia) {
  const { data, error } = await supabase
    .from('noticias')
    .insert([noticia])
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function actualizarNoticia(id, cambios) {
  const { data, error } = await supabase
    .from('noticias')
    .update({ ...cambios, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function eliminarNoticia(id) {
  const { error } = await supabase.from('noticias').delete().eq('id', id);
  if (error) throw error;
}

module.exports = { getNoticias, getNoticiaById, crearNoticia, actualizarNoticia, eliminarNoticia };
