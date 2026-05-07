const axios = require('axios');
const { supabase } = require('../../config/supabase');
const { logger } = require('../utils/logger');

async function buscarNegocios(query, categoria = null) {
  let dbQuery = supabase
    .from('negocios')
    .select('id, nombre, categoria, descripcion, direccion, telefono, horario, imagen_url, lat, lng, activo')
    .eq('activo', true)
    .limit(10);

  if (categoria) dbQuery = dbQuery.eq('categoria', categoria);

  if (query) {
    dbQuery = dbQuery.or(`nombre.ilike.%${query}%,descripcion.ilike.%${query}%,categoria.ilike.%${query}%`);
  }

  const { data, error } = await dbQuery;
  if (error) logger.error('Error Supabase negocios:', error.message);

  if (data?.length) return data;

  if (process.env.GOOGLE_PLACES_API_KEY) {
    return buscarEnGooglePlaces(query);
  }

  return [];
}

async function buscarEnGooglePlaces(query) {
  try {
    const res = await axios.get('https://maps.googleapis.com/maps/api/place/textsearch/json', {
      params: {
        query: `${query} Caborca Sonora`,
        key: process.env.GOOGLE_PLACES_API_KEY,
        language: 'es',
      },
    });

    return res.data.results.slice(0, 5).map(p => ({
      nombre: p.name,
      direccion: p.formatted_address,
      categoria: p.types?.[0] || 'negocio',
      rating: p.rating,
      fuente: 'google_places',
    }));
  } catch (err) {
    logger.error('Error Google Places:', err.message);
    return [];
  }
}

async function getNegocios({ categoria = null, limit = 20, page = 1 } = {}) {
  let query = supabase
    .from('negocios')
    .select('*')
    .eq('activo', true)
    .order('nombre')
    .range((page - 1) * limit, page * limit - 1);

  if (categoria) query = query.eq('categoria', categoria);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

module.exports = { buscarNegocios, getNegocios };
