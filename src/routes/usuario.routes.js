const express = require('express');
const router = express.Router();
const UsuarioController = require('../controllers/usuario.controller');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/verificar', UsuarioController.verificarUsuarios);
router.post('/registrar', UsuarioController.registrar);
router.post('/login', UsuarioController.login);
router.get('/perfil', authMiddleware, UsuarioController.obtenerPerfil);

module.exports = router;