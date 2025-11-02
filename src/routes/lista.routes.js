const express = require('express');
const router = express.Router();
const listaController = require('../controllers/lista.controller');

// Rutas principales de listas
router.post('/', listaController.crearLista);
router.get('/', listaController.obtenerListas);
router.get('/:id', listaController.obtenerListaPorId);
router.put('/:id', listaController.actualizarLista);
router.delete('/:id', listaController.eliminarLista);

// Rutas específicas
router.get('/:id/tareas', listaController.obtenerConTareas);
router.get('/:id/estadisticas', listaController.obtenerEstadisticas);
router.get('/categoria/:idCategoria', listaController.obtenerPorCategoria);

module.exports = router;