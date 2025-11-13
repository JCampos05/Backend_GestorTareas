const express = require('express');
const router = express.Router();
const tareaController = require('../controllers/tarea.controller');
const authMiddleware = require('../middlewares/authMiddleware');
const { verificarPermisoTarea, puedeCrearTareaEnLista } = require('../middlewares/permisosMiddleware');

router.post('/', authMiddleware, puedeCrearTareaEnLista, tareaController.crearTarea);
router.get('/', authMiddleware, tareaController.obtenerTareas);
router.get('/filtros/vencidas', authMiddleware, tareaController.obtenerVencidas);
router.get('/filtros/mi-dia', authMiddleware, tareaController.obtenerMiDia);
router.get('/estado/:estado', authMiddleware, tareaController.obtenerPorEstado);
router.get('/prioridad/:prioridad', authMiddleware, tareaController.obtenerPorPrioridad);
router.get('/lista/:idLista', authMiddleware, tareaController.obtenerPorLista);

// TEST: Sin middleware de permisos
router.patch('/:id/estado', (req, res, next) => {
  console.log('🎯 RUTA /:id/estado ALCANZADA');
  console.log('📦 Body:', req.body);
  console.log('🆔 ID:', req.params.id);
  next();
}, authMiddleware, tareaController.cambiarEstado);

router.patch('/:id/mi-dia', authMiddleware, verificarPermisoTarea('editar'), tareaController.alternarMiDia);

router.get('/:id', authMiddleware, verificarPermisoTarea('ver'), tareaController.obtenerTareaPorId);
router.put('/:id', authMiddleware, verificarPermisoTarea('editar'), tareaController.actualizarTarea);
router.delete('/:id', authMiddleware, verificarPermisoTarea('eliminar'), tareaController.eliminarTarea);

module.exports = router;