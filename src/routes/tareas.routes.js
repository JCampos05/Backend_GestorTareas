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

// ✅ Sin middleware de permisos - La validación está en el modelo
router.patch('/:id/estado', authMiddleware, tareaController.cambiarEstado);
router.patch('/:id/mi-dia', authMiddleware, tareaController.alternarMiDia);

// ✅ TEMPORAL: Remover verificarPermisoTarea para que la validación la haga el modelo
router.get('/:id', authMiddleware, tareaController.obtenerTareaPorId);
router.put('/:id', authMiddleware, tareaController.actualizarTarea);
router.delete('/:id', authMiddleware, tareaController.eliminarTarea);

module.exports = router;