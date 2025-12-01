const Lista = require('../models/lista');
const db = require('../config/config');
const { generarClaveCompartir } = require('../utils/compartir.utils');

const listaController = {
    // Crear nueva lista
    crearLista: async (req, res) => {
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            const { nombre, color, icono, importante, idCategoria } = req.body;
            const idUsuario = req.usuario.idUsuario;

            if (!nombre || nombre.trim() === '') {
                await connection.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'El nombre de la lista es requerido'
                });
            }

            //console.log('Creando lista:', { nombre, idCategoria, idUsuario });

            // Verificar si la categoría está compartida
            let compartible = false;
            let claveCompartir = null;

            if (idCategoria) {
                const [categoria] = await connection.execute(
                    'SELECT compartible, claveCompartir FROM categoria WHERE idCategoria = ?',
                    [idCategoria]
                );

                if (categoria.length > 0 && categoria[0].compartible) {
                    //console.log('Categoría está compartida, heredando estado...');
                    compartible = true;

                    // Generar clave única para la lista
                    claveCompartir = generarClaveCompartir();

                    let intentos = 0;
                    while (intentos < 10) {
                        const [existe] = await connection.execute(
                            'SELECT idLista FROM lista WHERE claveCompartir = ?',
                            [claveCompartir]
                        );
                        if (existe.length === 0) break;
                        claveCompartir = generarClaveCompartir();
                        intentos++;
                    }

                    //console.log('lave generada para nueva lista:', claveCompartir);
                }
            }

            // Crear la lista
            const [result] = await connection.execute(
                `INSERT INTO lista (nombre, color, icono, importante, idCategoria, idUsuario, compartible, claveCompartir)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    nombre.trim(),
                    color || null,
                    icono || null,
                    Boolean(importante) ? 1 : 0,
                    idCategoria || null,
                    idUsuario,
                    Boolean(compartible) ? 1 : 0,
                    claveCompartir
                ]
            );

            const idLista = result.insertId;
            //console.log('Lista creada con ID:', idLista);

            // Si la lista es compartible, agregar al propietario en lista_compartida
            if (Boolean(compartible)) {
                await connection.execute(
                    `INSERT INTO lista_compartida 
                     (idLista, idUsuario, rol, esCreador, aceptado, activo, compartidoPor, fechaCompartido)
                     VALUES (?, ?, 'admin', TRUE, TRUE, TRUE, ?, CURRENT_TIMESTAMP)`,
                    [idLista, idUsuario, idUsuario]
                );
                console.log('Propietario agregado a lista_compartida');

                // Si la categoría está compartida, agregar a todos los usuarios con acceso
                if (idCategoria) {
                    const [usuariosCategoria] = await connection.execute(
                        `SELECT idUsuario, rol 
                         FROM categoria_compartida 
                         WHERE idCategoria = ? AND activo = TRUE AND idUsuario != ?`,
                        [idCategoria, idUsuario]
                    );

                    //console.log(`Usuarios en categoría: ${usuariosCategoria.length}`);

                    for (const usuario of usuariosCategoria) {
                        await connection.execute(
                            `INSERT INTO lista_compartida 
                             (idLista, idUsuario, rol, esCreador, aceptado, activo, compartidoPor, fechaCompartido)
                             VALUES (?, ?, ?, FALSE, TRUE, TRUE, ?, CURRENT_TIMESTAMP)`,
                            [idLista, usuario.idUsuario, usuario.rol, idUsuario]
                        );
                        //console.log(`Usuario ${usuario.idUsuario} agregado a lista compartida con rol ${usuario.rol}`);
                    }
                }
            }

            await connection.commit();

            res.status(201).json({
                success: true,
                message: 'Lista creada exitosamente',
                data: {
                    idLista,
                    nombre: nombre.trim(),
                    color: color || null,
                    icono: icono || null,
                    importante: importante || false,
                    idCategoria: idCategoria || null,
                    compartible,
                    claveCompartir,
                    fechaCreacion: new Date()
                }
            });
        } catch (error) {
            await connection.rollback();
            //console.error('Error al crear lista:', error);
            res.status(500).json({
                success: false,
                message: 'Error al crear la lista',
                error: error.message
            });
        } finally {
            connection.release();
        }
    },

    // Obtener todas las listas
    obtenerListas: async (req, res) => {
        try {
            const idUsuario = req.usuario.idUsuario;
            const listas = await Lista.obtenerTodas(idUsuario);

            res.status(200).json({
                success: true,
                count: listas.length,
                data: listas
            });
        } catch (error) {
            console.error('Error en obtenerListas:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener las listas',
                error: error.message
            });
        }
    },

    // Obtener lista por ID
    obtenerListaPorId: async (req, res) => {
        try {
            const { idLista } = req.params;
            // El middleware verificarPermisoLista('ver') ya validó acceso
            const lista = await Lista.obtenerPorId(idLista);

            if (!lista) {
                return res.status(404).json({
                    success: false,
                    message: 'Lista no encontrada'
                });
            }

            res.status(200).json({
                success: true,
                data: lista
            });
        } catch (error) {
            console.error('Error en obtenerListaPorId:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener la lista',
                error: error.message
            });
        }
    },

    // Actualizar lista
    actualizarLista: async (req, res) => {
        try {
            const { idLista } = req.params;
            const { nombre, color, icono, importante, idCategoria } = req.body;
            const idUsuario = req.usuario.idUsuario;

            if (!nombre && !color && !icono && importante === undefined && idCategoria === undefined) {
                return res.status(400).json({
                    success: false,
                    message: 'Debe proporcionar al menos un campo para actualizar'
                });
            }

            const listaActualizada = await Lista.actualizar(idLista, {
                nombre: nombre?.trim(),
                color,
                icono,
                importante,
                idCategoria
            }, idUsuario);

            if (!listaActualizada) {
                return res.status(404).json({
                    success: false,
                    message: 'Lista no encontrada'
                });
            }

            res.status(200).json({
                success: true,
                message: 'Lista actualizada exitosamente',
                data: listaActualizada
            });
        } catch (error) {
            console.error('Error en actualizarLista:', error);
            res.status(500).json({
                success: false,
                message: 'Error al actualizar la lista',
                error: error.message
            });
        }
    },

    // Eliminar lista
    eliminarLista: async (req, res) => {
        try {
            const { idLista } = req.params;
            const idUsuario = req.usuario.idUsuario;
            const eliminada = await Lista.eliminar(idLista, idUsuario);

            if (!eliminada) {
                return res.status(404).json({
                    success: false,
                    message: 'Lista no encontrada'
                });
            }

            res.status(200).json({
                success: true,
                message: 'Lista eliminada exitosamente'
            });
        } catch (error) {
            console.error('Error en eliminarLista:', error);
            res.status(500).json({
                success: false,
                message: 'Error al eliminar la lista',
                error: error.message
            });
        }
    },

    // Obtener lista con sus tareas
    obtenerConTareas: async (req, res) => {
        try {
            const { idLista } = req.params;
            const idUsuario = req.usuario.idUsuario; // Obtener ID del usuario autenticado

            //console.log('obtenerConTareas:', { idLista, idUsuario });

            // El middleware verificarPermisoLista('ver') ya validó acceso
            // Pasar idUsuario al modelo para obtener miDia personalizado
            const lista = await Lista.obtenerConTareas(idLista, idUsuario);

            if (!lista) {
                return res.status(404).json({
                    success: false,
                    message: 'Lista no encontrada'
                });
            }

            /*console.log('Lista obtenida con tareas:', {
                idLista: lista.idLista,
                nombre: lista.nombre,
                totalTareas: lista.tareas.length,
                tareasConMiDia: lista.tareas.filter(t => t.miDia).length
            });*/

            res.status(200).json({
                success: true,
                data: lista
            });
        } catch (error) {
            //console.error(' Error en obtenerConTareas:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener la lista con tareas',
                error: error.message
            });
        }
    },

    // Obtener listas por categoría
    obtenerPorCategoria: async (req, res) => {
        try {
            const { idCategoria } = req.params;
            const idUsuario = req.usuario.idUsuario;
            const listas = await Lista.obtenerPorCategoria(idCategoria, idUsuario);

            res.status(200).json({
                success: true,
                count: listas.length,
                data: listas
            });
        } catch (error) {
            //console.error('Error en obtenerPorCategoria:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener listas por categoría',
                error: error.message
            });
        }
    },

    // Obtener listas sin categoría
    obtenerSinCategoria: async (req, res) => {
        try {
            const idUsuario = req.usuario.idUsuario;
            const listas = await Lista.obtenerSinCategoria(idUsuario);

            res.status(200).json({
                success: true,
                count: listas.length,
                data: listas
            });
        } catch (error) {
            //console.error('Error en obtenerSinCategoria:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener listas sin categoría',
                error: error.message
            });
        }
    },

    // Obtener estadísticas de la lista
    obtenerEstadisticas: async (req, res) => {
        try {
            const { idLista } = req.params;
            // El middleware verificarPermisoLista('ver') ya validó acceso
            const estadisticas = await Lista.contarTareas(idLista);

            res.status(200).json({
                success: true,
                data: estadisticas
            });
        } catch (error) {
            //console.error('Error en obtenerEstadisticas:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener estadísticas',
                error: error.message
            });
        }
    },
    // Obtener listas importantes
    obtenerImportantes: async (req, res) => {
        try {
            const idUsuario = req.usuario.idUsuario;
            const listas = await Lista.obtenerImportantes(idUsuario);

            res.status(200).json({
                success: true,
                count: listas.length,
                data: listas
            });
        } catch (error) {
            //console.error('Error en obtenerImportantes:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener listas importantes',
                error: error.message
            });
        }
    }
};

module.exports = listaController;