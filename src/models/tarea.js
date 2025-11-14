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
    // Método helper para verificar permisos
    static async verificarPermisos(idTarea, idUsuario, accion) {
        try {
            console.log(`🔍 Verificando permisos: tarea=${idTarea}, usuario=${idUsuario}, accion=${accion}`);

            const [tareaRows] = await db.execute(
                'SELECT t.*, l.idUsuario as idPropietarioLista FROM tarea t LEFT JOIN lista l ON t.idLista = l.idLista WHERE t.idTarea = ?',
                [idTarea]
            );

            if (tareaRows.length === 0) {
                console.log('❌ Tarea no encontrada');
                return { permiso: false, motivo: 'Tarea no encontrada' };
            }

            const tarea = tareaRows[0];
            console.log('📋 Tarea encontrada:', {
                idTarea: tarea.idTarea,
                idUsuario: tarea.idUsuario,
                idLista: tarea.idLista,
                idPropietarioLista: tarea.idPropietarioLista
            });

            // 1️⃣ Es propietario de la tarea
            if (tarea.idUsuario === idUsuario) {
                console.log('✅ Es propietario de la tarea');
                return { permiso: true, tarea };
            }

            // 2️⃣ Es propietario de la lista
            if (tarea.idPropietarioLista === idUsuario) {
                console.log('✅ Es propietario de la lista');
                return { permiso: true, tarea };
            }

            // 3️⃣ Verificar permisos compartidos
            if (tarea.idLista) {
                console.log('🔍 Verificando permisos compartidos en lista', tarea.idLista);

                const [permisosRows] = await db.execute(
                    `SELECT rol FROM lista_compartida 
                WHERE idLista = ? AND idUsuario = ? AND activo = TRUE AND aceptado = TRUE`,
                    [tarea.idLista, idUsuario]
                );

                if (permisosRows.length > 0) {
                    const rol = permisosRows[0].rol;
                    console.log('👤 Rol encontrado:', rol);

                    const permisosRol = {
                        ver: ['admin', 'editor', 'colaborador', 'visor'],
                        editar: ['admin', 'editor', 'colaborador'],
                        eliminar: ['admin', 'editor']
                    };

                    if (permisosRol[accion]?.includes(rol)) {
                        console.log(`✅ Rol "${rol}" tiene permiso para "${accion}"`);
                        return { permiso: true, tarea, rol };
                    }

                    console.log(`❌ Rol "${rol}" NO tiene permiso para "${accion}"`);
                    return { permiso: false, motivo: `Rol "${rol}" no permite ${accion}`, rol };
                }

                console.log('❌ No hay permisos compartidos');
            }

            console.log('❌ Sin permisos');
            return { permiso: false, motivo: 'Sin permisos' };

        } catch (error) {
            console.error('❌ Error en verificarPermisos:', error);
            return { permiso: false, motivo: 'Error al verificar permisos', error: error.message };
        }
    }
    static async crear(tareaData) {
        try {
            const query = `
                INSERT INTO tarea (
                    nombre, descripcion, prioridad, estado, fechaVencimiento, 
                    miDia, pasos, notas, recordatorio, repetir, tipoRepeticion, 
                    configRepeticion, idLista, idUsuario
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const [result] = await db.execute(query, [
                tareaData.nombre,
                tareaData.descripcion || null,
                tareaData.prioridad || 'N',
                tareaData.estado || 'P',
                tareaData.fechaVencimiento || null,
                tareaData.miDia || false,
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

    // Obtener todas las tareas CON información de la lista
    static async obtenerTodas(idUsuario) {
        try {
            const query = `
                SELECT 
                    t.*,
                    l.nombre as nombreLista,
                    l.icono as iconoLista,
                    l.color as colorLista,
                    l.importante as importante
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

    // Obtener tarea por ID CON información de la lista
    static async obtenerPorId(id, idUsuario) {
        try {
            // ✅ Verificar permisos de lectura
            const { permiso, tarea } = await this.verificarPermisos(id, idUsuario, 'ver');

            if (!permiso) {
                return null;
            }
            const query = `
                SELECT 
                    t.*,
                    l.nombre as nombreLista,
                    l.icono as iconoLista,
                    l.color as colorLista,
                    l.importante as importante
                FROM tarea t
                LEFT JOIN lista l ON t.idLista = l.idLista
                WHERE t.idTarea = ? 
            `;
            const [rows] = await db.execute(query, [id]);

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
            const { permiso, tarea, motivo } = await this.verificarPermisos(id, idUsuario, 'editar');

            if (!permiso) {
                console.log('❌ Sin permisos para actualizar:', motivo);
                return null;
            }
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
            if (tareaData.miDia !== undefined) {
                campos.push('miDia = ?');
                valores.push(tareaData.miDia);
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
            //valores.push(idUsuario);
            const query = `UPDATE tarea SET ${campos.join(', ')} WHERE idTarea = ?`;

            const [result] = await db.execute(query, valores);

            if (result.affectedRows === 0) {
                return null;
            }
            // Retornar tarea actualizada
            const [tareaActualizada] = await db.execute(
                `SELECT t.*, l.nombre as nombreLista, l.icono as iconoLista, 
                    l.color as colorLista, l.importante as importante
                    FROM tarea t LEFT JOIN lista l ON t.idLista = l.idLista 
                    WHERE t.idTarea = ?`,
                [id]
            );

            return tareaActualizada[0];
            //return await this.obtenerPorId(id, idUsuario);
        } catch (error) {
            throw new Error(`Error al actualizar tarea: ${error.message}`);
        }
    }

    // Eliminar tarea
    static async eliminar(id, idUsuario) {
        try {
            // ✅ Verificar permisos primero (solo admin y editor pueden eliminar)
            const { permiso, motivo } = await this.verificarPermisos(id, idUsuario, 'eliminar');

            if (!permiso) {
                console.log('❌ Sin permisos para eliminar:', motivo);
                return false;
            }

            // ✅ Eliminar SIN filtro de idUsuario
            const query = 'DELETE FROM tarea WHERE idTarea = ?';
            const [result] = await db.execute(query, [id]);

            return result.affectedRows > 0;
        } catch (error) {
            throw new Error(`Error al eliminar tarea: ${error.message}`);
        }
    }

    // Cambiar estado de tarea
    static async cambiarEstado(id, estado, idUsuario) {
        try {
            console.log('🔧 Tarea.cambiarEstado:', { id, estado, idUsuario });

            // 1️⃣ Primero obtener la tarea para saber si está en una lista
            const [tareaRows] = await db.execute(
                'SELECT t.*, l.idUsuario as idPropietarioLista FROM tarea t LEFT JOIN lista l ON t.idLista = l.idLista WHERE t.idTarea = ?',
                [id]
            );

            if (tareaRows.length === 0) {
                console.log('❌ Tarea no encontrada:', id);
                return null;
            }

            const tarea = tareaRows[0];
            console.log('📋 Tarea encontrada:', { idTarea: tarea.idTarea, idUsuario: tarea.idUsuario, idLista: tarea.idLista });

            // 2️⃣ Verificar permisos
            let tienePermiso = false;

            // Es el propietario de la tarea
            if (tarea.idUsuario === idUsuario) {
                console.log('✅ Es propietario de la tarea');
                tienePermiso = true;
            }
            // Es el propietario de la lista
            else if (tarea.idPropietarioLista === idUsuario) {
                console.log('✅ Es propietario de la lista');
                tienePermiso = true;
            }
            // Verificar permisos compartidos
            else if (tarea.idLista) {
                const [permisosRows] = await db.execute(
                    `SELECT rol FROM lista_compartida 
         WHERE idLista = ? AND idUsuario = ? AND activo = TRUE AND aceptado = TRUE`,
                    [tarea.idLista, idUsuario]
                );

                if (permisosRows.length > 0) {
                    const rol = permisosRows[0].rol;
                    console.log('🔍 Rol en lista compartida:', rol);

                    // admin, editor, colaborador pueden editar
                    if (['admin', 'editor', 'colaborador'].includes(rol)) {
                        console.log('✅ Tiene permisos por rol compartido');
                        tienePermiso = true;
                    }
                }
            }

            if (!tienePermiso) {
                console.log('❌ Sin permisos para modificar esta tarea');
                return null;
            }

            // 3️⃣ Actualizar estado
            console.log('💾 Actualizando estado en BD...');
            const [result] = await db.execute(
                'UPDATE tarea SET estado = ? WHERE idTarea = ?',
                [estado, id]
            );

            if (result.affectedRows === 0) {
                console.log('❌ No se actualizó ninguna fila');
                return null;
            }

            console.log('✅ Estado actualizado correctamente');

            // 4️⃣ Retornar tarea actualizada
            const [tareaActualizada] = await db.execute(
                'SELECT * FROM tarea WHERE idTarea = ?',
                [id]
            );

            return tareaActualizada[0];

        } catch (error) {
            console.error('❌ Error en Tarea.cambiarEstado:', error);
            throw error;
        }
    }

    // Obtener tareas por estado CON información de la lista
    static async obtenerPorEstado(estado, idUsuario) {
        try {
            const query = `
                SELECT 
                    t.*,
                    l.nombre as nombreLista,
                    l.icono as iconoLista,
                    l.color as colorLista,
                    l.importante as importante
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

    // Obtener tareas por prioridad CON información de la lista
    static async obtenerPorPrioridad(prioridad, idUsuario) {
        try {
            const query = `
                SELECT 
                    t.*,
                    l.nombre as nombreLista,
                    l.icono as iconoLista,
                    l.color as colorLista,
                    l.importante as importante
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

    // Obtener tareas vencidas CON información de la lista
    static async obtenerVencidas(idUsuario) {
        try {
            const query = `
                SELECT 
                    t.*,
                    l.nombre as nombreLista,
                    l.icono as iconoLista,
                    l.color as colorLista,
                    l.importante as importante
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

    // Obtener tareas por lista CON información de la lista
    static async obtenerPorLista(idLista, idUsuario) {
        try {
            const query = `
                SELECT 
                    t.*,
                    l.nombre as nombreLista,
                    l.icono as iconoLista,
                    l.color as colorLista,
                    l.importante as importante
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

    // Nuevo método para alternar Mi Día
    static async alternarMiDia(id, miDia, idUsuario) {
        try {
            return await this.actualizar(id, { miDia }, idUsuario);
        } catch (error) {
            throw new Error(`Error al alternar Mi Día: ${error.message}`);
        }
    }

    // Nuevo método para obtener tareas de Mi Día
    static async obtenerMiDia(idUsuario) {
        try {
            const query = `
                SELECT 
                    t.*,
                    l.nombre as nombreLista,
                    l.icono as iconoLista,
                    l.color as colorLista,
                    l.importante as importante
                FROM tarea t
                LEFT JOIN lista l ON t.idLista = l.idLista
                WHERE t.miDia = TRUE 
                AND t.estado != 'C'
                AND t.idUsuario = ?
                ORDER BY t.fechaCreacion DESC
            `;
            const [rows] = await db.execute(query, [idUsuario]);
            return rows;
        } catch (error) {
            throw new Error(`Error al obtener tareas de Mi Día: ${error.message}`);
        }
    }
}

module.exports = Tarea;