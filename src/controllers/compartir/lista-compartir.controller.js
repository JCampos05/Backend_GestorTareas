// src/controllers/compartir/lista.compartir.controller.js
const db = require('../../config/config');
const {
    ListaCompartida,
    AuditoriaCompartidos
} = require('../../models/categoriaCompartida');

const {
    generarClaveCompartir,
    validarClaveCompartir,
    generarTokenInvitacion,
    esRolValido,
    calcularFechaExpiracion,
    normalizarEmail
} = require('../../utils/compartir.utils');

const { Invitacion } = require('../../models/categoriaCompartida');

// ✅ MAPEO DE ROLES: Frontend -> Base de Datos
const mapearRolFrontendADB = (rolFrontend) => {
    const mapeo = {
        'lector': 'visor',
        'colaborador': 'colaborador',
        'admin': 'admin',
        'editor': 'editor'
    };
    return mapeo[rolFrontend] || rolFrontend;
};

// ✅ MAPEO DE ROLES: Base de Datos -> Frontend
const mapearRolDBaFrontend = (rolDB) => {
    const mapeo = {
        'visor': 'lector',
        'colaborador': 'colaborador',
        'admin': 'admin',
        'editor': 'editor'
    };
    return mapeo[rolDB] || rolDB;
};

// ✅ FUNCIÓN AUXILIAR: Normalizar tipo de notificación para el ENUM
const normalizarTipoNotificacion = (tipo) => {
    const tiposValidos = ['invitacion_lista', 'tarea_asignada', 'comentario'];
    return tiposValidos.includes(tipo) ? tipo : 'otro';
};

/**
 * Generar clave para compartir lista
 */
/**
 * Generar clave para compartir lista
 */
exports.generarClaveLista = async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const { idLista } = req.params;
        const idUsuario = req.usuario.idUsuario;

        console.log('🔵 POST /compartir/lista/:id/generar-clave');
        console.log('📋 Params:', req.params);
        console.log('🆔 ID extraído:', idLista);
        console.log('👤 Usuario:', idUsuario);

        if (!idLista || !idUsuario) {
            console.log('❌ Validación falló:', { idLista, idUsuario });
            await connection.rollback();
            connection.release();
            return res.status(400).json({
                error: 'Parámetros inválidos',
                debug: { idLista, idUsuario }
            });
        }

        console.log('✅ Validación pasada, consultando BD...');

        const [rows] = await connection.execute(
            'SELECT * FROM lista WHERE idLista = ? AND idUsuario = ?',
            [idLista, idUsuario]
        );

        console.log('📊 Resultados de BD:', rows.length);

        if (rows.length === 0) {
            console.log('❌ Lista no encontrada');
            await connection.rollback();
            connection.release();
            return res.status(404).json({
                error: 'Lista no encontrada o no tienes permisos'
            });
        }

        console.log('✅ Lista encontrada:', rows[0].nombre);

        let clave = rows[0].claveCompartir;
        let claveExistia = !!clave;

        if (clave) {
            console.log('🔄 Lista ya tiene clave, reutilizándola:', clave);
        } else {
            console.log('🆕 Generando nueva clave...');
            clave = generarClaveCompartir();
            console.log('🔑 Clave generada:', clave, 'Tipo:', typeof clave);

            if (!clave) {
                console.log('❌ Error: clave es undefined o null');
                throw new Error('No se pudo generar la clave de compartir');
            }

            let intentos = 0;
            while (intentos < 10) {
                const [existe] = await connection.execute(
                    'SELECT idLista FROM lista WHERE claveCompartir = ?',
                    [clave]
                );
                if (existe.length === 0) break;
                clave = generarClaveCompartir();
                intentos++;
            }

            console.log('🔑 Clave final única:', clave, 'Intentos:', intentos);
        }

        console.log('💾 Actualizando BD - compartible = TRUE');

        const [updateResult] = await connection.execute(
            'UPDATE lista SET claveCompartir = ?, compartible = TRUE WHERE idLista = ?',
            [clave, idLista]
        );

        console.log('✅ UPDATE ejecutado. Filas afectadas:', updateResult.affectedRows);

        const [verificacion] = await connection.execute(
            'SELECT claveCompartir FROM lista WHERE idLista = ?',
            [idLista]
        );
        console.log('🔍 Verificación BD - Clave guardada:', verificacion[0]?.claveCompartir);

        const claveGuardada = verificacion[0]?.claveCompartir || clave;

        // 🔧 Verificar si el propietario ya existe en lista_compartida
        const [registroExistente] = await connection.execute(
            'SELECT * FROM lista_compartida WHERE idLista = ? AND idUsuario = ?',
            [parseInt(idLista), idUsuario]
        );

        if (registroExistente.length === 0) {
            // ✅ Insertar al propietario con rol admin (se comparte a sí mismo)
            await connection.execute(
                `INSERT INTO lista_compartida 
                 (idLista, idUsuario, rol, esCreador, aceptado, activo, compartidoPor, fechaCompartido) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                [
                    parseInt(idLista),
                    idUsuario,
                    'admin',
                    true,
                    true,
                    true,
                    idUsuario
                ]
            );
            console.log('✅ Propietario insertado en lista_compartida con rol admin');
        } else {
            // ✅ Actualizar el registro existente
            await connection.execute(
                `UPDATE lista_compartida 
                 SET rol = ?, esCreador = ?, aceptado = ?, activo = ? 
                 WHERE idLista = ? AND idUsuario = ?`,
                ['admin', true, true, true, parseInt(idLista), idUsuario]
            );
            console.log('✅ Propietario actualizado en lista_compartida con rol admin');
        }

        // Registrar auditoría
        await connection.execute(
            `INSERT INTO auditoria_compartidos 
             (tipo, idEntidad, idUsuario, accion, detalles, fecha)
             VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
            [
                'lista',
                parseInt(idLista),
                idUsuario,
                claveExistia ? 'reactivar_clave' : 'generar_clave',
                JSON.stringify({ clave: claveGuardada, reutilizada: claveExistia })
            ]
        );

        console.log('✅ Auditoría registrada');

        await connection.commit();

        const respuesta = {
            mensaje: claveExistia ? 'Clave reactivada exitosamente' : 'Clave generada exitosamente',
            clave: claveGuardada,
            lista: {
                idLista: rows[0].idLista,
                nombre: rows[0].nombre,
                claveCompartir: claveGuardada,
                tuRol: 'admin',
                esPropietario: true
            }
        };

        console.log('📤 Enviando respuesta:', respuesta);

        res.json(respuesta);

    } catch (error) {
        await connection.rollback();
        console.error('❌ ERROR COMPLETO:', error);
        console.error('Stack:', error.stack);
        res.status(500).json({
            error: 'Error al generar clave de compartir',
            detalles: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    } finally {
        connection.release();
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

/**
 * Invitar usuario a lista
 */
exports.invitarUsuarioLista = async (req, res) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const { idLista } = req.params;
        let { email, rol } = req.body;
        const idUsuarioInvita = req.usuario.idUsuario;

        console.log('📧 Invitando usuario:', { idLista, email, rol, idUsuarioInvita });

        const rolDB = mapearRolFrontendADB(rol);
        console.log('🔄 Rol mapeado:', rol, '->', rolDB);

        if (!['admin', 'editor', 'colaborador', 'visor'].includes(rolDB)) {
            await connection.rollback();
            connection.release();
            return res.status(400).json({ error: 'Rol inválido' });
        }

        const [permisos] = await connection.query(
            `SELECT 'propietario' as rol FROM lista 
             WHERE idLista = ? AND idUsuario = ?
             UNION
             SELECT rol FROM lista_compartida 
             WHERE idLista = ? AND idUsuario = ? AND activo = TRUE`,
            [idLista, idUsuarioInvita, idLista, idUsuarioInvita]
        );

        if (permisos.length === 0 || (permisos[0].rol !== 'propietario' && permisos[0].rol !== 'admin')) {
            await connection.rollback();
            connection.release();
            return res.status(403).json({ error: 'No tienes permisos para invitar usuarios' });
        }

        const [usuarios] = await connection.query(
            'SELECT idUsuario, nombre, email FROM usuario WHERE email = ?',
            [email]
        );

        if (usuarios.length === 0) {
            await connection.rollback();
            connection.release();
            return res.status(404).json({ error: 'Usuario no encontrado con ese email' });
        }

        const usuarioInvitado = usuarios[0];

        const [propietario] = await connection.query(
            'SELECT idUsuario FROM lista WHERE idLista = ? AND idUsuario = ?',
            [idLista, usuarioInvitado.idUsuario]
        );

        if (propietario.length > 0) {
            await connection.rollback();
            connection.release();
            return res.status(400).json({ error: 'El usuario ya es propietario de esta lista' });
        }

        const [yaCompartida] = await connection.query(
            'SELECT * FROM lista_compartida WHERE idLista = ? AND idUsuario = ?',
            [idLista, usuarioInvitado.idUsuario]
        );

        if (yaCompartida.length > 0) {
            await connection.rollback();
            connection.release();
            return res.status(400).json({ error: 'El usuario ya tiene acceso a esta lista' });
        }

        const [listas] = await connection.query(
            'SELECT nombre, compartible, claveCompartir FROM lista WHERE idLista = ?',
            [idLista]
        );

        if (listas.length === 0) {
            await connection.rollback();
            connection.release();
            return res.status(404).json({ error: 'Lista no encontrada' });
        }

        await connection.query(
            `INSERT INTO lista_compartida 
             (idLista, idUsuario, rol, compartidoPor, aceptado, activo, esCreador) 
             VALUES (?, ?, ?, ?, TRUE, TRUE, FALSE)`,
            [idLista, usuarioInvitado.idUsuario, rolDB, idUsuarioInvita]
        );

        console.log('✅ Registro creado en lista_compartida con rol:', rolDB);

        if (!listas[0].compartible) {
            await connection.query(
                'UPDATE lista SET compartible = TRUE WHERE idLista = ?',
                [idLista]
            );
            console.log('✅ Lista marcada como compartible');
        }

        const [usuarioInvitador] = await connection.query(
            'SELECT nombre FROM usuario WHERE idUsuario = ?',
            [idUsuarioInvita]
        );

        // ✅ NORMALIZAR tipo de notificación
        const tipoNotificacion = normalizarTipoNotificacion('invitacion_lista');

        await connection.query(
            `INSERT INTO notificaciones 
             (id_usuario, tipo, titulo, mensaje, datos_adicionales, leida, fecha_creacion) 
             VALUES (?, ?, ?, ?, ?, FALSE, CURRENT_TIMESTAMP)`,
            [
                usuarioInvitado.idUsuario,
                tipoNotificacion,
                `${usuarioInvitador[0].nombre} te agregó a una lista`,
                `Has sido agregado a la lista "${listas[0].nombre}" como ${rol}`,
                JSON.stringify({
                    listaId: parseInt(idLista),
                    listaNombre: listas[0].nombre,
                    invitadoPor: usuarioInvitador[0].nombre,
                    invitadoPorId: idUsuarioInvita,
                    rol: rol,
                    tipoReal: 'invitacion_lista'
                })
            ]
        );

        try {
            await connection.query(
                `INSERT INTO auditoria_compartidos 
                 (tipo, idEntidad, idUsuario, accion, detalles, fechaAccion)
                 VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                [
                    'lista',
                    parseInt(idLista),
                    idUsuarioInvita,
                    'invitar_usuario',
                    JSON.stringify({
                        emailInvitado: email,
                        idUsuarioInvitado: usuarioInvitado.idUsuario,
                        rol: rol
                    })
                ]
            );
        } catch (auditoriaError) {
            console.warn('⚠️ No se pudo registrar en auditoría:', auditoriaError.message);
        }

        await connection.commit();

        console.log('✅ Invitación enviada y usuario agregado exitosamente');

        res.json({
            success: true,
            mensaje: `${usuarioInvitado.nombre} ha sido agregado a la lista`,
            usuario: {
                id: usuarioInvitado.idUsuario,
                nombre: usuarioInvitado.nombre,
                email: usuarioInvitado.email,
                rol: rol
            }
        });
    } catch (error) {
        await connection.rollback();
        console.error('❌ Error al invitar usuario:', error);
        console.error('Stack:', error.stack);
        res.status(500).json({
            error: 'Error al agregar usuario',
            detalles: error.message
        });
    } finally {
        connection.release();
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
                rol: mapearRolDBaFrontend(u.rol),
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
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const { idLista, idUsuarioModificar } = req.params;
        let { nuevoRol } = req.body;
        const idUsuario = req.usuario.idUsuario;

        console.log('🔄 Modificando rol:', { idLista, idUsuarioModificar, nuevoRol, solicitadoPor: idUsuario });

        const nuevoRolDB = mapearRolFrontendADB(nuevoRol);
        console.log('🔄 Rol mapeado:', nuevoRol, '->', nuevoRolDB);

        if (!['admin', 'editor', 'colaborador', 'visor'].includes(nuevoRolDB)) {
            await connection.rollback();
            connection.release();
            return res.status(400).json({ error: 'Rol inválido' });
        }

        const [permisos] = await connection.query(
            `SELECT 'propietario' as rol FROM lista 
             WHERE idLista = ? AND idUsuario = ?
             UNION
             SELECT rol FROM lista_compartida 
             WHERE idLista = ? AND idUsuario = ? AND activo = TRUE`,
            [idLista, idUsuario, idLista, idUsuario]
        );

        if (permisos.length === 0 || (permisos[0].rol !== 'propietario' && permisos[0].rol !== 'admin')) {
            await connection.rollback();
            connection.release();
            return res.status(403).json({ error: 'No tienes permisos para modificar roles' });
        }

        const [usuarioInfo] = await connection.query(
            'SELECT esCreador FROM lista_compartida WHERE idLista = ? AND idUsuario = ?',
            [idLista, idUsuarioModificar]
        );

        if (usuarioInfo.length === 0) {
            await connection.rollback();
            connection.release();
            return res.status(404).json({ error: 'Usuario no encontrado en esta lista' });
        }

        if (usuarioInfo[0].esCreador) {
            await connection.rollback();
            connection.release();
            return res.status(403).json({ error: 'No se puede modificar el rol del creador' });
        }

        const [result] = await connection.query(
            `UPDATE lista_compartida 
             SET rol = ? 
             WHERE idLista = ? AND idUsuario = ? AND esCreador = FALSE`,
            [nuevoRolDB, idLista, idUsuarioModificar]
        );

        if (result.affectedRows === 0) {
            await connection.rollback();
            connection.release();
            return res.status(404).json({ error: 'No se pudo actualizar el rol' });
        }

        console.log('✅ Rol actualizado en BD a:', nuevoRolDB);

        const [usuarioModificado] = await connection.query(
            'SELECT nombre, email FROM usuario WHERE idUsuario = ?',
            [idUsuarioModificar]
        );

        const [lista] = await connection.query(
            'SELECT nombre FROM lista WHERE idLista = ?',
            [idLista]
        );

        const [usuarioQueModifica] = await connection.query(
            'SELECT nombre FROM usuario WHERE idUsuario = ?',
            [idUsuario]
        );

        // ✅ NORMALIZAR tipo de notificación
        const tipoNotificacion = normalizarTipoNotificacion('cambio_rol_lista');

        await connection.query(
            `INSERT INTO notificaciones 
             (id_usuario, tipo, titulo, mensaje, datos_adicionales, leida, fecha_creacion) 
             VALUES (?, ?, ?, ?, ?, FALSE, CURRENT_TIMESTAMP)`,
            [
                idUsuarioModificar,
                tipoNotificacion,
                'Tu rol ha sido modificado',
                `${usuarioQueModifica[0].nombre} cambió tu rol en "${lista[0].nombre}" a ${nuevoRol}`,
                JSON.stringify({
                    listaId: parseInt(idLista),
                    listaNombre: lista[0].nombre,
                    nuevoRol: nuevoRol,
                    modificadoPor: usuarioQueModifica[0].nombre,
                    modificadoPorId: idUsuario,
                    tipoReal: 'cambio_rol_lista'
                })
            ]
        );

        console.log('✅ Notificación creada con tipo:', tipoNotificacion);

        try {
            await connection.query(
                `INSERT INTO auditoria_compartidos 
                 (tipo, idEntidad, idUsuario, accion, detalles, fechaAccion)
                 VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                [
                    'lista',
                    parseInt(idLista),
                    idUsuario,
                    'modificar_rol',
                    JSON.stringify({
                        idUsuarioModificado: idUsuarioModificar,
                        nombreUsuarioModificado: usuarioModificado[0].nombre,
                        nuevoRol: nuevoRol
                    })
                ]
            );
        } catch (auditoriaError) {
            console.warn('No se pudo registrar en auditoría:', auditoriaError.message);
        }

        await connection.commit();

        console.log('✅ Rol modificado exitosamente');

        res.json({
            success: true,
            mensaje: 'Rol modificado exitosamente',
            usuario: {
                idUsuario: idUsuarioModificar,
                nombre: usuarioModificado[0].nombre,
                nuevoRol: nuevoRol
            }
        });
    } catch (error) {
        await connection.rollback();
        console.error('❌ Error al modificar rol:', error);
        console.error('Stack:', error.stack);
        res.status(500).json({
            error: 'Error al modificar rol',
            detalles: error.message
        });
    } finally {
        connection.release();
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

/**
 * Descompartir lista (revocar todos los accesos)
 */
exports.descompartirLista = async (req, res) => {
    try {
        const { idLista } = req.params;
        const idUsuario = req.usuario.idUsuario;

        console.log('🔵 Descompartiendo lista:', idLista, 'Usuario:', idUsuario);

        const [listaRows] = await db.execute(
            'SELECT * FROM lista WHERE idLista = ? AND idUsuario = ?',
            [idLista, idUsuario]
        );

        if (listaRows.length === 0) {
            return res.status(403).json({
                error: 'No tienes permisos para descompartir esta lista'
            });
        }

        await db.execute(
            'DELETE FROM lista_compartida WHERE idLista = ?',
            [idLista]
        );

        await db.execute(
            'UPDATE lista SET claveCompartir = NULL, compartible = false WHERE idLista = ?',
            [idLista]
        );

        await AuditoriaCompartidos.registrar({
            tipo: 'lista',
            idEntidad: idLista,
            idUsuario,
            accion: 'descompartir',
            detalles: {}
        });

        console.log('✅ Lista descompartida exitosamente');

        res.json({
            mensaje: 'Lista descompartida exitosamente',
            idLista
        });
    } catch (error) {
        console.error('❌ Error al descompartir lista:', error);
        res.status(500).json({
            error: 'Error al descompartir lista',
            detalles: error.message
        });
    }
};

/**
 * Obtener todas las listas compartidas del usuario
 */
exports.obtenerListasCompartidas = async (req, res) => {
    try {
        const idUsuario = req.usuario.idUsuario;

        console.log('🔵 Obteniendo listas compartidas para usuario:', idUsuario);

        const query = `
            SELECT DISTINCT
                l.*,
                CASE 
                    WHEN l.idUsuario = ? THEN 'propietario'
                    ELSE lc.rol
                END as rol,
                CASE 
                    WHEN l.idUsuario = ? THEN TRUE
                    ELSE lc.esCreador
                END as esCreador,
                CASE 
                    WHEN l.idUsuario = ? THEN TRUE
                    ELSE FALSE
                END as esPropietario,
                CASE 
                    WHEN l.idUsuario = ? THEN TRUE
                    ELSE lc.aceptado
                END as aceptado,
                CASE 
                    WHEN l.idUsuario = ? THEN l.fechaCreacion
                    ELSE lc.fechaCompartido
                END as fechaCompartido,
                u.nombre as nombrePropietario,
                u.email as emailPropietario,
                c.nombre as nombreCategoria
            FROM lista l
            JOIN usuario u ON l.idUsuario = u.idUsuario
            LEFT JOIN categoria c ON l.idCategoria = c.idCategoria
            LEFT JOIN lista_compartida lc ON l.idLista = lc.idLista AND lc.idUsuario = ? AND lc.activo = TRUE
            WHERE (
                (l.idUsuario = ? AND l.compartible = TRUE)
                OR 
                (lc.idUsuario = ? AND lc.activo = TRUE AND lc.aceptado = TRUE)
            )
            ORDER BY l.nombre ASC
        `;

        const [rows] = await db.execute(query, [
            idUsuario, idUsuario, idUsuario, idUsuario, idUsuario,
            idUsuario,
            idUsuario,
            idUsuario
        ]);

        console.log('🟢 Listas compartidas encontradas:', rows.length);

        res.json({
            listas: rows.map(lista => ({
                idLista: lista.idLista,
                nombre: lista.nombre,
                color: lista.color,
                icono: lista.icono,
                importante: lista.importante,
                compartible: lista.compartible,
                claveCompartir: lista.claveCompartir,
                idCategoria: lista.idCategoria,
                rol: mapearRolDBaFrontend(lista.rol),
                esCreador: lista.esCreador,
                esPropietario: !!lista.esPropietario,
                aceptado: lista.aceptado,
                fechaCompartido: lista.fechaCompartido,
                nombrePropietario: lista.nombrePropietario,
                emailPropietario: lista.emailPropietario,
                nombreCategoria: lista.nombreCategoria,
                fechaCreacion: lista.fechaCreacion,
                fechaActualizacion: lista.fechaActualizacion
            }))
        });
    } catch (error) {
        console.error('❌ Error al obtener listas compartidas:', error);
        res.status(500).json({ error: 'Error al obtener listas compartidas' });
    }
};

/**
 * Información de compartidos de una lista
 */
exports.infoCompartidosLista = async (req, res) => {
    try {
        const { idLista } = req.params;
        const idUsuario = req.usuario.idUsuario;

        console.log('🔍 Obteniendo info compartidos. Lista:', idLista, 'Usuario:', idUsuario);

        // 1️⃣ Obtener información de la lista y verificar acceso
        const [listaRows] = await db.execute(
            `SELECT l.*, 
                    lc.rol as tuRolCompartido,
                    CASE WHEN l.idUsuario = ? THEN TRUE ELSE FALSE END as esPropietario
             FROM lista l
             LEFT JOIN lista_compartida lc ON l.idLista = lc.idLista AND lc.idUsuario = ? AND lc.activo = TRUE
             WHERE l.idLista = ?`,
            [idUsuario, idUsuario, idLista]
        );

        if (listaRows.length === 0) {
            console.log('❌ Lista no encontrada');
            return res.status(404).json({ error: 'Lista no encontrada' });
        }

        const lista = listaRows[0];
        const esPropietario = lista.esPropietario;

        console.log('📋 Lista encontrada:', {
            nombre: lista.nombre,
            idPropietario: lista.idUsuario,
            esPropietario: esPropietario,
            tuRolCompartido: lista.tuRolCompartido
        });

        // 2️⃣ Verificar si el usuario tiene acceso (es propietario O está en lista_compartida)
        if (!esPropietario && !lista.tuRolCompartido) {
            console.log('❌ Usuario sin acceso');
            return res.status(403).json({ error: 'No tienes acceso a esta lista' });
        }

        // 3️⃣ Obtener todos los usuarios compartidos (incluyendo al propietario si está)
        const [usuarios] = await db.execute(
            `SELECT 
                lc.idUsuario,
                u.nombre,
                u.email,
                lc.rol,
                lc.esCreador,
                lc.aceptado,
                lc.fechaCompartido
             FROM lista_compartida lc
             INNER JOIN usuario u ON lc.idUsuario = u.idUsuario
             WHERE lc.idLista = ? AND lc.activo = TRUE
             ORDER BY lc.esCreador DESC, lc.fechaCompartido ASC`,
            [idLista]
        );

        console.log(`👥 Usuarios compartidos encontrados: ${usuarios.length}`);

        // 4️⃣ Determinar el rol del usuario actual
        let tuRol;
        if (esPropietario) {
            tuRol = 'admin'; // ✅ Propietario siempre es admin
        } else {
            tuRol = lista.tuRolCompartido || null;
        }

        console.log('🔐 Tu rol determinado:', tuRol);

        // 5️⃣ Verificar si el propietario está en la lista de usuarios
        const propietarioEnLista = usuarios.find(u => u.idUsuario === lista.idUsuario);
        
        if (!propietarioEnLista && esPropietario) {
            console.log('⚠️ Propietario no está en lista_compartida, agregándolo a la respuesta');
            
            // Obtener datos del propietario
            const [propietarioData] = await db.execute(
                'SELECT nombre, email FROM usuario WHERE idUsuario = ?',
                [lista.idUsuario]
            );

            if (propietarioData.length > 0) {
                // Agregar al propietario al inicio de la lista
                usuarios.unshift({
                    idUsuario: lista.idUsuario,
                    nombre: propietarioData[0].nombre,
                    email: propietarioData[0].email,
                    rol: 'admin',
                    esCreador: true,
                    aceptado: true,
                    fechaCompartido: lista.fechaCreacion
                });
            }
        }

        // 6️⃣ Enviar respuesta
        res.json({
            lista: {
                idLista: lista.idLista,
                nombre: lista.nombre,
                claveCompartir: lista.claveCompartir,
                tuRol: tuRol,
                esPropietario: esPropietario
            },
            usuarios: usuarios.map(u => ({
                idUsuario: u.idUsuario,
                nombre: u.nombre,
                email: u.email,
                rol: mapearRolDBaFrontend(u.rol), // Mapear a frontend
                esCreador: !!u.esCreador,
                aceptado: !!u.aceptado,
                fechaCompartido: u.fechaCompartido
            })),
            totalUsuarios: usuarios.length,
            puedesGestionar: esPropietario || tuRol === 'admin'
        });

        console.log('✅ Info compartidos enviada correctamente');

    } catch (error) {
        console.error('❌ Error al obtener info compartidos:', error);
        console.error('Stack:', error.stack);
        res.status(500).json({ 
            error: 'Error al obtener información de compartidos',
            detalles: error.message 
        });
    }
};

module.exports = exports;