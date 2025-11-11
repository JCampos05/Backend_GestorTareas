const db = require('../config/config');

/**
 * Verifica si el usuario es admin/propietario de una categoría
 */
const esAdminCategoria = async (req, res, next) => {
    try {
        const { idCategoria } = req.params;
        const idUsuario = req.usuario.idUsuario;

        if (!idCategoria) {
            return res.status(400).json({ error: 'ID de categoría requerido' });
        }

        // Verificar si es el propietario
        const [rows] = await db.execute(
            'SELECT * FROM categoria WHERE idCategoria = ? AND idUsuario = ?',
            [idCategoria, idUsuario]
        );

        if (rows.length > 0) {
            return next(); // Es el propietario
        }

        // Verificar si tiene rol admin en categoría compartida
        const [compartido] = await db.execute(
            `SELECT * FROM categoria_compartida 
             WHERE idCategoria = ? AND idUsuario = ? AND rol = 'admin' AND activo = TRUE`,
            [idCategoria, idUsuario]
        );

        if (compartido.length > 0) {
            return next();
        }

        return res.status(403).json({ error: 'No tienes permisos de administrador en esta categoría' });
    } catch (error) {
        console.error('Error en middleware esAdminCategoria:', error);
        return res.status(500).json({ error: 'Error al verificar permisos' });
    }
};

/**
 * Verifica si el usuario es admin/propietario de una lista
 */
const esAdminLista = async (req, res, next) => {
    try {
        const { idLista } = req.params;
        const idUsuario = req.usuario.idUsuario;

        if (!idLista) {
            return res.status(400).json({ error: 'ID de lista requerido' });
        }

        // Verificar si es el propietario
        const [rows] = await db.execute(
            'SELECT * FROM lista WHERE idLista = ? AND idUsuario = ?',
            [idLista, idUsuario]
        );

        if (rows.length > 0) {
            return next();
        }

        // Verificar si tiene rol admin en lista compartida
        const [compartido] = await db.execute(
            `SELECT * FROM lista_compartida 
             WHERE idLista = ? AND idUsuario = ? AND rol = 'admin' AND activo = TRUE`,
            [idLista, idUsuario]
        );

        if (compartido.length > 0) {
            return next();
        }

        return res.status(403).json({ error: 'No tienes permisos de administrador en esta lista' });
    } catch (error) {
        console.error('Error en middleware esAdminLista:', error);
        return res.status(500).json({ error: 'Error al verificar permisos' });
    }
};

/**
 * Verifica permisos sobre una categoría (propias o compartidas)
 * @param {string} accion - 'ver', 'editar', 'eliminar', 'compartir'
 */
const verificarPermisoCategoria = (accion) => {
    return async (req, res, next) => {
        try {
            const { idCategoria } = req.params;
            const idUsuario = req.usuario.idUsuario;

            // Obtener la categoría
            const [categoriaRows] = await db.execute(
                'SELECT * FROM categoria WHERE idCategoria = ?',
                [idCategoria]
            );

            if (categoriaRows.length === 0) {
                return res.status(404).json({ 
                    success: false,
                    error: 'Categoría no encontrada' 
                });
            }

            const categoria = categoriaRows[0];

            // Si es el propietario, tiene todos los permisos (recursos propios)
            if (categoria.idUsuario === idUsuario) {
                req.permisos = {
                    esCreador: true,
                    esPropietario: true,
                    rol: 'propietario',
                    puede: { ver: true, editar: true, eliminar: true, compartir: true }
                };
                req.categoria = categoria;
                return next();
            }

            // Si no es propietario, verificar acceso compartido
            const [categoriaCompartida] = await db.execute(
                `SELECT rol FROM categoria_compartida 
                 WHERE idCategoria = ? AND idUsuario = ? AND activo = TRUE AND aceptado = TRUE`,
                [idCategoria, idUsuario]
            );

            if (categoriaCompartida.length > 0) {
                const rol = categoriaCompartida[0].rol;
                const permisos = obtenerPermisosPorRol(rol);
                
                if (permisos[accion]) {
                    req.permisos = {
                        esCreador: false,
                        esPropietario: false,
                        rol,
                        puede: permisos,
                        esCompartida: true
                    };
                    req.categoria = categoria;
                    return next();
                }
                
                // Tiene acceso pero no el permiso necesario
                return res.status(403).json({ 
                    success: false,
                    error: `Tu rol de "${rol}" no permite ${accion} esta categoría` 
                });
            }

            // No tiene acceso en absoluto
            return res.status(403).json({ 
                success: false,
                error: 'No tienes acceso a esta categoría' 
            });
        } catch (error) {
            console.error('Error en verificarPermisoCategoria:', error);
            return res.status(500).json({ 
                success: false,
                error: 'Error al verificar permisos' 
            });
        }
    };
};

/**
 * Verifica permisos sobre una lista (propias o compartidas, incluyendo herencia de categoría)
 * @param {string} accion - 'ver', 'editar', 'eliminar', 'compartir'
 */
const verificarPermisoLista = (accion) => {
    return async (req, res, next) => {
        try {
            const { id: idLista } = req.params;
            const idUsuario = req.usuario.idUsuario;

            // Obtener la lista con información de categoría
            const [listaRows] = await db.execute(
                `SELECT l.*, c.idUsuario as idUsuarioCategoria
                 FROM lista l
                 LEFT JOIN categoria c ON l.idCategoria = c.idCategoria
                 WHERE l.idLista = ?`,
                [idLista]
            );

            if (listaRows.length === 0) {
                return res.status(404).json({ 
                    success: false,
                    error: 'Lista no encontrada' 
                });
            }

            const lista = listaRows[0];

            // Si es el propietario de la lista, tiene todos los permisos (recursos propios)
            if (lista.idUsuario === idUsuario) {
                req.permisos = {
                    esCreador: true,
                    esPropietario: true,
                    rol: 'propietario',
                    puede: { ver: true, editar: true, eliminar: true, mover: true, compartir: true }
                };
                req.lista = lista;
                return next();
            }

            // Verificar acceso directo a lista compartida
            const [listaCompartida] = await db.execute(
                `SELECT rol FROM lista_compartida 
                 WHERE idLista = ? AND idUsuario = ? AND activo = TRUE AND aceptado = TRUE`,
                [idLista, idUsuario]
            );

            if (listaCompartida.length > 0) {
                const rol = listaCompartida[0].rol;
                const permisos = obtenerPermisosPorRol(rol);
                
                if (permisos[accion]) {
                    req.permisos = {
                        esCreador: false,
                        esPropietario: false,
                        rol,
                        puede: permisos,
                        esCompartida: true,
                        tipoAcceso: 'lista_compartida'
                    };
                    req.lista = lista;
                    return next();
                }
                
                return res.status(403).json({ 
                    success: false,
                    error: `Tu rol de "${rol}" no permite ${accion} esta lista` 
                });
            }

            // Verificar acceso heredado de categoría compartida
            if (lista.idCategoria) {
                const [categoriaCompartida] = await db.execute(
                    `SELECT rol FROM categoria_compartida 
                     WHERE idCategoria = ? AND idUsuario = ? AND activo = TRUE AND aceptado = TRUE`,
                    [lista.idCategoria, idUsuario]
                );

                if (categoriaCompartida.length > 0) {
                    const rol = categoriaCompartida[0].rol;
                    const permisos = obtenerPermisosPorRol(rol);
                    
                    if (permisos[accion]) {
                        req.permisos = {
                            esCreador: false,
                            esPropietario: false,
                            rol,
                            puede: permisos,
                            esCompartida: true,
                            tipoAcceso: 'categoria_compartida',
                            heredadoDeCategoria: true
                        };
                        req.lista = lista;
                        return next();
                    }
                    
                    return res.status(403).json({ 
                        success: false,
                        error: `Tu rol de "${rol}" en la categoría no permite ${accion} esta lista` 
                    });
                }
            }

            // No tiene acceso
            return res.status(403).json({ 
                success: false,
                error: 'No tienes acceso a esta lista' 
            });
        } catch (error) {
            console.error('Error en verificarPermisoLista:', error);
            return res.status(500).json({ 
                success: false,
                error: 'Error al verificar permisos' 
            });
        }
    };
};

/**
 * Verifica permisos sobre una tarea (propias o compartidas, con herencia)
 * @param {string} accion - 'ver', 'editar', 'eliminar', 'mover'
 */
const verificarPermisoTarea = (accion) => {
    return async (req, res, next) => {
        try {
            const { id: idTarea } = req.params;
            const idUsuario = req.usuario.idUsuario;

            console.log('🔍 Verificando permiso para tarea:', idTarea, 'Usuario:', idUsuario, 'Acción:', accion);

            // Obtener la tarea con su lista y categoría
            const [tareaRows] = await db.execute(
                `SELECT t.*, 
                        l.idUsuario as idUsuarioLista, 
                        l.idCategoria,
                        c.idUsuario as idUsuarioCategoria
                 FROM tarea t
                 LEFT JOIN lista l ON t.idLista = l.idLista
                 LEFT JOIN categoria c ON l.idCategoria = c.idCategoria
                 WHERE t.idTarea = ?`,
                [idTarea]
            );

            if (tareaRows.length === 0) {
                console.log('❌ Tarea no encontrada:', idTarea);
                return res.status(404).json({ 
                    success: false,
                    error: 'Tarea no encontrada' 
                });
            }

            const tarea = tareaRows[0];
            console.log('✅ Tarea encontrada:', { 
                idTarea: tarea.idTarea,
                idUsuarioTarea: tarea.idUsuario,
                idLista: tarea.idLista, 
                idUsuarioLista: tarea.idUsuarioLista 
            });

            // CASO 1: Si la tarea tiene idUsuario propio (creador directo)
            if (tarea.idUsuario && tarea.idUsuario === idUsuario) {
                console.log('✅ Usuario es creador directo de la tarea');
                req.permisos = {
                    esCreador: true,
                    esPropietario: true,
                    rol: 'propietario',
                    puede: { ver: true, editar: true, eliminar: true, mover: true }
                };
                req.tarea = tarea;
                return next();
            }

            // CASO 2: Si la tarea no tiene lista asociada
            if (!tarea.idLista) {
                console.log('⚠️ Tarea sin lista asociada y usuario no es creador');
                return res.status(403).json({ 
                    success: false,
                    error: 'No tienes acceso a esta tarea' 
                });
            }

            // CASO 3: Si es propietario de la lista
            if (tarea.idUsuarioLista === idUsuario) {
                console.log('✅ Usuario es propietario de la lista');
                req.permisos = {
                    esCreador: true,
                    esPropietario: true,
                    rol: 'propietario',
                    puede: { ver: true, editar: true, eliminar: true, mover: true }
                };
                req.tarea = tarea;
                return next();
            }

            // Verificar acceso por lista compartida
            const [listaCompartida] = await db.execute(
                `SELECT rol FROM lista_compartida 
                 WHERE idLista = ? AND idUsuario = ? AND activo = TRUE AND aceptado = TRUE`,
                [tarea.idLista, idUsuario]
            );

            if (listaCompartida.length > 0) {
                const rol = listaCompartida[0].rol;
                const permisos = obtenerPermisosPorRol(rol);
                console.log('✅ Usuario tiene acceso por lista compartida. Rol:', rol);
                
                if (permisos[accion]) {
                    req.permisos = {
                        esCreador: false,
                        esPropietario: false,
                        rol,
                        puede: permisos,
                        esCompartida: true,
                        tipoAcceso: 'lista_compartida'
                    };
                    req.tarea = tarea;
                    return next();
                }
                
                console.log('❌ Rol no tiene permiso para:', accion);
                return res.status(403).json({ 
                    success: false,
                    error: `Tu rol de "${rol}" no permite ${accion} esta tarea` 
                });
            }

            // Verificar acceso heredado de categoría
            if (tarea.idCategoria) {
                const [categoriaCompartida] = await db.execute(
                    `SELECT rol FROM categoria_compartida 
                     WHERE idCategoria = ? AND idUsuario = ? AND activo = TRUE AND aceptado = TRUE`,
                    [tarea.idCategoria, idUsuario]
                );

                if (categoriaCompartida.length > 0) {
                    const rol = categoriaCompartida[0].rol;
                    const permisos = obtenerPermisosPorRol(rol);
                    console.log('✅ Usuario tiene acceso por categoría compartida. Rol:', rol);
                    
                    if (permisos[accion]) {
                        req.permisos = {
                            esCreador: false,
                            esPropietario: false,
                            rol,
                            puede: permisos,
                            esCompartida: true,
                            tipoAcceso: 'categoria_compartida',
                            heredadoDeCategoria: true
                        };
                        req.tarea = tarea;
                        return next();
                    }
                    
                    console.log('❌ Rol no tiene permiso para:', accion);
                    return res.status(403).json({ 
                        success: false,
                        error: `Tu rol de "${rol}" en la categoría no permite ${accion} esta tarea` 
                    });
                }
            }

            // No tiene acceso
            console.log('❌ Usuario no tiene acceso a la tarea');
            return res.status(403).json({ 
                success: false,
                error: 'No tienes acceso a esta tarea' 
            });
        } catch (error) {
            console.error('❌ Error en verificarPermisoTarea:', error);
            return res.status(500).json({ 
                success: false,
                error: 'Error al verificar permisos',
                details: error.message 
            });
        }
    };
};

/**
 * Obtiene los permisos según el rol
 * @param {string} rol - 'admin', 'colaborador', 'lector'
 * @returns {Object} Objeto con permisos booleanos
 */
const obtenerPermisosPorRol = (rol) => {
    const permisos = {
        propietario: {
            ver: true,
            editar: true,
            eliminar: true,
            mover: true,
            compartir: true
        },
        admin: {
            ver: true,
            editar: true,
            eliminar: true,
            mover: true,
            compartir: true
        },
        colaborador: {
            ver: true,
            editar: true,
            eliminar: false,
            mover: false,
            compartir: false
        },
        lector: {
            ver: true,
            editar: false,
            eliminar: false,
            mover: false,
            compartir: false
        }
    };

    return permisos[rol] || permisos.lector;
};

/**
 * Verifica si el usuario tiene acceso a una categoría (lectura mínima)
 */
const tieneAccesoCategoria = async (req, res, next) => {
    try {
        const { idCategoria } = req.params;
        const idUsuario = req.usuario.idUsuario;

        const [rows] = await db.execute(
            `SELECT c.idUsuario, cc.rol 
             FROM categoria c
             LEFT JOIN categoria_compartida cc ON c.idCategoria = cc.idCategoria 
                AND cc.idUsuario = ? AND cc.activo = TRUE AND cc.aceptado = TRUE
             WHERE c.idCategoria = ?`,
            [idUsuario, idCategoria]
        );

        if (rows.length === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'Categoría no encontrada' 
            });
        }

        const esCreador = rows[0].idUsuario === idUsuario;
        const tieneAccesoCompartido = rows[0].rol !== null;

        if (esCreador || tieneAccesoCompartido) {
            req.permisos = {
                esCreador,
                esPropietario: esCreador,
                rol: esCreador ? 'propietario' : rows[0].rol,
                puede: obtenerPermisosPorRol(esCreador ? 'propietario' : rows[0].rol)
            };
            return next();
        }

        return res.status(403).json({ 
            success: false,
            error: 'No tienes acceso a esta categoría' 
        });
    } catch (error) {
        console.error('Error en tieneAccesoCategoria:', error);
        return res.status(500).json({ 
            success: false,
            error: 'Error al verificar acceso' 
        });
    }
};

/**
 * Verifica si el usuario tiene acceso a una lista (lectura mínima)
 */
const tieneAccesoLista = async (req, res, next) => {
    try {
        const { idLista } = req.params;
        const idUsuario = req.usuario.idUsuario;

        const [rows] = await db.execute(
            `SELECT l.idUsuario, lc.rol 
             FROM lista l
             LEFT JOIN lista_compartida lc ON l.idLista = lc.idLista 
                AND lc.idUsuario = ? AND lc.activo = TRUE AND lc.aceptado = TRUE
             WHERE l.idLista = ?`,
            [idUsuario, idLista]
        );

        if (rows.length === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'Lista no encontrada' 
            });
        }

        const esCreador = rows[0].idUsuario === idUsuario;
        const tieneAccesoCompartido = rows[0].rol !== null;

        if (esCreador || tieneAccesoCompartido) {
            req.permisos = {
                esCreador,
                esPropietario: esCreador,
                rol: esCreador ? 'propietario' : rows[0].rol,
                puede: obtenerPermisosPorRol(esCreador ? 'propietario' : rows[0].rol)
            };
            return next();
        }

        return res.status(403).json({ 
            success: false,
            error: 'No tienes acceso a esta lista' 
        });
    } catch (error) {
        console.error('Error en tieneAccesoLista:', error);
        return res.status(500).json({ 
            success: false,
            error: 'Error al verificar acceso' 
        });
    }
};

module.exports = {
    esAdminCategoria,
    esAdminLista,
    verificarPermisoCategoria,
    verificarPermisoLista,
    verificarPermisoTarea,
    obtenerPermisosPorRol,
    tieneAccesoCategoria,
    tieneAccesoLista
};