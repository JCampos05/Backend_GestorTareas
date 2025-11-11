const express = require('express');
const router = express.Router();
const compartirController = require('../controllers/compartir.controller');
const authMiddleware = require('../middlewares/authMiddleware');
const { esAdminCategoria, esAdminLista } = require('../middlewares/permisosMiddleware');

// ============================================
// RUTAS DE CATEGORÍAS COMPARTIDAS
// ============================================

// Generar clave para compartir categoría
router.post(
    '/categoria/:idCategoria/generar-clave',
    authMiddleware,
    esAdminCategoria,
    compartirController.generarClaveCategoria
);

// Unirse a categoría con clave
router.post(
    '/categoria/unirse',
    authMiddleware,
    compartirController.unirseCategoriaPorClave
);

// Invitar usuario por email a categoría
router.post(
    '/categoria/:idCategoria/invitar',
    authMiddleware,
    esAdminCategoria,
    compartirController.invitarUsuarioCategoria
);

// Listar usuarios con acceso a categoría
router.get(
    '/categoria/:idCategoria/usuarios',
    authMiddleware,
    esAdminCategoria,
    compartirController.listarUsuariosCategoria
);

// Modificar rol de usuario en categoría
router.put(
    '/categoria/:idCategoria/usuario/:idUsuarioModificar/rol',
    authMiddleware,
    esAdminCategoria,
    compartirController.modificarRolCategoria
);

// Revocar acceso a categoría
router.delete(
    '/categoria/:idCategoria/usuario/:idUsuarioRevocar',
    authMiddleware,
    esAdminCategoria,
    compartirController.revocarAccesoCategoria
);

// Salir de una categoría compartida
router.post(
    '/categoria/:idCategoria/salir',
    authMiddleware,
    compartirController.salirDeCategoria
);

// ============================================
// RUTAS DE LISTAS COMPARTIDAS
// ============================================

// Generar clave para compartir lista
router.post(
    '/lista/:idLista/generar-clave',
    authMiddleware,
    esAdminLista,
    compartirController.generarClaveLista
);

// Unirse a lista con clave
router.post(
    '/lista/unirse',
    authMiddleware,
    compartirController.unirseListaPorClave
);

// Invitar usuario por email a lista
router.post(
    '/lista/:idLista/invitar',
    authMiddleware,
    esAdminLista,
    compartirController.invitarUsuarioLista
);

// Listar usuarios con acceso a lista
router.get(
    '/lista/:idLista/usuarios',
    authMiddleware,
    esAdminLista,
    compartirController.listarUsuariosLista
);

// Modificar rol de usuario en lista
router.put(
    '/lista/:idLista/usuario/:idUsuarioModificar/rol',
    authMiddleware,
    esAdminLista,
    compartirController.modificarRolLista
);

// Revocar acceso a lista
router.delete(
    '/lista/:idLista/usuario/:idUsuarioRevocar',
    authMiddleware,
    esAdminLista,
    compartirController.revocarAccesoLista
);

// Salir de una lista compartida
router.post(
    '/lista/:idLista/salir',
    authMiddleware,
    compartirController.salirDeLista
);

// ============================================
// RUTAS DE INVITACIONES
// ============================================

// Obtener invitaciones pendientes del usuario
router.get(
    '/invitaciones/pendientes',
    authMiddleware,
    compartirController.obtenerInvitacionesPendientes
);

// Aceptar invitación
router.post(
    '/invitaciones/:token/aceptar',
    authMiddleware,
    compartirController.aceptarInvitacion
);

// Rechazar invitación
router.post(
    '/invitaciones/:token/rechazar',
    authMiddleware,
    compartirController.rechazarInvitacion
);

// ============================================
// RUTAS DE CONSULTA
// ============================================

// Obtener todas las categorías compartidas del usuario
router.get(
    '/mis-categorias-compartidas',
    authMiddleware,
    compartirController.obtenerCategoriasCompartidas
);

// Obtener todas las listas compartidas del usuario
router.get(
    '/mis-listas-compartidas',
    authMiddleware,
    compartirController.obtenerListasCompartidas
);

// Obtener información de compartidos de una categoría específica
router.get(
    '/categoria/:idCategoria/info-compartidos',
    authMiddleware,
    compartirController.infoCompartidosCategoria
);

// Obtener información de compartidos de una lista específica
router.get(
    '/lista/:idLista/info-compartidos',
    authMiddleware,
    compartirController.infoCompartidosLista
);

module.exports = router;