const express = require('express');
const router = express.Router();
const tareaController = require('../controllers/tarea.controller');
const verificarToken = require('../middlewares/authMiddleware').verificarToken;
const { verificarPermisoTarea } = require('../middlewares/permisosMiddleware');

// Aplicar middleware de autenticación a todas las rutas
router.use(verificarToken);

// ============================================
// RUTAS DE TAREAS (CON PERMISOS COMPARTIDOS)
// ============================================

// Crear tarea (solo usuario autenticado)
router.post('/', tareaController.crearTarea);

// Obtener todas las tareas del usuario (propias y compartidas)
router.get('/', tareaController.obtenerTareas);

// Rutas específicas sin ID (deben ir antes de /:id)
router.get('/estado/:estado', tareaController.obtenerPorEstado);
router.get('/prioridad/:prioridad', tareaController.obtenerPorPrioridad);
router.get('/filtros/vencidas', tareaController.obtenerVencidas);
router.get('/filtros/mi-dia', tareaController.obtenerMiDia);

// Cambiar estado de tarea (requiere permiso de editar)
router.patch(
    '/:id/estado',
    verificarPermisoTarea('editar'),
    tareaController.cambiarEstado
);

// Alternar "Mi día" (requiere permiso de editar)
router.patch(
    '/:id/mi-dia',
    verificarPermisoTarea('editar'),
    tareaController.alternarMiDia
);

// Obtener una tarea específica (con verificación de permisos)
router.get(
    '/:id',
    verificarPermisoTarea('ver'),
    tareaController.obtenerTareaPorId
);

// Actualizar tarea (requiere permiso de editar)
router.put(
    '/:id',
    verificarPermisoTarea('editar'),
    tareaController.actualizarTarea
);

// Actualizar tarea parcialmente (requiere permiso de editar)
router.patch(
    '/:id',
    verificarPermisoTarea('editar'),
    tareaController.actualizarTarea
);

// Eliminar tarea (requiere permiso de eliminar)
router.delete(
    '/:id',
    verificarPermisoTarea('eliminar'),
    tareaController.eliminarTarea
);

module.exports = router;