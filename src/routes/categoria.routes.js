const express = require('express');
const router = express.Router();
const categoriaController = require('../controllers/categoria.controller');
const verificarToken = require('../middlewares/authMiddleware').verificarToken;
router.use(verificarToken);

// Rutas principales de categorías
router.post('/', categoriaController.crearCategoria);
router.get('/', categoriaController.obtenerCategorias);
router.get('/:id', categoriaController.obtenerCategoriaPorId);
router.put('/:id', categoriaController.actualizarCategoria);
router.delete('/:id', categoriaController.eliminarCategoria);

// Rutas específicas
router.get('/:id/listas', categoriaController.obtenerConListas);

module.exports = router;