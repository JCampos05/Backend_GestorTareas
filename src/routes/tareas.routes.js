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
router.patch('/:id/estado', tareaController.cambiarEstado);
router.get('/estado/:estado', tareaController.obtenerPorEstado);
router.get('/prioridad/:prioridad', tareaController.obtenerPorPrioridad);
router.get('/filtros/vencidas', tareaController.obtenerVencidas);

module.exports = router;