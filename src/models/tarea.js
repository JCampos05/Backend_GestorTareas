const db = require('../config/config');

class Tarea {
    constructor(data) {
        this.idTarea = data.idTarea;
        this.nombre = data.nombre;
        this.descripcion = data.descripcion || null;
        this.prioridad = data.prioridad || 'N';
        this.estado = data.estado || 'P';
        this.fechaCreacion = data.fechaCreacion;
        this.fechaVencimiento = data.fechaVencimiento || null;
        this.pasos = data.pasos || null;
        this.notas = data.notas || null;
        this.recordatorio = data.recordatorio || null;
        this.repetir = data.repetir || false;
        this.tipoRepeticion = data.tipoRepeticion || null;
        this.configRepeticion = data.configRepeticion || null;
        this.idLista = data.idLista || null;
    }

    static async crear(tareaData) {
        try {
            const query = `
                INSERT INTO tarea (
                    nombre, descripcion, prioridad, estado, fechaVencimiento, 
                    pasos, notas, recordatorio, repetir, tipoRepeticion, 
                    configRepeticion, idLista, idUsuario
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            const [result] = await db.execute(query, [
                tareaData.nombre,
                tareaData.descripcion || null,
                tareaData.prioridad || 'N',
                tareaData.estado || 'P',
                tareaData.fechaVencimiento || null,
                tareaData.pasos || null,
                tareaData.notas || null,
                tareaData.recordatorio || null,
                tareaData.repetir || false,
                tareaData.tipoRepeticion || null,
                tareaData.configRepeticion || null,
                tareaData.idLista || null,
                tareaData.idUsuario
            ]);

            return {
                idTarea: result.insertId,
                ...tareaData,
                fechaCreacion: new Date()
            };
        } catch (error) {
            throw new Error(`Error al crear tarea: ${error.message}`);
        }
    }

    // Obtener todas las tareas
    static async obtenerTodas(idUsuario) {
        try {
            const query = `
                SELECT 
                    t.*,
                    l.nombre as nombreLista,
                    l.icono as iconoLista,
                    l.color as colorLista
                FROM tarea t
                LEFT JOIN lista l ON t.idLista = l.idLista
                WHERE t.idUsuario = ?
                ORDER BY t.fechaCreacion DESC
            `;
            const [rows] = await db.execute(query, [idUsuario]);
            return rows;
        } catch (error) {
            throw new Error(`Error al obtener tareas: ${error.message}`);
        }
    }

    // Obtener tarea por ID
    static async obtenerPorId(id, idUsuario) {
        try {
            const query = `
                SELECT 
                    t.*,
                    l.nombre as nombreLista,
                    l.icono as iconoLista,
                    l.color as colorLista
                FROM tarea t
                LEFT JOIN lista l ON t.idLista = l.idLista
                WHERE t.idTarea = ? AND t.idUsuario = ?
            `;
            const [rows] = await db.execute(query, [id, idUsuario]);
            
            if (rows.length === 0) {
                return null;
            }
            
            return rows[0];
        } catch (error) {
            throw new Error(`Error al obtener tarea: ${error.message}`);
        }
    }

    static async actualizar(id, tareaData, idUsuario) {
        try {
            const campos = [];
            const valores = [];

            if (tareaData.nombre !== undefined) {
                campos.push('nombre = ?');
                valores.push(tareaData.nombre);
            }
            if (tareaData.descripcion !== undefined) {
                campos.push('descripcion = ?');
                valores.push(tareaData.descripcion);
            }
            if (tareaData.prioridad !== undefined) {
                campos.push('prioridad = ?');
                valores.push(tareaData.prioridad);
            }
            if (tareaData.estado !== undefined) {
                campos.push('estado = ?');
                valores.push(tareaData.estado);
            }
            if (tareaData.fechaVencimiento !== undefined) {
                campos.push('fechaVencimiento = ?');
                valores.push(tareaData.fechaVencimiento);
            }
            if (tareaData.pasos !== undefined) {
                campos.push('pasos = ?');
                valores.push(tareaData.pasos);
            }
            if (tareaData.notas !== undefined) {
                campos.push('notas = ?');
                valores.push(tareaData.notas);
            }
            if (tareaData.recordatorio !== undefined) {
                campos.push('recordatorio = ?');
                valores.push(tareaData.recordatorio);
            }
            if (tareaData.repetir !== undefined) {
                campos.push('repetir = ?');
                valores.push(tareaData.repetir);
            }
            if (tareaData.tipoRepeticion !== undefined) {
                campos.push('tipoRepeticion = ?');
                valores.push(tareaData.tipoRepeticion);
            }
            if (tareaData.configRepeticion !== undefined) {
                campos.push('configRepeticion = ?');
                valores.push(tareaData.configRepeticion);
            }
            if (tareaData.idLista !== undefined) {
                campos.push('idLista = ?');
                valores.push(tareaData.idLista);
            }

            if (campos.length === 0) {
                throw new Error('No hay campos para actualizar');
            }

            valores.push(id);
            valores.push(idUsuario);
            const query = `UPDATE tarea SET ${campos.join(', ')} WHERE idTarea = ? AND idUsuario = ?`;
            
            const [result] = await db.execute(query, valores);
            
            if (result.affectedRows === 0) {
                return null;
            }

            return await this.obtenerPorId(id, idUsuario);
        } catch (error) {
            throw new Error(`Error al actualizar tarea: ${error.message}`);
        }
    }

    // Eliminar tarea
    static async eliminar(id, idUsuario) {
        try {
            const query = 'DELETE FROM tarea WHERE idTarea = ? AND idUsuario = ?';
            const [result] = await db.execute(query, [id, idUsuario]);
            
            return result.affectedRows > 0;
        } catch (error) {
            throw new Error(`Error al eliminar tarea: ${error.message}`);
        }
    }

    // Cambiar estado de tarea
    static async cambiarEstado(id, nuevoEstado, idUsuario) {
        try {
            if (!['C', 'P', 'N'].includes(nuevoEstado)) {
                throw new Error('Estado inválido');
            }

            return await this.actualizar(id, { estado: nuevoEstado }, idUsuario);
        } catch (error) {
            throw new Error(`Error al cambiar estado: ${error.message}`);
        }
    }

    // Obtener tareas por estado
    static async obtenerPorEstado(estado, idUsuario) {
        try {
            const query = `
                SELECT 
                    t.*,
                    l.nombre as nombreLista,
                    l.icono as iconoLista,
                    l.color as colorLista
                FROM tarea t
                LEFT JOIN lista l ON t.idLista = l.idLista
                WHERE t.estado = ? AND t.idUsuario = ?
                ORDER BY t.fechaCreacion DESC
            `;
            const [rows] = await db.execute(query, [estado, idUsuario]);
            return rows;
        } catch (error) {
            throw new Error(`Error al obtener tareas por estado: ${error.message}`);
        }
    }

    // Obtener tareas por prioridad
    static async obtenerPorPrioridad(prioridad, idUsuario) {
        try {
            const query = `
                SELECT 
                    t.*,
                    l.nombre as nombreLista,
                    l.icono as iconoLista,
                    l.color as colorLista
                FROM tarea t
                LEFT JOIN lista l ON t.idLista = l.idLista
                WHERE t.prioridad = ? AND t.idUsuario = ?
                ORDER BY t.fechaCreacion DESC
            `;
            const [rows] = await db.execute(query, [prioridad, idUsuario]);
            return rows;
        } catch (error) {
            throw new Error(`Error al obtener tareas por prioridad: ${error.message}`);
        }
    }

    // Obtener tareas vencidas
    static async obtenerVencidas(idUsuario) {
        try {
            const query = `
                SELECT 
                    t.*,
                    l.nombre as nombreLista,
                    l.icono as iconoLista,
                    l.color as colorLista
                FROM tarea t
                LEFT JOIN lista l ON t.idLista = l.idLista
                WHERE t.fechaVencimiento < CURDATE() 
                AND t.estado != 'C'
                AND t.idUsuario = ?
                ORDER BY t.fechaVencimiento ASC
            `;
            const [rows] = await db.execute(query, [idUsuario]);
            return rows;
        } catch (error) {
            throw new Error(`Error al obtener tareas vencidas: ${error.message}`);
        }
    }

    // Obtener tareas por lista
    static async obtenerPorLista(idLista, idUsuario) {
        try {
            const query = `
                SELECT 
                    t.*,
                    l.nombre as nombreLista,
                    l.icono as iconoLista,
                    l.color as colorLista
                FROM tarea t
                LEFT JOIN lista l ON t.idLista = l.idLista
                WHERE t.idLista = ? AND t.idUsuario = ?
                ORDER BY t.fechaCreacion DESC
            `;
            const [rows] = await db.execute(query, [idLista, idUsuario]);
            return rows;
        } catch (error) {
            throw new Error(`Error al obtener tareas por lista: ${error.message}`);
        }
    }
}

module.exports = Tarea;