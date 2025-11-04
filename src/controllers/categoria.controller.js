const Categoria = require('../models/categoria');

const categoriaController = {
    // Crear nueva categoría
    crearCategoria: async (req, res) => {
        try {
            const { nombre } = req.body;
            const idUsuario = req.usuario.idUsuario;

            if (!nombre || nombre.trim() === '') {
                return res.status(400).json({
                    success: false,
                    message: 'El nombre de la categoría es requerido'
                });
            }

            const nuevaCategoria = await Categoria.crear({ 
                nombre: nombre.trim(), 
                idUsuario: idUsuario
            });

            res.status(201).json({
                success: true,
                message: 'Categoría creada exitosamente',
                data: nuevaCategoria
            });
        } catch (error) {
            console.error('Error en crearCategoria:', error);
            res.status(500).json({
                success: false,
                message: 'Error al crear la categoría',
                error: error.message
            });
        }
    },

    // Obtener todas las categorías
    obtenerCategorias: async (req, res) => {
        try {
            const idUsuario = req.usuario.idUsuario;
            const categorias = await Categoria.obtenerTodas(idUsuario);
            
            res.status(200).json({
                success: true,
                count: categorias.length,
                data: categorias
            });
        } catch (error) {
            console.error('Error en obtenerCategorias:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener las categorías',
                error: error.message
            });
        }
    },

    // Obtener categoría por ID
    obtenerCategoriaPorId: async (req, res) => {
        try {
            const { id } = req.params;
            const idUsuario = req.usuario.idUsuario;
            const categoria = await Categoria.obtenerPorId(id, idUsuario);

            if (!categoria) {
                return res.status(404).json({
                    success: false,
                    message: 'Categoría no encontrada'
                });
            }

            res.status(200).json({
                success: true,
                data: categoria
            });
        } catch (error) {
            console.error('Error en obtenerCategoriaPorId:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener la categoría',
                error: error.message
            });
        }
    },

    // Actualizar categoría
    actualizarCategoria: async (req, res) => {
        try {
            const { id } = req.params;
            const { nombre } = req.body;
            const idUsuario = req.usuario.idUsuario;

            if (!nombre || nombre.trim() === '') {
                return res.status(400).json({
                    success: false,
                    message: 'El nombre es requerido'
                });
            }

            const categoriaActualizada = await Categoria.actualizar(id, {
                nombre: nombre.trim()
            }, idUsuario);

            if (!categoriaActualizada) {
                return res.status(404).json({
                    success: false,
                    message: 'Categoría no encontrada'
                });
            }

            res.status(200).json({
                success: true,
                message: 'Categoría actualizada exitosamente',
                data: categoriaActualizada
            });
        } catch (error) {
            console.error('Error en actualizarCategoria:', error);
            res.status(500).json({
                success: false,
                message: 'Error al actualizar la categoría',
                error: error.message
            });
        }
    },

    // Eliminar categoría
    eliminarCategoria: async (req, res) => {
        try {
            const { id } = req.params;
            const idUsuario = req.usuario.idUsuario;
            const eliminada = await Categoria.eliminar(id, idUsuario);

            if (!eliminada) {
                return res.status(404).json({
                    success: false,
                    message: 'Categoría no encontrada'
                });
            }

            res.status(200).json({
                success: true,
                message: 'Categoría eliminada exitosamente'
            });
        } catch (error) {
            console.error('Error en eliminarCategoria:', error);
            res.status(500).json({
                success: false,
                message: 'Error al eliminar la categoría',
                error: error.message
            });
        }
    },

    // Obtener categoría con sus listas
    obtenerConListas: async (req, res) => {
        try {
            const { id } = req.params;
            const idUsuario = req.usuario.idUsuario;
            const categoria = await Categoria.obtenerConListas(id, idUsuario);

            if (!categoria) {
                return res.status(404).json({
                    success: false,
                    message: 'Categoría no encontrada'
                });
            }

            res.status(200).json({
                success: true,
                data: categoria
            });
        } catch (error) {
            console.error('Error en obtenerConListas:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener la categoría con listas',
                error: error.message
            });
        }
    }
};

module.exports = categoriaController;