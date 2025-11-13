// src/routes/compartir/notificacion.routes.js
const express = require('express');
const router = express.Router();
const notificacionController = require('../../controllers/compartir/notificacion.controller');
const authMiddleware = require('../../middlewares/authMiddleware');

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Obtener notificaciones del usuario
router.get('/', notificacionController.obtenerNotificaciones);

// Marcar notificación como leída
router.put('/:id/leer', notificacionController.marcarComoLeida);

// Marcar todas como leídas  
router.put('/leer-todas', notificacionController.marcarTodasLeidas);

// Aceptar invitación
router.post('/:id/aceptar', notificacionController.aceptarInvitacion);

// Rechazar invitación
router.post('/:id/rechazar', notificacionController.rechazarInvitacion);

module.exports = router;