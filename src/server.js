require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const pool = require('./config/config');

const tareaRoutes = require('./routes/tareas.routes');
const listaRoutes = require('./routes/lista.routes');
const categoriaRoutes = require('./routes/categoria.routes');
const usuarioRoutes = require('./routes/usuario.routes');
const compartirRoutes = require('./routes/compartir.routes');
const notaRoutes = require('./routes/notas.routes')
//  AGREGAR: Importar rutas de notificaciones
const notificacionRoutes = require('./routes/compartir/notificacion.routes');
const verificarToken = require('./middlewares/authMiddleware').verificarToken;

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// Servir archivos estáticos del frontend
app.use(express.static('../Frontend2'));

// Middleware para logging de peticiones
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path} - ${new Date().toLocaleString()}`);
    next();
});

// Health check optimizado para Render
app.get('/healthz', async (req, res) => {
    try {
        // Timeout de 3 segundos para la verificación de BD
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 3000)
        );
        
        const checkPromise = (async () => {
            const connection = await pool.getConnection();
            await connection.ping();
            connection.release();
        })();
        
        await Promise.race([checkPromise, timeoutPromise]);
        
        res.status(200).json({ status: 'healthy' });
    } catch (error) {
        console.error('Health check failed:', error);
        res.status(503).json({ 
            status: 'unhealthy',
            error: error.message 
        });
    }
});

// Rutas de API
app.use('/api/tareas', verificarToken, tareaRoutes);
app.use('/api/listas', verificarToken, listaRoutes);
app.use('/api/categorias', verificarToken, categoriaRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/compartir', verificarToken, compartirRoutes);
app.use('/api/notas', notaRoutes);
// ✅ AGREGAR: Rutas específicas para notificaciones
app.use('/api/compartir/notificaciones', notificacionRoutes);

// Ruta raíz - sirve el index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../Frontend2', 'login.html'));
});

// Manejo de rutas no encontradas
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Ruta no encontrada'
    });
});

// Manejo de errores global
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📋 API de Tareas disponible en http://localhost:${PORT}/api/tareas`);
    console.log(`🔔 API de Notificaciones disponible en http://localhost:${PORT}/api/compartir/notificaciones`);
});

module.exports = app;