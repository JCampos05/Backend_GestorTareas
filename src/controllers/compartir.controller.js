// src/controllers/compartir.controller.js
const db = require('../config/config');
const { 
    CategoriaCompartida, 
    ListaCompartida, 
    Invitacion, 
    AuditoriaCompartidos 
} = require('../models/categoriaCompartida');

const { 
    generarClaveCompartir, 
    validarClaveCompartir,
    generarTokenInvitacion,
    esRolValido,
    calcularFechaExpiracion,
    normalizarEmail
} = require('../utils/compartir.utils');

// ============================================
// CATEGORÍAS COMPARTIDAS
// ============================================

/**
 * Generar clave para compartir categoría
 */
exports.generarClaveCategoria = async (req, res) => {
    try {
        const { idCategoria } = req.params;
        const idUsuario = req.usuario.idUsuario;

        // Verificar que la categoría existe y es del usuario
        const [catRows] = await db.execute(
            'SELECT * FROM categoria WHERE idCategoria = ? AND idUsuario = ?',
            [idCategoria, idUsuario]
        );
        
        if (catRows.length === 0) {
            return res.status(404).json({ error: 'Categoría no encontrada' });
        }

        // Generar clave única
        let clave = generarClaveCompartir();
        let intentos = 0;
        
        while (intentos < 10) {
            const [existe] = await db.execute(
                'SELECT idCategoria FROM categoria WHERE claveCompartir = ?',
                [clave]
            );
            if (existe.length === 0) break;
            clave = generarClaveCompartir();
            intentos++;
        }

        // Actualizar categoría
        await db.execute(
            `UPDATE categoria 
             SET claveCompartir = ?, tipoPrivacidad = 'compartida', compartible = TRUE 
             WHERE idCategoria = ?`,
            [clave, idCategoria]
        );

        // Registrar en auditoría
        await AuditoriaCompartidos.registrar({
            tipo: 'categoria',
            idEntidad: idCategoria,
            idUsuario,
            accion: 'generar_clave',
            detalles: { clave }
        });

        res.json({
            mensaje: 'Clave generada exitosamente',
            clave,
            categoria: {
                idCategoria: catRows[0].idCategoria,
                nombre: catRows[0].nombre,
                claveCompartir: clave
            }
        });
    } catch (error) {
        console.error('Error al generar clave:', error);
        res.status(500).json({ error: 'Error al generar clave de compartir' });
    }
};

/**
 * Unirse a categoría mediante clave
 */
exports.unirseCategoriaPorClave = async (req, res) => {
    try {
        const { clave } = req.body;
        const idUsuario = req.usuario.idUsuario;

        if (!validarClaveCompartir(clave)) {
            return res.status(400).json({ error: 'Formato de clave inválido' });
        }

        // Buscar categoría con esa clave
        const [catRows] = await db.execute(
            `SELECT c.*, u.nombre as nombrePropietario, u.email as emailPropietario
             FROM categoria c
             JOIN usuario u ON c.idUsuario = u.idUsuario
             WHERE c.claveCompartir = ?`,
            [clave]
        );

        if (catRows.length === 0) {
            return res.status(404).json({ error: 'Categoría no encontrada con esa clave' });
        }

        const categoria = catRows[0];

        if (categoria.idUsuario === idUsuario) {
            return res.status(400).json({ error: 'Ya eres el propietario de esta categoría' });
        }

        // Verificar si ya está compartida
        const yaCompartida = await CategoriaCompartida.obtener(categoria.idCategoria, idUsuario);

        if (yaCompartida) {
            if (yaCompartida.activo) {
                return res.status(400).json({ error: 'Ya tienes acceso a esta categoría' });
            }
            // Reactivar
            await CategoriaCompartida.reactivar(categoria.idCategoria, idUsuario);
        } else {
            // Crear nuevo acceso
            await CategoriaCompartida.crear({
                idCategoria: categoria.idCategoria,
                idUsuario,
                rol: 'colaborador',
                compartidoPor: categoria.idUsuario,
                aceptado: true,
                activo: true
            });
        }

        await AuditoriaCompartidos.registrar({
            tipo: 'categoria',
            idEntidad: categoria.idCategoria,
            idUsuario,
            accion: 'unirse_por_clave',
            detalles: { clave }
        });

        res.json({
            mensaje: 'Te has unido exitosamente a la categoría',
            categoria: {
                idCategoria: categoria.idCategoria,
                nombre: categoria.nombre,
                propietario: {
                    nombre: categoria.nombrePropietario,
                    email: categoria.emailPropietario
                },
                rol: 'colaborador'
            }
        });
    } catch (error) {
        console.error('Error al unirse por clave:', error);
        res.status(500).json({ error: 'Error al unirse a la categoría' });
    }
};

/**
 * Invitar usuario por email a categoría
 */
exports.invitarUsuarioCategoria = async (req, res) => {
    try {
        const { idCategoria } = req.params;
        const { email, rol = 'colaborador' } = req.body;
        const idUsuario = req.usuario.idUsuario;

        if (!email) {
            return res.status(400).json({ error: 'Email es requerido' });
        }

        if (!esRolValido(rol)) {
            return res.status(400).json({ error: 'Rol inválido' });
        }

        const [catRows] = await db.execute(
            'SELECT * FROM categoria WHERE idCategoria = ?',
            [idCategoria]
        );
        
        if (catRows.length === 0) {
            return res.status(404).json({ error: 'Categoría no encontrada' });
        }

        const emailNormalizado = normalizarEmail(email);

        // Buscar usuario
        const [usuarios] = await db.execute(
            'SELECT * FROM usuario WHERE email = ?',
            [emailNormalizado]
        );

        if (usuarios.length > 0) {
            const usuarioInvitado = usuarios[0];

            if (usuarioInvitado.idUsuario === catRows[0].idUsuario) {
                return res.status(400).json({ error: 'No puedes invitar al propietario' });
            }

            const yaCompartida = await CategoriaCompartida.obtener(idCategoria, usuarioInvitado.idUsuario);

            if (yaCompartida && yaCompartida.activo) {
                return res.status(400).json({ error: 'El usuario ya tiene acceso' });
            }

            if (yaCompartida) {
                await db.execute(
                    `UPDATE categoria_compartida 
                     SET activo = TRUE, aceptado = TRUE, rol = ?, compartidoPor = ?
                     WHERE idCategoria = ? AND idUsuario = ?`,
                    [rol, idUsuario, idCategoria, usuarioInvitado.idUsuario]
                );
            } else {
                await CategoriaCompartida.crear({
                    idCategoria,
                    idUsuario: usuarioInvitado.idUsuario,
                    rol,
                    compartidoPor: idUsuario,
                    aceptado: true,
                    activo: true
                });
            }

            await AuditoriaCompartidos.registrar({
                tipo: 'categoria',
                idEntidad: idCategoria,
                idUsuario,
                accion: 'invitar_usuario_registrado',
                detalles: { emailInvitado: emailNormalizado, rol }
            });

            return res.json({
                mensaje: 'Usuario agregado exitosamente',
                usuario: {
                    idUsuario: usuarioInvitado.idUsuario,
                    nombre: usuarioInvitado.nombre,
                    email: usuarioInvitado.email,
                    rol
                }
            });
        }

        // Usuario no registrado - crear invitación
        const token = generarTokenInvitacion();
        const fechaExpiracion = calcularFechaExpiracion(7);

        await Invitacion.crear({
            tipo: 'categoria',
            idEntidad: idCategoria,
            emailInvitado: emailNormalizado,
            rol,
            token,
            invitadoPor: idUsuario,
            fechaExpiracion
        });

        await AuditoriaCompartidos.registrar({
            tipo: 'categoria',
            idEntidad: idCategoria,
            idUsuario,
            accion: 'enviar_invitacion',
            detalles: { emailInvitado: emailNormalizado, rol, token }
        });

        res.json({
            mensaje: 'Invitación enviada exitosamente',
            invitacion: {
                email: emailNormalizado,
                rol,
                token,
                fechaExpiracion
            }
        });
    } catch (error) {
        console.error('Error al invitar usuario:', error);
        res.status(500).json({ error: 'Error al enviar invitación' });
    }
};

/**
 * Listar usuarios con acceso a la categoría
 */
exports.listarUsuariosCategoria = async (req, res) => {
    try {
        const { idCategoria } = req.params;
        const usuarios = await CategoriaCompartida.listarPorCategoria(idCategoria);

        res.json({
            usuarios: usuarios.map(u => ({
                idUsuario: u.idUsuario,
                nombre: u.nombre,
                email: u.email,
                rol: u.rol,
                esCreador: u.esCreador,
                aceptado: u.aceptado,
                fechaCompartido: u.fechaCompartido
            }))
        });
    } catch (error) {
        console.error('Error al listar usuarios:', error);
        res.status(500).json({ error: 'Error al obtener usuarios' });
    }
};

/**
 * Modificar rol de usuario en categoría
 */
exports.modificarRolCategoria = async (req, res) => {
    try {
        const { idCategoria, idUsuarioModificar } = req.params;
        const { nuevoRol } = req.body;
        const idUsuario = req.usuario.idUsuario;

        if (!esRolValido(nuevoRol)) {
            return res.status(400).json({ error: 'Rol inválido' });
        }

        const actualizado = await CategoriaCompartida.actualizarRol(
            idCategoria,
            idUsuarioModificar,
            nuevoRol
        );

        if (!actualizado) {
            return res.status(404).json({ 
                error: 'Usuario no encontrado o no se puede modificar (es creador)' 
            });
        }

        await AuditoriaCompartidos.registrar({
            tipo: 'categoria',
            idEntidad: idCategoria,
            idUsuario,
            accion: 'modificar_rol',
            detalles: { idUsuarioModificado: idUsuarioModificar, nuevoRol }
        });

        res.json({
            mensaje: 'Rol modificado exitosamente',
            usuario: {
                idUsuario: idUsuarioModificar,
                nuevoRol
            }
        });
    } catch (error) {
        console.error('Error al modificar rol:', error);
        res.status(500).json({ error: 'Error al modificar rol' });
    }
};

/**
 * Revocar acceso a categoría
 */
exports.revocarAccesoCategoria = async (req, res) => {
    try {
        const { idCategoria, idUsuarioRevocar } = req.params;
        const idUsuario = req.usuario.idUsuario;

        const revocado = await CategoriaCompartida.revocar(idCategoria, idUsuarioRevocar);

        if (!revocado) {
            return res.status(404).json({ 
                error: 'Usuario no encontrado o no se puede revocar (es creador)' 
            });
        }

        await AuditoriaCompartidos.registrar({
            tipo: 'categoria',
            idEntidad: idCategoria,
            idUsuario,
            accion: 'revocar_acceso',
            detalles: { idUsuarioRevocado: idUsuarioRevocar }
        });

        res.json({ mensaje: 'Acceso revocado exitosamente' });
    } catch (error) {
        console.error('Error al revocar acceso:', error);
        res.status(500).json({ error: 'Error al revocar acceso' });
    }
};

/**
 * Salir de una categoría compartida
 */
exports.salirDeCategoria = async (req, res) => {
    try {
        const { idCategoria } = req.params;
        const idUsuario = req.usuario.idUsuario;

        const compartido = await CategoriaCompartida.obtener(idCategoria, idUsuario);

        if (!compartido) {
            return res.status(404).json({ error: 'No tienes acceso a esta categoría' });
        }

        if (compartido.esCreador) {
            return res.status(403).json({ 
                error: 'El creador no puede salir de la categoría' 
            });
        }

        await CategoriaCompartida.revocar(idCategoria, idUsuario);

        await AuditoriaCompartidos.registrar({
            tipo: 'categoria',
            idEntidad: idCategoria,
            idUsuario,
            accion: 'salir',
            detalles: {}
        });

        res.json({ mensaje: 'Has salido de la categoría exitosamente' });
    } catch (error) {
        console.error('Error al salir:', error);
        res.status(500).json({ error: 'Error al salir de la categoría' });
    }
};

// ============================================
// LISTAS COMPARTIDAS
// ============================================

/**
 * Generar clave para compartir lista
 */
exports.generarClaveLista = async (req, res) => {
    try {
        const { idLista } = req.params;
        const idUsuario = req.usuario.idUsuario;

        const [rows] = await db.execute(
            'SELECT * FROM lista WHERE idLista = ? AND idUsuario = ?',
            [idLista, idUsuario]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Lista no encontrada' });
        }

        let clave = generarClaveCompartir();
        let intentos = 0;
        
        while (intentos < 10) {
            const [existe] = await db.execute(
                'SELECT idLista FROM lista WHERE claveCompartir = ?',
                [clave]
            );
            if (existe.length === 0) break;
            clave = generarClaveCompartir();
            intentos++;
        }

        await db.execute(
            'UPDATE lista SET claveCompartir = ?, compartible = TRUE WHERE idLista = ?',
            [clave, idLista]
        );

        await AuditoriaCompartidos.registrar({
            tipo: 'lista',
            idEntidad: idLista,
            idUsuario,
            accion: 'generar_clave',
            detalles: { clave }
        });

        res.json({
            mensaje: 'Clave generada exitosamente',
            clave,
            lista: {
                idLista: rows[0].idLista,
                nombre: rows[0].nombre,
                claveCompartir: clave
            }
        });
    } catch (error) {
        console.error('Error al generar clave:', error);
        res.status(500).json({ error: 'Error al generar clave de compartir' });
    }
};

/**
 * Unirse a lista mediante clave
 */
exports.unirseListaPorClave = async (req, res) => {
    try {
        const { clave } = req.body;
        const idUsuario = req.usuario.idUsuario;

        if (!validarClaveCompartir(clave)) {
            return res.status(400).json({ error: 'Formato de clave inválido' });
        }

        const [rows] = await db.execute(
            `SELECT l.*, u.nombre as nombrePropietario, u.email as emailPropietario
             FROM lista l
             JOIN usuario u ON l.idUsuario = u.idUsuario
             WHERE l.claveCompartir = ?`,
            [clave]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Lista no encontrada con esa clave' });
        }

        const lista = rows[0];

        if (lista.idUsuario === idUsuario) {
            return res.status(400).json({ error: 'Ya eres el propietario de esta lista' });
        }

        const yaCompartida = await ListaCompartida.obtener(lista.idLista, idUsuario);

        if (yaCompartida && yaCompartida.activo) {
            return res.status(400).json({ error: 'Ya tienes acceso a esta lista' });
        }

        if (yaCompartida) {
            await db.execute(
                `UPDATE lista_compartida 
                 SET activo = TRUE, aceptado = TRUE, fechaCompartido = CURRENT_TIMESTAMP
                 WHERE idLista = ? AND idUsuario = ?`,
                [lista.idLista, idUsuario]
            );
        } else {
            await ListaCompartida.crear({
                idLista: lista.idLista,
                idUsuario,
                rol: 'colaborador',
                compartidoPor: lista.idUsuario,
                aceptado: true,
                activo: true
            });
        }

        await AuditoriaCompartidos.registrar({
            tipo: 'lista',
            idEntidad: lista.idLista,
            idUsuario,
            accion: 'unirse_por_clave',
            detalles: { clave }
        });

        res.json({
            mensaje: 'Te has unido exitosamente a la lista',
            lista: {
                idLista: lista.idLista,
                nombre: lista.nombre,
                propietario: {
                    nombre: lista.nombrePropietario,
                    email: lista.emailPropietario
                },
                rol: 'colaborador'
            }
        });
    } catch (error) {
        console.error('Error al unirse por clave:', error);
        res.status(500).json({ error: 'Error al unirse a la lista' });
    }
};

// ============================================
// MÉTODOS ADICIONALES PARA LISTAS
// ============================================

/**
 * Invitar usuario a lista
 */
exports.invitarUsuarioLista = async (req, res) => {
    try {
        const { idLista } = req.params;
        const { email, rol = 'colaborador' } = req.body;
        const idUsuario = req.usuario.idUsuario;

        if (!email || !esRolValido(rol)) {
            return res.status(400).json({ error: 'Datos inválidos' });
        }

        const [rows] = await db.execute('SELECT * FROM lista WHERE idLista = ?', [idLista]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Lista no encontrada' });
        }

        const emailNormalizado = normalizarEmail(email);
        const [usuarios] = await db.execute('SELECT * FROM usuario WHERE email = ?', [emailNormalizado]);

        if (usuarios.length > 0) {
            const usuarioInvitado = usuarios[0];

            if (usuarioInvitado.idUsuario === rows[0].idUsuario) {
                return res.status(400).json({ error: 'No puedes invitar al propietario' });
            }

            const yaCompartida = await ListaCompartida.obtener(idLista, usuarioInvitado.idUsuario);

            if (yaCompartida && yaCompartida.activo) {
                return res.status(400).json({ error: 'El usuario ya tiene acceso' });
            }

            if (yaCompartida) {
                await db.execute(
                    `UPDATE lista_compartida SET activo = TRUE, aceptado = TRUE, rol = ?, compartidoPor = ?
                     WHERE idLista = ? AND idUsuario = ?`,
                    [rol, idUsuario, idLista, usuarioInvitado.idUsuario]
                );
            } else {
                await ListaCompartida.crear({
                    idLista,
                    idUsuario: usuarioInvitado.idUsuario,
                    rol,
                    compartidoPor: idUsuario,
                    aceptado: true,
                    activo: true
                });
            }

            await AuditoriaCompartidos.registrar({
                tipo: 'lista',
                idEntidad: idLista,
                idUsuario,
                accion: 'invitar_usuario_registrado',
                detalles: { emailInvitado: emailNormalizado, rol }
            });

            return res.json({
                mensaje: 'Usuario agregado exitosamente',
                usuario: {
                    idUsuario: usuarioInvitado.idUsuario,
                    nombre: usuarioInvitado.nombre,
                    email: usuarioInvitado.email,
                    rol
                }
            });
        }

        // Usuario no registrado
        const token = generarTokenInvitacion();
        const fechaExpiracion = calcularFechaExpiracion(7);

        await Invitacion.crear({
            tipo: 'lista',
            idEntidad: idLista,
            emailInvitado: emailNormalizado,
            rol,
            token,
            invitadoPor: idUsuario,
            fechaExpiracion
        });

        await AuditoriaCompartidos.registrar({
            tipo: 'lista',
            idEntidad: idLista,
            idUsuario,
            accion: 'enviar_invitacion',
            detalles: { emailInvitado: emailNormalizado, rol }
        });

        res.json({
            mensaje: 'Invitación enviada exitosamente',
            invitacion: { email: emailNormalizado, rol, token, fechaExpiracion }
        });
    } catch (error) {
        console.error('Error al invitar usuario:', error);
        res.status(500).json({ error: 'Error al enviar invitación' });
    }
};

/**
 * Listar usuarios con acceso a lista
 */
exports.listarUsuariosLista = async (req, res) => {
    try {
        const { idLista } = req.params;
        const usuarios = await ListaCompartida.listarPorLista(idLista);

        res.json({
            usuarios: usuarios.map(u => ({
                idUsuario: u.idUsuario,
                nombre: u.nombre,
                email: u.email,
                rol: u.rol,
                esCreador: u.esCreador,
                aceptado: u.aceptado,
                fechaCompartido: u.fechaCompartido
            }))
        });
    } catch (error) {
        console.error('Error al listar usuarios:', error);
        res.status(500).json({ error: 'Error al obtener usuarios' });
    }
};

/**
 * Modificar rol de usuario en lista
 */
exports.modificarRolLista = async (req, res) => {
    try {
        const { idLista, idUsuarioModificar } = req.params;
        const { nuevoRol } = req.body;
        const idUsuario = req.usuario.idUsuario;

        if (!esRolValido(nuevoRol)) {
            return res.status(400).json({ error: 'Rol inválido' });
        }

        const actualizado = await ListaCompartida.actualizarRol(idLista, idUsuarioModificar, nuevoRol);

        if (!actualizado) {
            return res.status(404).json({ error: 'Usuario no encontrado o es creador' });
        }

        await AuditoriaCompartidos.registrar({
            tipo: 'lista',
            idEntidad: idLista,
            idUsuario,
            accion: 'modificar_rol',
            detalles: { idUsuarioModificado: idUsuarioModificar, nuevoRol }
        });

        res.json({
            mensaje: 'Rol modificado exitosamente',
            usuario: { idUsuario: idUsuarioModificar, nuevoRol }
        });
    } catch (error) {
        console.error('Error al modificar rol:', error);
        res.status(500).json({ error: 'Error al modificar rol' });
    }
};

/**
 * Revocar acceso a lista
 */
exports.revocarAccesoLista = async (req, res) => {
    try {
        const { idLista, idUsuarioRevocar } = req.params;
        const idUsuario = req.usuario.idUsuario;

        const revocado = await ListaCompartida.revocar(idLista, idUsuarioRevocar);

        if (!revocado) {
            return res.status(404).json({ error: 'Usuario no encontrado o es creador' });
        }

        await AuditoriaCompartidos.registrar({
            tipo: 'lista',
            idEntidad: idLista,
            idUsuario,
            accion: 'revocar_acceso',
            detalles: { idUsuarioRevocado: idUsuarioRevocar }
        });

        res.json({ mensaje: 'Acceso revocado exitosamente' });
    } catch (error) {
        console.error('Error al revocar acceso:', error);
        res.status(500).json({ error: 'Error al revocar acceso' });
    }
};

/**
 * Salir de una lista compartida
 */
exports.salirDeLista = async (req, res) => {
    try {
        const { idLista } = req.params;
        const idUsuario = req.usuario.idUsuario;

        const compartido = await ListaCompartida.obtener(idLista, idUsuario);

        if (!compartido) {
            return res.status(404).json({ error: 'No tienes acceso a esta lista' });
        }

        if (compartido.esCreador) {
            return res.status(403).json({ error: 'El creador no puede salir de la lista' });
        }

        await ListaCompartida.revocar(idLista, idUsuario);

        await AuditoriaCompartidos.registrar({
            tipo: 'lista',
            idEntidad: idLista,
            idUsuario,
            accion: 'salir',
            detalles: {}
        });

        res.json({ mensaje: 'Has salido de la lista exitosamente' });
    } catch (error) {
        console.error('Error al salir:', error);
        res.status(500).json({ error: 'Error al salir de la lista' });
    }
};

// ============================================
// INVITACIONES
// ============================================

/**
 * Obtener invitaciones pendientes del usuario
 */
exports.obtenerInvitacionesPendientes = async (req, res) => {
    try {
        const email = req.usuario.email;
        const invitaciones = await Invitacion.obtenerPendientesPorEmail(email);

        res.json({
            invitaciones: invitaciones.map(inv => ({
                idInvitacion: inv.idInvitacion,
                tipo: inv.tipo,
                nombreEntidad: inv.nombreEntidad,
                rol: inv.rol,
                token: inv.token,
                invitadoPor: inv.nombreInvitador,
                fechaInvitacion: inv.fechaInvitacion,
                fechaExpiracion: inv.fechaExpiracion
            }))
        });
    } catch (error) {
        console.error('Error al obtener invitaciones:', error);
        res.status(500).json({ error: 'Error al obtener invitaciones' });
    }
};

/**
 * Aceptar invitación
 */
exports.aceptarInvitacion = async (req, res) => {
    try {
        const { token } = req.params;
        const idUsuario = req.usuario.idUsuario;
        const email = req.usuario.email;

        const invitacion = await Invitacion.obtenerPorToken(token);

        if (!invitacion) {
            return res.status(404).json({ error: 'Invitación no encontrada o expirada' });
        }

        if (invitacion.emailInvitado !== email) {
            return res.status(403).json({ error: 'Esta invitación no es para tu email' });
        }

        if (invitacion.aceptada) {
            return res.status(400).json({ error: 'Esta invitación ya fue aceptada' });
        }

        // Verificar expiración
        if (invitacion.fechaExpiracion && new Date() > new Date(invitacion.fechaExpiracion)) {
            return res.status(400).json({ error: 'Esta invitación ha expirado' });
        }

        // Agregar acceso según el tipo
        if (invitacion.tipo === 'categoria') {
            const yaExiste = await CategoriaCompartida.obtener(invitacion.idEntidad, idUsuario);
            
            if (yaExiste) {
                await CategoriaCompartida.reactivar(invitacion.idEntidad, idUsuario);
                await db.execute(
                    'UPDATE categoria_compartida SET rol = ? WHERE idCategoria = ? AND idUsuario = ?',
                    [invitacion.rol, invitacion.idEntidad, idUsuario]
                );
            } else {
                await CategoriaCompartida.crear({
                    idCategoria: invitacion.idEntidad,
                    idUsuario,
                    rol: invitacion.rol,
                    compartidoPor: invitacion.invitadoPor,
                    aceptado: true,
                    activo: true
                });
            }

            await AuditoriaCompartidos.registrar({
                tipo: 'categoria',
                idEntidad: invitacion.idEntidad,
                idUsuario,
                accion: 'aceptar_invitacion',
                detalles: { token }
            });
        } else if (invitacion.tipo === 'lista') {
            const yaExiste = await ListaCompartida.obtener(invitacion.idEntidad, idUsuario);
            
            if (yaExiste) {
                await db.execute(
                    'UPDATE lista_compartida SET activo = TRUE, aceptado = TRUE, rol = ? WHERE idLista = ? AND idUsuario = ?',
                    [invitacion.rol, invitacion.idEntidad, idUsuario]
                );
            } else {
                await ListaCompartida.crear({
                    idLista: invitacion.idEntidad,
                    idUsuario,
                    rol: invitacion.rol,
                    compartidoPor: invitacion.invitadoPor,
                    aceptado: true,
                    activo: true
                });
            }

            await AuditoriaCompartidos.registrar({
                tipo: 'lista',
                idEntidad: invitacion.idEntidad,
                idUsuario,
                accion: 'aceptar_invitacion',
                detalles: { token }
            });
        }

        // Marcar invitación como aceptada
        await Invitacion.marcarComoAceptada(token);

        res.json({
            mensaje: 'Invitación aceptada exitosamente',
            tipo: invitacion.tipo,
            idEntidad: invitacion.idEntidad,
            rol: invitacion.rol
        });
    } catch (error) {
        console.error('Error al aceptar invitación:', error);
        res.status(500).json({ error: 'Error al aceptar invitación' });
    }
};

/**
 * Rechazar invitación
 */
exports.rechazarInvitacion = async (req, res) => {
    try {
        const { token } = req.params;
        const email = req.usuario.email;

        const invitacion = await Invitacion.obtenerPorToken(token);

        if (!invitacion) {
            return res.status(404).json({ error: 'Invitación no encontrada' });
        }

        if (invitacion.emailInvitado !== email) {
            return res.status(403).json({ error: 'Esta invitación no es para tu email' });
        }

        await db.execute('UPDATE invitacion SET activa = FALSE WHERE token = ?', [token]);

        res.json({ mensaje: 'Invitación rechazada' });
    } catch (error) {
        console.error('Error al rechazar invitación:', error);
        res.status(500).json({ error: 'Error al rechazar invitación' });
    }
};

// ============================================
// CONSULTAS GENERALES
// ============================================

/**
 * Obtener todas las categorías compartidas del usuario
 */
exports.obtenerCategoriasCompartidas = async (req, res) => {
    try {
        const idUsuario = req.usuario.idUsuario;

        const query = `
            SELECT 
                c.*,
                cc.rol,
                cc.esCreador,
                cc.aceptado,
                cc.fechaCompartido,
                u.nombre as nombrePropietario,
                (c.idUsuario = ?) as esPropietario,
                COUNT(DISTINCT l.idLista) as cantidadListas
            FROM categoria_compartida cc
            JOIN categoria c ON cc.idCategoria = c.idCategoria
            JOIN usuario u ON c.idUsuario = u.idUsuario
            LEFT JOIN lista l ON c.idCategoria = l.idCategoria
            WHERE cc.idUsuario = ? AND cc.activo = TRUE
            GROUP BY c.idCategoria
            ORDER BY cc.esCreador DESC, c.nombre ASC
        `;

        const [rows] = await db.execute(query, [idUsuario, idUsuario]);

        res.json({
            categorias: rows.map(cat => ({
                idCategoria: cat.idCategoria,
                nombre: cat.nombre,
                rol: cat.rol,
                esCreador: cat.esCreador,
                esPropietario: cat.esPropietario,
                aceptado: cat.aceptado,
                fechaCompartido: cat.fechaCompartido,
                nombrePropietario: cat.nombrePropietario,
                cantidadListas: cat.cantidadListas,
                claveCompartir: cat.claveCompartir,
                tipoPrivacidad: cat.tipoPrivacidad
            }))
        });
    } catch (error) {
        console.error('Error al obtener categorías compartidas:', error);
        res.status(500).json({ error: 'Error al obtener categorías compartidas' });
    }
};

/**
 * Obtener todas las listas compartidas del usuario
 */
exports.obtenerListasCompartidas = async (req, res) => {
    try {
        const idUsuario = req.usuario.idUsuario;

        const query = `
            SELECT 
                l.*,
                lc.rol,
                lc.esCreador,
                lc.aceptado,
                lc.fechaCompartido,
                u.nombre as nombrePropietario,
                (l.idUsuario = ?) as esPropietario,
                c.nombre as nombreCategoria,
                COUNT(DISTINCT t.idTarea) as cantidadTareas
            FROM lista_compartida lc
            JOIN lista l ON lc.idLista = l.idLista
            JOIN usuario u ON l.idUsuario = u.idUsuario
            LEFT JOIN categoria c ON l.idCategoria = c.idCategoria
            LEFT JOIN tarea t ON l.idLista = t.idLista
            WHERE lc.idUsuario = ? AND lc.activo = TRUE
            GROUP BY l.idLista
            ORDER BY lc.esCreador DESC, l.nombre ASC
        `;

        const [rows] = await db.execute(query, [idUsuario, idUsuario]);

        res.json({
            listas: rows.map(lista => ({
                idLista: lista.idLista,
                nombre: lista.nombre,
                color: lista.color,
                icono: lista.icono,
                rol: lista.rol,
                esCreador: lista.esCreador,
                esPropietario: lista.esPropietario,
                aceptado: lista.aceptado,
                fechaCompartido: lista.fechaCompartido,
                nombrePropietario: lista.nombrePropietario,
                nombreCategoria: lista.nombreCategoria,
                cantidadTareas: lista.cantidadTareas,
                claveCompartir: lista.claveCompartir
            }))
        });
    } catch (error) {
        console.error('Error al obtener listas compartidas:', error);
        res.status(500).json({ error: 'Error al obtener listas compartidas' });
    }
};

/**
 * Información de compartidos de una categoría
 */
exports.infoCompartidosCategoria = async (req, res) => {
    try {
        const { idCategoria } = req.params;
        const idUsuario = req.usuario.idUsuario;

        // Verificar acceso
        const [acceso] = await db.execute(
            `SELECT c.*, cc.rol 
             FROM categoria c
             LEFT JOIN categoria_compartida cc ON c.idCategoria = cc.idCategoria AND cc.idUsuario = ?
             WHERE c.idCategoria = ? AND (c.idUsuario = ? OR (cc.activo = TRUE AND cc.aceptado = TRUE))`,
            [idUsuario, idCategoria, idUsuario]
        );

        if (acceso.length === 0) {
            return res.status(403).json({ error: 'No tienes acceso a esta categoría' });
        }

        const usuarios = await CategoriaCompartida.listarPorCategoria(idCategoria);

        res.json({
            categoria: {
                idCategoria: acceso[0].idCategoria,
                nombre: acceso[0].nombre,
                claveCompartir: acceso[0].claveCompartir,
                tipoPrivacidad: acceso[0].tipoPrivacidad,
                tuRol: acceso[0].rol || 'admin'
            },
            usuarios: usuarios.map(u => ({
                idUsuario: u.idUsuario,
                nombre: u.nombre,
                email: u.email,
                rol: u.rol,
                esCreador: u.esCreador,
                fechaCompartido: u.fechaCompartido
            })),
            totalUsuarios: usuarios.length
        });
    } catch (error) {
        console.error('Error al obtener info:', error);
        res.status(500).json({ error: 'Error al obtener información' });
    }
};

/**
 * Información de compartidos de una lista
 */
exports.infoCompartidosLista = async (req, res) => {
    try {
        const { idLista } = req.params;
        const idUsuario = req.usuario.idUsuario;

        // Verificar acceso
        const [acceso] = await db.execute(
            `SELECT l.*, lc.rol 
             FROM lista l
             LEFT JOIN lista_compartida lc ON l.idLista = lc.idLista AND lc.idUsuario = ?
             WHERE l.idLista = ? AND (l.idUsuario = ? OR (lc.activo = TRUE AND lc.aceptado = TRUE))`,
            [idUsuario, idLista, idUsuario]
        );

        if (acceso.length === 0) {
            return res.status(403).json({ error: 'No tienes acceso a esta lista' });
        }

        const usuarios = await ListaCompartida.listarPorLista(idLista);

        res.json({
            lista: {
                idLista: acceso[0].idLista,
                nombre: acceso[0].nombre,
                claveCompartir: acceso[0].claveCompartir,
                tuRol: acceso[0].rol || 'admin'
            },
            usuarios: usuarios.map(u => ({
                idUsuario: u.idUsuario,
                nombre: u.nombre,
                email: u.email,
                rol: u.rol,
                esCreador: u.esCreador,
                fechaCompartido: u.fechaCompartido
            })),
            totalUsuarios: usuarios.length
        });
    } catch (error) {
        console.error('Error al obtener info:', error);
        res.status(500).json({ error: 'Error al obtener información' });
    }
};

module.exports = exports;