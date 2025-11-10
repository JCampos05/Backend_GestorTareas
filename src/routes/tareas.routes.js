const express = require('express');
const router = express.Router();
const tareaController = require('../controllers/tarea.controller');
const verificarToken = require('../middlewares/authMiddleware').verificarToken;
router.use(verificarToken);

// Rutas principales de tareas
router.post('/', tareaController.crearTarea);
router.get('/', tareaController.obtenerTareas);
router.get('/:id', tareaController.obtenerTareaPorId);
router.put('/:id', tareaController.actualizarTarea);
router.delete('/:id', tareaController.eliminarTarea);

// Rutas específicas
router.patch('/:id', tareaController.actualizarTarea);
router.patch('/:id/estado', tareaController.cambiarEstado);
router.patch('/:id/mi-dia', tareaController.alternarMiDia);
router.get('/estado/:estado', tareaController.obtenerPorEstado);
router.get('/prioridad/:prioridad', tareaController.obtenerPorPrioridad);
router.get('/filtros/vencidas', tareaController.obtenerVencidas);
router.get('/filtros/mi-dia', tareaController.obtenerMiDia);

module.exports = router;