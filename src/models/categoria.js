const db = require('../config/config');

class Categoria {
    constructor(data) {
        this.idCategoria = data.idCategoria;
        this.nombre = data.nombre;
    }

    // Crear una nueva categoría
    static async crear(categoriaData) {
        try {
            const {nombre, idUsuario} = categoriaData;
            const query = `INSERT INTO categoria (nombre, idUsuario) VALUES (?, ?)`;
            
            const [result] = await db.execute(query, [nombre, idUsuario]);

            return {
                idCategoria: result.insertId,
                nombre: categoriaData.nombre
            };
        } catch (error) {
            throw new Error(`Error al crear categoría: ${error.message}`);
        }
    }

    // Obtener todas las categorías
    static async obtenerTodas(idUsuario) {
        try {
            const query = 'SELECT * FROM categoria WHERE idUsuario = ? ORDER BY nombre ASC';
            const [rows] = await db.execute(query, [idUsuario]);
            return rows.map(row => new Categoria(row));
        } catch (error) {
            throw new Error(`Error al obtener categorías: ${error.message}`);
        }
    }

    // Obtener categoría por ID
    static async obtenerPorId(id, idUsuario) {
        try {
            const query = 'SELECT * FROM categoria WHERE idCategoria = ? AND idUsuario = ?';
            const [rows] = await db.execute(query, [id, idUsuario]);
            
            if (rows.length === 0) {
                return null;
            }
            
            return new Categoria(rows[0]);
        } catch (error) {
            throw new Error(`Error al obtener categoría: ${error.message}`);
        }
    }

    // Actualizar categoría
    static async actualizar(id, categoriaData, idUsuario) {
        try {
            if (!categoriaData.nombre) {
                throw new Error('El nombre es requerido');
            }

            const query = `UPDATE categoria SET nombre = ? WHERE idCategoria = ? AND idUsuario = ?`;
            const [result] = await db.execute(query, [categoriaData.nombre, id, idUsuario]);
            
            if (result.affectedRows === 0) {
                return null;
            }

            return await this.obtenerPorId(id, idUsuario);
        } catch (error) {
            throw new Error(`Error al actualizar categoría: ${error.message}`);
        }
    }

    // Eliminar categoría
    static async eliminar(id, idUsuario) {
        try {
            const query = 'DELETE FROM categoria WHERE idCategoria = ? AND idUsuario = ?';
            const [result] = await db.execute(query, [id, idUsuario]);
            
            return result.affectedRows > 0;
        } catch (error) {
            throw new Error(`Error al eliminar categoría: ${error.message}`);
        }
    }

    // Obtener categoría con sus listas
    static async obtenerConListas(id, idUsuario) {
        try {
            const query = `
                SELECT c.*, 
                    l.idLista, l.nombre as nombreLista, l.color, l.icono, l.fechaCreacion as fechaCreacionLista
                FROM categoria c
                LEFT JOIN lista l ON c.idCategoria = l.idCategoria
                WHERE c.idCategoria = ? AND c.idUsuario = ?
                ORDER BY l.nombre ASC
            `;
            const [rows] = await db.execute(query, [id, idUsuario]);
            
            if (rows.length === 0) {
                return null;
            }

            const categoria = {
                idCategoria: rows[0].idCategoria,
                nombre: rows[0].nombre,
                listas: []
            };

            rows.forEach(row => {
                if (row.idLista) {
                    categoria.listas.push({
                        idLista: row.idLista,
                        nombre: row.nombreLista,
                        color: row.color,
                        icono: row.icono,
                        fechaCreacion: row.fechaCreacionLista
                    });
                }
            });

            return categoria;
        } catch (error) {
            throw new Error(`Error al obtener categoría con listas: ${error.message}`);
        }
    }
}

module.exports = Categoria;