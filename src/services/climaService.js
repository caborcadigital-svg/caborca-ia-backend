const axios = require('axios');
const { logger } = require('../utils/logger');

let climaCache = null;
let cacheTimestamp = 0;
const CACHE_TTL = 10 * 60 * 1000;

async function getClima() {
  if (climaCache && Date.now() - cacheTimestamp < CACHE_TTL) {
    return climaCache;
  }

  try {
    const res = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
      params: {
        lat: process.env.OPENWEATHER_LAT || 30.7162,
        lon: process.env.OPENWEATHER_LON || -112.1544,
        appid: process.env.OPENWEATHER_API_KEY,
        units: 'metric',
        lang: 'es',
      },
    });

    const d = res.data;
    climaCache = {
      temperatura: Math.round(d.main.temp),
      sensacion: Math.round(d.main.feels_like),
      minima: Math.round(d.main.temp_min),
      maxima: Math.round(d.main.temp_max),
      humedad: d.main.humidity,
      descripcion: d.weather[0].description,
      icono: d.weather[0].icon,
      viento: Math.round(d.wind.speed * 3.6),
      visibilidad: Math.round((d.visibility || 10000) / 1000),
      ciudad: d.name,
      timestamp: new Date().toISOString(),
    };
    cacheTimestamp = Date.now();
    return climaCache;
  } catch (err) {
    logger.error('Error OpenWeather:', err.message);
    return null;
  }
}

async function getPronostico() {
  try {
    const res = await axios.get('https://api.openweathermap.org/data/2.5/forecast', {
      params: {
        lat: process.env.OPENWEATHER_LAT || 30.7162,
        lon: process.env.OPENWEATHER_LON || -112.1544,
        appid: process.env.OPENWEATHER_API_KEY,
        units: 'metric',
        lang: 'es',
        cnt: 24,
      },
    });

    const dias = {};
    res.data.list.forEach(item => {
      const fecha = item.dt_txt.split(' ')[0];
      if (!dias[fecha]) {
        dias[fecha] = {
          fecha,
          descripcion: item.weather[0].description,
          icono: item.weather[0].icon,
          maxima: Math.round(item.main.temp_max),
          minima: Math.round(item.main.temp_min),
        };
      } else {
        if (item.main.temp_max > dias[fecha].maxima) dias[fecha].maxima = Math.round(item.main.temp_max);
        if (item.main.temp_min < dias[fecha].minima) dias[fecha].minima = Math.round(item.main.temp_min);
      }
    });

    return Object.values(dias).slice(0, 5);
  } catch (err) {
    logger.error('Error pronóstico:', err.message);
    return [];
  }
}

module.exports = { getClima, getPronostico };
