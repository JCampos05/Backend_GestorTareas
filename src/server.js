require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');

const pool = require('./config/config');
const { initializeSocket } = require('./socket/socket.config');

const tareaRoutes = require('./routes/tareas.routes');
const listaRoutes = require('./routes/lista.routes');
const categoriaRoutes = require('./routes/categoria.routes');
const usuarioRoutes = require('./routes/usuario.routes');
const compartirRoutes = require('./routes/compartir.routes');
const notaRoutes = require('./routes/notas.routes');
const notificacionRoutes = require('./routes/compartir/notificacion.routes');
const chatRoutes = require('./routes/chat.routes');
const verificarToken = require('./middlewares/authMiddleware').verificarToken;

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ CRÍTICO: Crear servidor HTTP primero
const server = http.createServer(app);

// Middlewares
app.use(cors({
    origin: ['http://localhost:4200', 'http://localhost:4300'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.static('../Frontend2'));

// Middleware para logging
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path} - ${new Date().toLocaleString()}`);
    next();
});

// Health check
app.get('/healthz', async (req, res) => {
    try {
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
app.use('/api/compartir/notificaciones', notificacionRoutes);
app.use('/api/chat', verificarToken, chatRoutes);

// Ruta raíz
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../Frontend2', 'login.html'));
});

// 404
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Ruta no encontrada'
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// ✅ INICIALIZAR SOCKET.IO *ANTES* DE LEVANTAR EL SERVIDOR
initializeSocket(server);

// ✅ USAR `server.listen()` EN LUGAR DE `app.listen()`
server.listen(PORT, () => {
    console.log(`🚀 Servidor HTTP corriendo en http://localhost:${PORT}`);
    console.log(`📋 API de Tareas: http://localhost:${PORT}/api/tareas`);
    console.log(`🔔 API de Notificaciones: http://localhost:${PORT}/api/compartir/notificaciones`);
    console.log(`💬 WebSocket Chat: ws://localhost:${PORT}/chat`);
    console.log(`📡 Socket.IO Namespace: http://localhost:${PORT}/chat\n`);
});

// Manejo de errores del servidor
server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`\n❌ ERROR: El puerto ${PORT} ya está en uso`);
        console.error('   Intenta cerrar otras aplicaciones o usar otro puerto\n');
        process.exit(1);
    } else {
        console.error('\n❌ Error del servidor:', error.message, '\n');
        process.exit(1);
    }
});

// Cierre graceful
const gracefulShutdown = () => {
    console.log('\n👋 Cerrando servidor...');
    server.close(() => {
        console.log('✅ Servidor HTTP cerrado');
        pool.end(() => {
            console.log('✅ Pool MySQL cerrado');
            process.exit(0);
        });
    });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

module.exports = app;