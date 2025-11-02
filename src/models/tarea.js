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
                    configRepeticion, idLista
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                tareaData.idLista || null
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
    static async obtenerTodas() {
        try {
            const query = 'SELECT * FROM tarea ORDER BY fechaCreacion DESC';
            const [rows] = await db.execute(query);
            return rows.map(row => new Tarea(row));
        } catch (error) {
            throw new Error(`Error al obtener tareas: ${error.message}`);
        }
    }

    // Obtener tarea por ID
    static async obtenerPorId(id) {
        try {
            const query = 'SELECT * FROM tarea WHERE idTarea = ?';
            const [rows] = await db.execute(query, [id]);
            
            if (rows.length === 0) {
                return null;
            }
            
            return new Tarea(rows[0]);
        } catch (error) {
            throw new Error(`Error al obtener tarea: ${error.message}`);
        }
    }

    static async actualizar(id, tareaData) {
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
            const query = `UPDATE tarea SET ${campos.join(', ')} WHERE idTarea = ?`;
            
            const [result] = await db.execute(query, valores);
            
            if (result.affectedRows === 0) {
                return null;
            }

            return await this.obtenerPorId(id);
        } catch (error) {
            throw new Error(`Error al actualizar tarea: ${error.message}`);
        }
    }

    // Eliminar tarea
    static async eliminar(id) {
        try {
            const query = 'DELETE FROM tarea WHERE idTarea = ?';
            const [result] = await db.execute(query, [id]);
            
            return result.affectedRows > 0;
        } catch (error) {
            throw new Error(`Error al eliminar tarea: ${error.message}`);
        }
    }

    // Cambiar estado de tarea
    static async cambiarEstado(id, nuevoEstado) {
        try {
            if (!['C', 'P', 'N'].includes(nuevoEstado)) {
                throw new Error('Estado inválido');
            }

            return await this.actualizar(id, { estado: nuevoEstado });
        } catch (error) {
            throw new Error(`Error al cambiar estado: ${error.message}`);
        }
    }

    // Obtener tareas por estado
    static async obtenerPorEstado(estado) {
        try {
            const query = 'SELECT * FROM tarea WHERE estado = ? ORDER BY fechaCreacion DESC';
            const [rows] = await db.execute(query, [estado]);
            return rows.map(row => new Tarea(row));
        } catch (error) {
            throw new Error(`Error al obtener tareas por estado: ${error.message}`);
        }
    }

    // Obtener tareas por prioridad
    static async obtenerPorPrioridad(prioridad) {
        try {
            const query = 'SELECT * FROM tarea WHERE prioridad = ? ORDER BY fechaCreacion DESC';
            const [rows] = await db.execute(query, [prioridad]);
            return rows.map(row => new Tarea(row));
        } catch (error) {
            throw new Error(`Error al obtener tareas por prioridad: ${error.message}`);
        }
    }

    // Obtener tareas vencidas
    static async obtenerVencidas() {
        try {
            const query = `
                SELECT * FROM tarea 
                WHERE fechaVencimiento < CURDATE() 
                AND estado != 'C'
                ORDER BY fechaVencimiento ASC
            `;
            const [rows] = await db.execute(query);
            return rows.map(row => new Tarea(row));
        } catch (error) {
            throw new Error(`Error al obtener tareas vencidas: ${error.message}`);
        }
    }

    // Obtener tareas por lista
    static async obtenerPorLista(idLista) {
        try {
            const query = 'SELECT * FROM tarea WHERE idLista = ? ORDER BY fechaCreacion DESC';
            const [rows] = await db.execute(query, [idLista]);
            return rows.map(row => new Tarea(row));
        } catch (error) {
            throw new Error(`Error al obtener tareas por lista: ${error.message}`);
        }
    }
}

module.exports = Tarea;