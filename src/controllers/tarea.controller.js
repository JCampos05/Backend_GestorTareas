const Tarea = require("../models/tarea");

const tareaController = {
    // ✅ NUEVO: Asignar tarea a usuario
    asignarTarea: async (req, res) => {
        try {
            const { id } = req.params;
            const { idUsuarioAsignado } = req.body;
            const idUsuarioQuienAsigna = req.usuario.idUsuario;

            if (!idUsuarioAsignado) {
                return res.status(400).json({
                    success: false,
                    message: "El ID del usuario a asignar es requerido",
                });
            }

            const resultado = await Tarea.asignarUsuario(
                id,
                idUsuarioAsignado,
                idUsuarioQuienAsigna
            );

            if (!resultado.success) {
                return res.status(403).json({
                    success: false,
                    message: resultado.message,
                });
            }

            res.status(200).json({
                success: true,
                message: resultado.message,
                data: resultado.tarea,
            });
        } catch (error) {
            console.error("Error en asignarTarea:", error);
            res.status(500).json({
                success: false,
                message: "Error al asignar la tarea",
                error: error.message,
            });
        }
    },

    // ✅ NUEVO: Desasignar tarea
    desasignarTarea: async (req, res) => {
        try {
            const { id } = req.params;
            const idUsuarioQuienDesasigna = req.usuario.idUsuario;

            const resultado = await Tarea.desasignarUsuario(
                id,
                idUsuarioQuienDesasigna
            );

            if (!resultado.success) {
                return res.status(403).json({
                    success: false,
                    message: resultado.message,
                });
            }

            res.status(200).json({
                success: true,
                message: resultado.message,
            });
        } catch (error) {
            console.error("Error en desasignarTarea:", error);
            res.status(500).json({
                success: false,
                message: "Error al desasignar la tarea",
                error: error.message,
            });
        }
    },

    // ✅ NUEVO: Obtener usuarios disponibles para asignar
    obtenerUsuariosDisponibles: async (req, res) => {
        try {
            const { idLista } = req.params;
            const idUsuario = req.usuario.idUsuario;

            const resultado = await Tarea.obtenerUsuariosDisponibles(
                idLista,
                idUsuario
            );

            if (!resultado.success) {
                return res.status(403).json({
                    success: false,
                    message: resultado.message,
                });
            }

            res.status(200).json({
                success: true,
                data: resultado.usuarios,
            });
        } catch (error) {
            console.error("Error en obtenerUsuariosDisponibles:", error);
            res.status(500).json({
                success: false,
                message: "Error al obtener usuarios disponibles",
                error: error.message,
            });
        }
    },

    crearTarea: async (req, res) => {
        try {
            const {
                nombre,
                descripcion,
                prioridad,
                estado,
                fechaVencimiento,
                pasos,
                notas,
                recordatorio,
                repetir,
                tipoRepeticion,
                configRepeticion,
                idLista,
            } = req.body;

            const idUsuario = req.usuario.idUsuario;

            // Validación básica
            if (!nombre || nombre.trim() === "") {
                return res.status(400).json({
                    success: false,
                    message: "El nombre de la tarea es requerido",
                });
            }

            // Validar prioridad
            if (prioridad && !["A", "N", "B"].includes(prioridad)) {
                return res.status(400).json({
                    success: false,
                    message: "Prioridad inválida. Use A (Alta), N (Normal) o B (Baja)",
                });
            }

            // Validar estado
            if (estado && !["C", "P", "N"].includes(estado)) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Estado inválido. Use C (Completada), P (Pendiente) o N (En progreso)",
                });
            }

            const nuevaTarea = await Tarea.crear({
                idUsuario,
                nombre: nombre.trim(),
                descripcion: descripcion?.trim(),
                prioridad,
                estado,
                fechaVencimiento,
                pasos,
                notas,
                recordatorio,
                repetir,
                tipoRepeticion,
                configRepeticion,
                idLista: idLista || null,
            });

            res.status(201).json({
                success: true,
                message: "Tarea creada exitosamente",
                data: nuevaTarea,
            });
        } catch (error) {
            console.error("Error en crearTarea:", error);
            res.status(500).json({
                success: false,
                message: "Error al crear la tarea",
                error: error.message,
            });
        }
    },

    // Obtener todas las tareas
    obtenerTareas: async (req, res) => {
        try {
            const idUsuario = req.usuario.idUsuario;

            // ✅ MODIFICADO: Obtener solo tareas sin asignar o asignadas al usuario actual
            let tareas = await Tarea.obtenerTodas(idUsuario);

            // Filtrar tareas: mostrar solo las que no están asignadas o están asignadas a este usuario
            tareas = tareas.filter((tarea) => {
                // Si no tiene usuario asignado, mostrarla
                if (!tarea.idUsuarioAsignado) {
                    return true;
                }
                // Si está asignada al usuario actual, mostrarla
                return tarea.idUsuarioAsignado === idUsuario;
            });

            res.status(200).json({
                success: true,
                count: tareas.length,
                data: tareas,
            });
        } catch (error) {
            console.error("Error en obtenerTareas:", error);
            res.status(500).json({
                success: false,
                message: "Error al obtener las tareas",
                error: error.message,
            });
        }
    },

    // Obtener tarea por ID
    obtenerTareaPorId: async (req, res) => {
        try {
            const { id } = req.params;
            const idUsuario = req.usuario.idUsuario;
            const tarea = await Tarea.obtenerPorId(id, idUsuario);

            if (!tarea) {
                return res.status(404).json({
                    success: false,
                    message: "Tarea no encontrada",
                });
            }

            res.status(200).json({
                success: true,
                data: tarea,
            });
        } catch (error) {
            console.error("Error en obtenerTareaPorId:", error);
            res.status(500).json({
                success: false,
                message: "Error al obtener la tarea",
                error: error.message,
            });
        }
    },

    actualizarTarea: async (req, res) => {
        try {
            const { id } = req.params;
            const idUsuario = req.usuario.idUsuario;
            const {
                nombre,
                descripcion,
                prioridad,
                estado,
                fechaVencimiento,
                pasos,
                notas,
                recordatorio,
                repetir,
                tipoRepeticion,
                configRepeticion,
                idLista,
            } = req.body;

            // Validar que exista al menos un campo para actualizar
            const hayCambios =
                nombre ||
                descripcion ||
                prioridad ||
                estado ||
                fechaVencimiento ||
                pasos ||
                notas ||
                recordatorio ||
                repetir !== undefined ||
                tipoRepeticion ||
                configRepeticion ||
                idLista !== undefined;

            if (!hayCambios) {
                return res.status(400).json({
                    success: false,
                    message: "Debe proporcionar al menos un campo para actualizar",
                });
            }

            // Validar prioridad si se proporciona
            if (prioridad && !["A", "N", "B"].includes(prioridad)) {
                return res.status(400).json({
                    success: false,
                    message: "Prioridad inválida",
                });
            }

            // Validar estado si se proporciona
            if (estado && !["C", "P", "N"].includes(estado)) {
                return res.status(400).json({
                    success: false,
                    message: "Estado inválido",
                });
            }

            const tareaActualizada = await Tarea.actualizar(
                id,
                {
                    nombre: nombre?.trim(),
                    descripcion: descripcion?.trim(),
                    prioridad,
                    estado,
                    fechaVencimiento,
                    pasos,
                    notas,
                    recordatorio,
                    repetir,
                    tipoRepeticion,
                    configRepeticion,
                    idLista,
                },
                idUsuario
            );

            if (!tareaActualizada) {
                return res.status(404).json({
                    success: false,
                    message: "Tarea no encontrada",
                });
            }

            res.status(200).json({
                success: true,
                message: "Tarea actualizada exitosamente",
                data: tareaActualizada,
            });
        } catch (error) {
            console.error("Error en actualizarTarea:", error);
            res.status(500).json({
                success: false,
                message: "Error al actualizar la tarea",
                error: error.message,
            });
        }
    },

    // Eliminar tarea
    eliminarTarea: async (req, res) => {
        try {
            const { id } = req.params;
            const idUsuario = req.usuario.idUsuario;
            const eliminada = await Tarea.eliminar(id, idUsuario);

            console.log(id);
            console.log(eliminada);

            if (!eliminada) {
                return res.status(404).json({
                    success: false,
                    message: "Tarea no encontrada",
                });
            }

            res.status(200).json({
                success: true,
                message: "Tarea eliminada exitosamente",
            });
        } catch (error) {
            console.error("Error en eliminarTarea:", error);
            res.status(500).json({
                success: false,
                message: "Error al eliminar la tarea",
                error: error.message,
            });
        }
    },

    // Cambiar estado de tarea
    cambiarEstado: async (req, res) => {
        try {
            const { id } = req.params;
            const { estado } = req.body;
            const idUsuario = req.usuario.idUsuario;

            console.log("📝 cambiarEstado llamado:", { id, estado, idUsuario });

            if (!estado) {
                console.log("❌ Estado no proporcionado");
                return res.status(400).json({
                    success: false,
                    message: "El estado es requerido",
                });
            }

            if (!["C", "P", "N"].includes(estado)) {
                console.log("❌ Estado inválido:", estado);
                return res.status(400).json({
                    success: false,
                    message:
                        "Estado inválido. Use C (Completada), P (Pendiente) o N (En progreso)",
                });
            }

            console.log("✅ Validaciones pasadas, llamando a Tarea.cambiarEstado...");
            const tareaActualizada = await Tarea.cambiarEstado(id, estado, idUsuario);

            if (!tareaActualizada) {
                console.log("❌ Tarea no encontrada o sin permisos");
                return res.status(404).json({
                    success: false,
                    message: "Tarea no encontrada",
                });
            }

            console.log("✅ Estado actualizado exitosamente");
            res.status(200).json({
                success: true,
                message: "Estado actualizado exitosamente",
                data: tareaActualizada,
            });
        } catch (error) {
            console.error("❌ Error en cambiarEstado:", error);
            res.status(500).json({
                success: false,
                message: "Error al cambiar el estado",
                error: error.message,
            });
        }
    },

    // Obtener tareas por estado
    obtenerPorEstado: async (req, res) => {
        try {
            const { estado } = req.params;
            const idUsuario = req.usuario.idUsuario;

            if (!["C", "P", "N"].includes(estado)) {
                return res.status(400).json({
                    success: false,
                    message: "Estado inválido",
                });
            }

            const tareas = await Tarea.obtenerPorEstado(estado, idUsuario);

            res.status(200).json({
                success: true,
                count: tareas.length,
                data: tareas,
            });
        } catch (error) {
            console.error("Error en obtenerPorEstado:", error);
            res.status(500).json({
                success: false,
                message: "Error al obtener tareas por estado",
                error: error.message,
            });
        }
    },

    // Obtener tareas por prioridad
    obtenerPorPrioridad: async (req, res) => {
        try {
            const { prioridad } = req.params;
            const idUsuario = req.usuario.idUsuario;

            if (!["A", "N", "B"].includes(prioridad)) {
                return res.status(400).json({
                    success: false,
                    message: "Prioridad inválida",
                });
            }

            const tareas = await Tarea.obtenerPorPrioridad(prioridad, idUsuario);

            res.status(200).json({
                success: true,
                count: tareas.length,
                data: tareas,
            });
        } catch (error) {
            console.error("Error en obtenerPorPrioridad:", error);
            res.status(500).json({
                success: false,
                message: "Error al obtener tareas por prioridad",
                error: error.message,
            });
        }
    },

    // Obtener tareas vencidas
    obtenerVencidas: async (req, res) => {
        try {
            const idUsuario = req.usuario.idUsuario;
            const tareas = await Tarea.obtenerVencidas(idUsuario);

            res.status(200).json({
                success: true,
                count: tareas.length,
                data: tareas,
            });
        } catch (error) {
            console.error("Error en obtenerVencidas:", error);
            res.status(500).json({
                success: false,
                message: "Error al obtener tareas vencidas",
                error: error.message,
            });
        }
    },

    // Obtener tareas por lista
    obtenerPorLista: async (req, res) => {
        try {
            const { idLista } = req.params;
            const idUsuario = req.usuario.idUsuario;

            let tareas = await Tarea.obtenerPorLista(idLista, idUsuario);

            // ✅ NUEVO: Filtrar tareas asignadas a otros usuarios
            tareas = tareas.filter((tarea) => {
                if (!tarea.idUsuarioAsignado) {
                    return true;
                }
                return tarea.idUsuarioAsignado === idUsuario;
            });

            res.status(200).json({
                success: true,
                count: tareas.length,
                data: tareas,
            });
        } catch (error) {
            console.error("Error en obtenerPorLista:", error);
            res.status(500).json({
                success: false,
                message: "Error al obtener tareas por lista",
                error: error.message,
            });
        }
    },

    // Alternar Mi Día
    alternarMiDia: async (req, res) => {
        try {
            const { id } = req.params;
            const { miDia } = req.body;
            const idUsuario = req.usuario.idUsuario;

            if (miDia === undefined) {
                return res.status(400).json({
                    success: false,
                    message: "El campo miDia es requerido",
                });
            }

            const tareaActualizada = await Tarea.alternarMiDia(id, Boolean(miDia), idUsuario);

            if (!tareaActualizada) {
                return res.status(404).json({
                    success: false,
                    message: "Tarea no encontrada",
                });
            }

            // ✅ NUEVO: Si la tarea pertenece a una lista compartida, notificar
            if (tareaActualizada.idLista) {
                const Lista = require("../models/lista");
                const lista = await Lista.obtenerPorId(
                    tareaActualizada.idLista,
                    idUsuario
                );

                if (lista && lista.compartida) {
                    // Obtener todos los colaboradores
                    const ListaCompartida = require("../models/listaCompartida");
                    const compartidos = await ListaCompartida.obtenerColaboradores(
                        lista.idLista
                    );

                    // Emitir evento via socket.io si está configurado
                    const io = req.app.get("io");
                    if (io) {
                        compartidos.forEach((colab) => {
                            io.to(`user_${colab.idUsuario}`).emit("tarea_actualizada", {
                                idTarea: tareaActualizada.idTarea,
                                miDia: tareaActualizada.miDia,
                                idLista: tareaActualizada.idLista,
                                accion: "mi_dia_actualizado",
                            });
                        });
                    }
                }
            }

            res.status(200).json({
                success: true,
                message: "Mi Día actualizado exitosamente",
                data: tareaActualizada,
            });
        } catch (error) {
            console.error("Error en alternarMiDia:", error);
            res.status(500).json({
                success: false,
                message: "Error al actualizar Mi Día",
                error: error.message,
            });
        }
    },

    // Obtener tareas de Mi Día
    obtenerMiDia: async (req, res) => {
        try {
            const idUsuario = req.usuario.idUsuario;
            const tareas = await Tarea.obtenerMiDia(idUsuario);

            res.status(200).json({
                success: true,
                count: tareas.length,
                data: tareas,
            });
        } catch (error) {
            console.error("Error en obtenerMiDia:", error);
            res.status(500).json({
                success: false,
                message: "Error al obtener tareas de Mi Día",
                error: error.message,
            });
        }
    },

    // ✅ NUEVO: Obtener todas las tareas de una lista (para asignación)
    obtenerTodasPorLista: async (req, res) => {
        try {
            const { idLista } = req.params;
            const idUsuario = req.usuario.idUsuario;

            const resultado = await Tarea.obtenerTodasPorLista(idLista, idUsuario);

            if (!resultado.success) {
                return res.status(403).json({
                    success: false,
                    message: resultado.message
                });
            }

            res.status(200).json({
                success: true,
                data: resultado.tareas
            });
        } catch (error) {
            console.error('Error en obtenerTodasPorLista:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener tareas de la lista',
                error: error.message
            });
        }
    },

    // Obtener listas por categoría
    // Obtener listas por categoría
    obtenerPorCategoria: async (req, res) => {
        try {
            const { idCategoria } = req.params;
            const idUsuario = req.usuario.idUsuario;
            const listas = await Lista.obtenerPorCategoria(idCategoria, idUsuario);

            // 🔍 LOG PARA DEBUGGING
            console.log('📦 Listas enviadas al frontend:');
            listas.forEach(l => {
                console.log(`  - ${l.nombre}: importante = ${l.importante} (tipo: ${typeof l.importante})`);
            });

            res.status(200).json({
                success: true,
                count: listas.length,
                data: listas
            });
        } catch (error) {
            console.error('Error en obtenerPorCategoria:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener listas por categoría',
                error: error.message
            });
        }
    },

    // ✅ NUEVO: Verificar y crear tareas repetidas
    verificarTareasRepetidas: async (req, res) => {
        try {
            const Tarea = require('../models/tarea');
            const db = require('../config/config');
            const notificacionController = require('./compartir/notificacion.controller');

            // Obtener tareas completadas con repetición activa
            const [tareasRepetir] = await db.execute(`
            SELECT t.*, u.idUsuario
            FROM tarea t
            INNER JOIN usuario u ON t.idUsuario = u.idUsuario
            WHERE t.repetir = 1 
                AND t.estado = 'C'
                AND t.fechaVencimiento <= NOW()
                AND (t.ultimaRepeticion IS NULL OR DATE(t.ultimaRepeticion) < CURDATE())
        `);

            console.log(`📋 Tareas a repetir encontradas: ${tareasRepetir.length}`);

            const tareasCreadas = [];

            for (const tarea of tareasRepetir) {
                // Calcular próxima fecha
                const proximaFecha = calcularProximaFecha(
                    tarea.fechaVencimiento,
                    tarea.tipoRepeticion,
                    tarea.configRepeticion
                );

                // Crear nueva tarea
                const nuevaTarea = await Tarea.crear({
                    idUsuario: tarea.idUsuario,
                    nombre: tarea.nombre,
                    descripcion: tarea.descripcion,
                    prioridad: tarea.prioridad,
                    estado: 'P',
                    fechaVencimiento: proximaFecha,
                    miDia: tarea.miDia,
                    pasos: tarea.pasos,
                    notas: tarea.notas,
                    recordatorio: tarea.recordatorio,
                    repetir: true,
                    tipoRepeticion: tarea.tipoRepeticion,
                    configRepeticion: tarea.configRepeticion,
                    idLista: tarea.idLista
                });

                // Crear notificación usando el controlador existente
                const connection = await db.getConnection();
                try {
                    await notificacionController.crearNotificacion(
                        connection,
                        tarea.idUsuario,
                        'tarea_repetir',
                        '🔄 Tarea repetida',
                        `Tu tarea "${tarea.nombre}" se ha programado nuevamente`,
                        {
                            tareaId: nuevaTarea.idTarea,
                            tareaNombre: tarea.nombre,
                            fechaVencimiento: proximaFecha
                        }
                    );
                    await connection.commit();
                } catch (error) {
                    await connection.rollback();
                    console.error('Error al crear notificación:', error);
                } finally {
                    connection.release();
                }

                // Actualizar fecha de última repetición
                await db.execute(
                    'UPDATE tarea SET ultimaRepeticion = NOW() WHERE idTarea = ?',
                    [tarea.idTarea]
                );

                tareasCreadas.push(nuevaTarea);
            }

            res.status(200).json({
                success: true,
                message: `Se crearon ${tareasCreadas.length} tareas repetidas`,
                data: tareasCreadas
            });

        } catch (error) {
            console.error('Error en verificarTareasRepetidas:', error);
            res.status(500).json({
                success: false,
                message: 'Error al verificar tareas repetidas',
                error: error.message
            });
        }
    },


};
//  Función auxiliar para calcular próxima fecha
function calcularProximaFecha(fechaBase, tipoRepeticion, configRepeticion) {
    const fecha = new Date(fechaBase);

    switch (tipoRepeticion) {
        case 'diario':
            fecha.setDate(fecha.getDate() + 1);
            break;
        case 'laborales':
            do {
                fecha.setDate(fecha.getDate() + 1);
            } while (fecha.getDay() === 0 || fecha.getDay() === 6);
            break;
        case 'semanal':
            fecha.setDate(fecha.getDate() + 7);
            break;
        case 'mensual':
            fecha.setMonth(fecha.getMonth() + 1);
            break;
        case 'personalizado':
            if (configRepeticion) {
                const config = typeof configRepeticion === 'string'
                    ? JSON.parse(configRepeticion)
                    : configRepeticion;

                switch (config.unidad) {
                    case 'dias':
                        fecha.setDate(fecha.getDate() + config.cada);
                        break;
                    case 'semanas':
                        fecha.setDate(fecha.getDate() + (config.cada * 7));
                        break;
                    case 'meses':
                        fecha.setMonth(fecha.getMonth() + config.cada);
                        break;
                    case 'años':
                        fecha.setFullYear(fecha.getFullYear() + config.cada);
                        break;
                }
            }
            break;
    }

    return fecha.toISOString().split('T')[0];
}

module.exports = tareaController;