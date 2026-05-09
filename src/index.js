require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { logger } = require('./utils/logger');

const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const climaRoutes = require('./routes/clima');
const noticiasRoutes = require('./routes/noticias');
const eventosRoutes = require('./routes/eventos');
const reportesRoutes = require('./routes/reportes');
const deportesRoutes = require('./routes/deportes');
const negociosRoutes = require('./routes/negocios');
const adminRoutes = require('./routes/admin');
const adminNegociosRoutes = require('./routes/adminNegocios');
const publicidadRoutes = require('./routes/publicidad');
const solicitudesNegociosRoutes = require('./routes/solicitudesNegocios');
const sugerenciasRoutes = require('./routes/sugerencias');

const app = express();
const PORT = process.env.PORT || 4000;

app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({
  origin: function(origin, callback) {
    const allowed = ['https://caborca.app', 'https://www.caborca.app', 'http://localhost:3000'];
    if (!origin || allowed.includes(origin)) { callback(null, true); }
    else { callback(new Error('Not allowed by CORS')); }
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

const globalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false });
const chatLimiter = rateLimit({ windowMs: 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });

app.use('/api', globalLimiter);
app.use('/api/chat', chatLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/clima', climaRoutes);
app.use('/api/noticias', noticiasRoutes);
app.use('/api/eventos', eventosRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/deportes', deportesRoutes);
app.use('/api/negocios', negociosRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/negocios', adminNegociosRoutes);
app.use('/api/publicidad', publicidadRoutes);
app.use('/api/solicitudes-negocios', solicitudesNegociosRoutes);
app.use('/api/sugerencias', sugerenciasRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Caborca IA API', timestamp: new Date().toISOString() });
});

app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(PORT, () => {
  logger.info(`Caborca IA Backend corriendo en puerto ${PORT}`);
});
