const express = require('express');
const router = express.Router();
const UsuarioController = require('../controllers/usuario.controller');
const verificarToken = require('../middlewares/authMiddleware').verificarToken;
const { requerirEmailVerificado } = require('../middlewares/verificacionMiddleware');

// ============================================
// RUTAS PÚBLICAS
// ============================================
router.get('/verificar', UsuarioController.verificarUsuarios);
router.post('/registrar', UsuarioController.registrar);
router.post('/login', UsuarioController.login);
// Obtener perfil público de otro usuario
router.get('/:idUsuario/perfil', verificarToken, UsuarioController.obtenerPerfilPublico);

// ============================================
// RUTAS DE RECUPERACIÓN DE CONTRASEÑA (NUEVAS) 
// ============================================
router.post('/recuperar-password', UsuarioController.solicitarRecuperacionPassword);
router.post('/verificar-recuperacion', UsuarioController.verificarCodigoRecuperacion);
router.post('/establecer-nueva-password', UsuarioController.establecerNuevaPassword);
// ============================================
// RUTAS DE VERIFICACIÓN DE EMAIL (NUEVAS) 
// ============================================
router.post('/verificar-email', UsuarioController.verificarEmail);
router.post('/reenviar-codigo', UsuarioController.reenviarCodigo);

// Después de las rutas públicas y antes de las protegidas
router.post('/validar-password', verificarToken, UsuarioController.validarPasswordActual);
// Después de /validar-password
router.post('/solicitar-codigo-cambio-password', verificarToken, UsuarioController.solicitarCodigoCambioPassword);
// ============================================
// RUTAS PROTEGIDAS
// ============================================
router.get('/perfil', verificarToken, UsuarioController.obtenerPerfil);
router.put('/perfil', verificarToken, UsuarioController.actualizarPerfil);
router.put('/nombre', verificarToken, UsuarioController.actualizarNombre);

// SOLO ESTA RUTA CON MIDDLEWARE DE VERIFICACIÓN
router.put('/password', verificarToken, requerirEmailVerificado, UsuarioController.cambiarPassword);

// ============================================
// RUTA DE DESARROLLO 
// ============================================
if (process.env.NODE_ENV === 'development') {
    router.post('/test-email', UsuarioController.testEmail);
}

module.exports = router;