const db = require('../config/config');

class Lista {
    constructor(data) {
        this.idLista = data.idLista;
        this.nombre = data.nombre;
        this.color = data.color || null;
        this.icono = data.icono || null;
        this.idCategoria = data.idCategoria || null;
        this.fechaCreacion = data.fechaCreacion;
    }

    // Crear una nueva lista
    static async crear(listaData) {
        try {
            const query = `
                INSERT INTO lista (nombre, color, icono, idCategoria, idUsuario)
                VALUES (?, ?, ?, ?, ?)
            `;
            
            const [result] = await db.execute(query, [
                listaData.nombre,
                listaData.color || null,
                listaData.icono || null,
                listaData.idCategoria || null,
                listaData.idUsuario
            ]);

            return {
                idLista: result.insertId,
                ...listaData,
                fechaCreacion: new Date()
            };
        } catch (error) {
            throw new Error(`Error al crear lista: ${error.message}`);
        }
    }

    // Obtener todas las listas
    static async obtenerTodas(idUsuario) {
        try {
            const query = `
                SELECT l.*, c.nombre as nombreCategoria
                FROM lista l
                LEFT JOIN categoria c ON l.idCategoria = c.idCategoria
                WHERE l.idUsuario = ?
                ORDER BY l.fechaCreacion DESC
            `;
            const [rows] = await db.execute(query, [idUsuario]);
            return rows;
        } catch (error) {
            throw new Error(`Error al obtener listas: ${error.message}`);
        }
    }

    // Obtener lista por ID
    static async obtenerPorId(id, idUsuario) {
        try {
            const query = `
                SELECT l.*, c.nombre as nombreCategoria
                FROM lista l
                LEFT JOIN categoria c ON l.idCategoria = c.idCategoria
                WHERE l.idLista = ? AND l.idUsuario = ?
            `;
            const [rows] = await db.execute(query, [id, idUsuario]);
            
            if (rows.length === 0) {
                return null;
            }
            
            return rows[0];
        } catch (error) {
            throw new Error(`Error al obtener lista: ${error.message}`);
        }
    }

    // Actualizar lista
    static async actualizar(id, listaData, idUsuario) {
        try {
            const campos = [];
            const valores = [];

            if (listaData.nombre !== undefined) {
                campos.push('nombre = ?');
                valores.push(listaData.nombre);
            }
            if (listaData.color !== undefined) {
                campos.push('color = ?');
                valores.push(listaData.color);
            }
            if (listaData.icono !== undefined) {
                campos.push('icono = ?');
                valores.push(listaData.icono);
            }
            if (listaData.idCategoria !== undefined) {
                campos.push('idCategoria = ?');
                valores.push(listaData.idCategoria);
            }

            if (campos.length === 0) {
                throw new Error('No hay campos para actualizar');
            }

            valores.push(id);
            const query = `UPDATE lista SET ${campos.join(', ')} WHERE idLista = ? AND idUsuario = ?`;
            valores.push(idUsuario);

            const [result] = await db.execute(query, valores);
            
            if (result.affectedRows === 0) {
                return null;
            }

            return await this.obtenerPorId(id, idUsuario);
        } catch (error) {
            throw new Error(`Error al actualizar lista: ${error.message}`);
        }
    }

    // Eliminar lista
    static async eliminar(id, idUsuario) {
        try {
            const query = 'DELETE FROM lista WHERE idLista = ? AND idUsuario = ?';
            const [result] = await db.execute(query, [id, idUsuario]);
            
            return result.affectedRows > 0;
        } catch (error) {
            throw new Error(`Error al eliminar lista: ${error.message}`);
        }
    }

    // Obtener lista con sus tareas
    static async obtenerConTareas(id, idUsuario) {
        try {
            const query = `
                SELECT l.*, c.nombre as nombreCategoria,
                        t.idTarea, t.nombre as nombreTarea, t.descripcion, t.prioridad, 
                        t.estado, t.fechaCreacion as fechaCreacionTarea, t.fechaVencimiento
                FROM lista l
                LEFT JOIN categoria c ON l.idCategoria = c.idCategoria
                LEFT JOIN tarea t ON l.idLista = t.idLista
                WHERE l.idLista = ? AND l.idUsuario = ?
                ORDER BY t.fechaCreacion DESC
            `;
            const [rows] = await db.execute(query,[ id, idUsuario]);
            
            if (rows.length === 0) {
                return null;
            }

            const lista = {
                idLista: rows[0].idLista,
                nombre: rows[0].nombre,
                color: rows[0].color,
                icono: rows[0].icono,
                idCategoria: rows[0].idCategoria,
                nombreCategoria: rows[0].nombreCategoria,
                fechaCreacion: rows[0].fechaCreacion,
                tareas: []
            };

            rows.forEach(row => {
                if (row.idTarea) {
                    lista.tareas.push({
                        idTarea: row.idTarea,
                        nombre: row.nombreTarea,
                        descripcion: row.descripcion,
                        prioridad: row.prioridad,
                        estado: row.estado,
                        fechaCreacion: row.fechaCreacionTarea,
                        fechaVencimiento: row.fechaVencimiento
                    });
                }
            });

            return lista;
        } catch (error) {
            throw new Error(`Error al obtener lista con tareas: ${error.message}`);
        }
    }

    // Obtener listas por categoría
    static async obtenerPorCategoria(idCategoria, idUsuario) {
        try {
            const query = `
                SELECT l.*, c.nombre as nombreCategoria
                FROM lista l
                LEFT JOIN categoria c ON l.idCategoria = c.idCategoria
                WHERE l.idCategoria = ? AND L.idUsuario = ?
                ORDER BY l.nombre ASC
            `;
            const [rows] = await db.execute(query, [idCategoria, idUsuario]);
            return rows;
        } catch (error) {
            throw new Error(`Error al obtener listas por categoría: ${error.message}`);
        }
    }

    // Contar tareas de una lista
    static async contarTareas(id, idUsuario) {
        try {
            const query = `
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN estado = 'C' THEN 1 ELSE 0 END) as completadas,
                    SUM(CASE WHEN estado = 'P' THEN 1 ELSE 0 END) as pendientes,
                    SUM(CASE WHEN estado = 'N' THEN 1 ELSE 0 END) as enProgreso
                FROM tarea
                WHERE idLista = ? AND idUsuario = ?
            `;
            const [rows] = await db.execute(query, [id, idUsuario]);
            return rows[0];
        } catch (error) {
            throw new Error(`Error al contar tareas: ${error.message}`);
        }
    }
}

module.exports = Lista;