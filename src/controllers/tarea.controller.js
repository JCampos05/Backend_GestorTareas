const Tarea = require('../models/tarea');

const tareaController = {
    crearTarea: async (req, res) => {
        try {
            const {
                nombre, descripcion, prioridad, estado, fechaVencimiento,
                pasos, notas, recordatorio, repetir, tipoRepeticion,
                configRepeticion, idLista
            } = req.body;

            const idUsuario = req.usuario.idUsuario;

            // Validación básica
            if (!nombre || nombre.trim() === '') {
                return res.status(400).json({
                    success: false,
                    message: 'El nombre de la tarea es requerido'
                });
            }

            // Validar prioridad
            if (prioridad && !['A', 'N', 'B'].includes(prioridad)) {
                return res.status(400).json({
                    success: false,
                    message: 'Prioridad inválida. Use A (Alta), N (Normal) o B (Baja)'
                });
            }

            // Validar estado
            if (estado && !['C', 'P', 'N'].includes(estado)) {
                return res.status(400).json({
                    success: false,
                    message: 'Estado inválido. Use C (Completada), P (Pendiente) o N (En progreso)'
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
                idLista: idLista || null
            });

            res.status(201).json({
                success: true,
                message: 'Tarea creada exitosamente',
                data: nuevaTarea
            });
        } catch (error) {
            console.error('Error en crearTarea:', error);
            res.status(500).json({
                success: false,
                message: 'Error al crear la tarea',
                error: error.message
            });
        }
    },

    // Obtener todas las tareas
    obtenerTareas: async (req, res) => {
        try {
            const idUsuario = req.usuario.idUsuario;
            const tareas = await Tarea.obtenerTodas(idUsuario);

            res.status(200).json({
                success: true,
                count: tareas.length,
                data: tareas
            });
        } catch (error) {
            console.error('Error en obtenerTareas:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener las tareas',
                error: error.message
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
                    message: 'Tarea no encontrada'
                });
            }

            res.status(200).json({
                success: true,
                data: tarea
            });
        } catch (error) {
            console.error('Error en obtenerTareaPorId:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener la tarea',
                error: error.message
            });
        }
    },

    actualizarTarea: async (req, res) => {
        try {
            const { id } = req.params;
            const idUsuario = req.usuario.idUsuario;
            const {
                nombre, descripcion, prioridad, estado, fechaVencimiento,
                pasos, notas, recordatorio, repetir, tipoRepeticion,
                configRepeticion, idLista
            } = req.body;

            // Validar que exista al menos un campo para actualizar
            const hayCambios = nombre || descripcion || prioridad || estado ||
                fechaVencimiento || pasos || notas || recordatorio ||
                repetir !== undefined || tipoRepeticion ||
                configRepeticion || idLista !== undefined;

            if (!hayCambios) {
                return res.status(400).json({
                    success: false,
                    message: 'Debe proporcionar al menos un campo para actualizar'
                });
            }

            // Validar prioridad si se proporciona
            if (prioridad && !['A', 'N', 'B'].includes(prioridad)) {
                return res.status(400).json({
                    success: false,
                    message: 'Prioridad inválida'
                });
            }

            // Validar estado si se proporciona
            if (estado && !['C', 'P', 'N'].includes(estado)) {
                return res.status(400).json({
                    success: false,
                    message: 'Estado inválido'
                });
            }

            const tareaActualizada = await Tarea.actualizar(id, {
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
                idLista
            }, idUsuario);

            if (!tareaActualizada) {
                return res.status(404).json({
                    success: false,
                    message: 'Tarea no encontrada'
                });
            }

            res.status(200).json({
                success: true,
                message: 'Tarea actualizada exitosamente',
                data: tareaActualizada
            });
        } catch (error) {
            console.error('Error en actualizarTarea:', error);
            res.status(500).json({
                success: false,
                message: 'Error al actualizar la tarea',
                error: error.message
            });
        }
    },

    // Eliminar tarea
    eliminarTarea: async (req, res) => {
        try {
            const { id } = req.params;
            const idUsuario = req.usuario.idUsuario;
            const eliminada = await Tarea.eliminar(id, idUsuario);

            console.log(id)
            console.log(eliminada)

            if (!eliminada) {
                return res.status(404).json({
                    success: false,
                    message: 'Tarea no encontrada'
                });
            }

            res.status(200).json({
                success: true,
                message: 'Tarea eliminada exitosamente'
            });
        } catch (error) {
            console.error('Error en eliminarTarea:', error);
            res.status(500).json({
                success: false,
                message: 'Error al eliminar la tarea',
                error: error.message
            });
        }
    },

    // Cambiar estado de tarea
    cambiarEstado: async (req, res) => {
        try {
            const { id } = req.params;
            const { estado } = req.body;
            const idUsuario = req.usuario.idUsuario;

            console.log('📝 cambiarEstado llamado:', { id, estado, idUsuario });

            if (!estado) {
                console.log('❌ Estado no proporcionado');
                return res.status(400).json({
                    success: false,
                    message: 'El estado es requerido'
                });
            }

            if (!['C', 'P', 'N'].includes(estado)) {
                console.log('❌ Estado inválido:', estado);
                return res.status(400).json({
                    success: false,
                    message: 'Estado inválido. Use C (Completada), P (Pendiente) o N (En progreso)'
                });
            }

            console.log('✅ Validaciones pasadas, llamando a Tarea.cambiarEstado...');
            const tareaActualizada = await Tarea.cambiarEstado(id, estado, idUsuario);

            if (!tareaActualizada) {
                console.log('❌ Tarea no encontrada o sin permisos');
                return res.status(404).json({
                    success: false,
                    message: 'Tarea no encontrada'
                });
            }

            console.log('✅ Estado actualizado exitosamente');
            res.status(200).json({
                success: true,
                message: 'Estado actualizado exitosamente',
                data: tareaActualizada
            });
        } catch (error) {
            console.error('❌ Error en cambiarEstado:', error);
            res.status(500).json({
                success: false,
                message: 'Error al cambiar el estado',
                error: error.message
            });
        }
    },

    // Obtener tareas por estado
    obtenerPorEstado: async (req, res) => {
        try {
            const { estado } = req.params;
            const idUsuario = req.usuario.idUsuario;

            if (!['C', 'P', 'N'].includes(estado)) {
                return res.status(400).json({
                    success: false,
                    message: 'Estado inválido'
                });
            }

            const tareas = await Tarea.obtenerPorEstado(estado, idUsuario);

            res.status(200).json({
                success: true,
                count: tareas.length,
                data: tareas
            });
        } catch (error) {
            console.error('Error en obtenerPorEstado:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener tareas por estado',
                error: error.message
            });
        }
    },

    // Obtener tareas por prioridad
    obtenerPorPrioridad: async (req, res) => {
        try {
            const { prioridad } = req.params;
            const idUsuario = req.usuario.idUsuario;

            if (!['A', 'N', 'B'].includes(prioridad)) {
                return res.status(400).json({
                    success: false,
                    message: 'Prioridad inválida'
                });
            }

            const tareas = await Tarea.obtenerPorPrioridad(prioridad, idUsuario);

            res.status(200).json({
                success: true,
                count: tareas.length,
                data: tareas
            });
        } catch (error) {
            console.error('Error en obtenerPorPrioridad:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener tareas por prioridad',
                error: error.message
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
                data: tareas
            });
        } catch (error) {
            console.error('Error en obtenerVencidas:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener tareas vencidas',
                error: error.message
            });
        }
    },

    // Obtener tareas por lista
    obtenerPorLista: async (req, res) => {
        try {
            const { idLista } = req.params;
            const idUsuario = req.usuario.idUsuario;
            const tareas = await Tarea.obtenerPorLista(idLista, idUsuario);

            res.status(200).json({
                success: true,
                count: tareas.length,
                data: tareas
            });
        } catch (error) {
            console.error('Error en obtenerPorLista:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener tareas por lista',
                error: error.message
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
                    message: 'El campo miDia es requerido'
                });
            }

            const tareaActualizada = await Tarea.alternarMiDia(id, miDia, idUsuario);

            if (!tareaActualizada) {
                return res.status(404).json({
                    success: false,
                    message: 'Tarea no encontrada'
                });
            }

            res.status(200).json({
                success: true,
                message: 'Mi Día actualizado exitosamente',
                data: tareaActualizada
            });
        } catch (error) {
            console.error('Error en alternarMiDia:', error);
            res.status(500).json({
                success: false,
                message: 'Error al actualizar Mi Día',
                error: error.message
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
                data: tareas
            });
        } catch (error) {
            console.error('Error en obtenerMiDia:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener tareas de Mi Día',
                error: error.message
            });
        }
    }
};

module.exports = tareaController;