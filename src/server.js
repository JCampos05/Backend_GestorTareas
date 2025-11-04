require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const tareaRoutes = require('./routes/tareas.routes');
const listaRoutes = require('./routes/lista.routes');
const categoriaRoutes = require('./routes/categoria.routes');
const usuarioRoutes = require('./routes/usuario.routes');
const authMiddleware = require('./middlewares/authMiddleware');

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

// Rutas de API
app.use('/api/tareas',authMiddleware, tareaRoutes);
app.use('/api/listas',authMiddleware, listaRoutes);
app.use('/api/categorias',authMiddleware, categoriaRoutes);
app.use('/api/usuarios', usuarioRoutes);

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
    console.log(` Servidor corriendo en http://localhost:${PORT}`);
    console.log(` API de Tareas disponible en http://localhost:${PORT}/api/tareas`);
});

module.exports = app;