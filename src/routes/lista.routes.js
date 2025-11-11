const express = require('express');
const router = express.Router();
const listaController = require('../controllers/lista.controller');
const verificarToken = require('../middlewares/authMiddleware').verificarToken;
const { verificarPermisoLista } = require('../middlewares/permisosMiddleware');

// Aplicar middleware de autenticación a todas las rutas
router.use(verificarToken);

// ============================================
// RUTAS DE LISTAS (CON PERMISOS COMPARTIDOS)
// ============================================

// Crear lista (solo usuario autenticado)
router.post('/', listaController.crearLista);

// Obtener todas las listas del usuario (propias y compartidas)
router.get('/', listaController.obtenerListas);

// Rutas específicas sin ID (deben ir antes de /:id)
router.get('/sin-categoria', listaController.obtenerSinCategoria);
router.get('/importantes', listaController.obtenerImportantes);

// Obtener listas por categoría
router.get('/categoria/:idCategoria', listaController.obtenerPorCategoria);

// Obtener tareas de una lista (con verificación de permisos)
router.get(
    '/:id/tareas',
    verificarPermisoLista('ver'),
    listaController.obtenerConTareas
);

// Obtener estadísticas de una lista
router.get(
    '/:id/estadisticas',
    verificarPermisoLista('ver'),
    listaController.obtenerEstadisticas
);

// Obtener una lista específica (con verificación de permisos)
router.get(
    '/:id',
    verificarPermisoLista('ver'),
    listaController.obtenerListaPorId
);

// Actualizar lista (requiere permiso de editar)
router.put(
    '/:id',
    verificarPermisoLista('editar'),
    listaController.actualizarLista
);

// Eliminar lista (requiere permiso de eliminar)
router.delete(
    '/:id',
    verificarPermisoLista('eliminar'),
    listaController.eliminarLista
);

module.exports = router;