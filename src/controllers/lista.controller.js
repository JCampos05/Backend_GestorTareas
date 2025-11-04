const Lista = require('../models/lista');

const listaController = {
    // Crear nueva lista
    crearLista: async (req, res) => {
        try {
            const { nombre, color, icono, idCategoria } = req.body;
            const idUsuario = req.usuario.idUsuario;

            if (!nombre || nombre.trim() === '') {
                return res.status(400).json({
                    success: false,
                    message: 'El nombre de la lista es requerido'
                });
            }

            const nuevaLista = await Lista.crear({
                nombre: nombre.trim(),
                color: color || null,
                icono: icono || null,
                idCategoria: idCategoria || null,
                idUsuario
            });

            res.status(201).json({
                success: true,
                message: 'Lista creada exitosamente',
                data: nuevaLista
            });
        } catch (error) {
            console.error('Error en crearLista:', error);
            res.status(500).json({
                success: false,
                message: 'Error al crear la lista',
                error: error.message
            });
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
            const { id } = req.params;
            const idUsuario = req.usuario.idUsuario;
            const lista = await Lista.obtenerPorId(id, idUsuario);

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
            const { id } = req.params;
            const { nombre, color, icono, idCategoria } = req.body;
            const idUsuario = req.usuario.idUsuario;

            if (!nombre && !color && !icono && idCategoria === undefined) {
                return res.status(400).json({
                    success: false,
                    message: 'Debe proporcionar al menos un campo para actualizar'
                });
            }

            const listaActualizada = await Lista.actualizar(id, {
                nombre: nombre?.trim(),
                color,
                icono,
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
            const { id } = req.params;
            const idUsuario = req.usuario.idUsuario;
            const eliminada = await Lista.eliminar(id, idUsuario);

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
            const { id } = req.params;
            const idUsuario = req.usuario.idUsuario;
            const lista = await Lista.obtenerConTareas(id, idUsuario);

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
            console.error('Error en obtenerConTareas:', error);
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
            console.error('Error en obtenerPorCategoria:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener listas por categoría',
                error: error.message
            });
        }
    },

    // Obtener estadísticas de la lista
    obtenerEstadisticas: async (req, res) => {
        try {
            const { id } = req.params;
            const idUsuario = req.usuario.idUsuario;
            const estadisticas = await Lista.contarTareas(id, idUsuario);

            res.status(200).json({
                success: true,
                data: estadisticas
            });
        } catch (error) {
            console.error('Error en obtenerEstadisticas:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener estadísticas',
                error: error.message
            });
        }
    }
};

module.exports = listaController;