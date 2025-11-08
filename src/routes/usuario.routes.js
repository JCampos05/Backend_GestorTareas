const express = require('express');
const router = express.Router();
const UsuarioController = require('../controllers/usuario.controller');
const verificarToken = require('../middlewares/authMiddleware').verificarToken;

router.get('/verificar', UsuarioController.verificarUsuarios);
router.post('/registrar', UsuarioController.registrar);
router.post('/login', UsuarioController.login);
router.get('/perfil', verificarToken, UsuarioController.obtenerPerfil);

module.exports = router;