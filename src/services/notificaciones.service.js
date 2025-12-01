const pool = require('../config/config');
const sseManager = require('../utils/sseManager');

class NotificacionesService {
    constructor() {
        this.intervalId = null;
        this.isRunning = false;
    }

    //Iniciar el servicio de notificaciones periódicas
    iniciar() {
        if (this.isRunning) {
            console.log('Servicio de notificaciones ya está ejecutándose');
            return;
        }

        /*console.log('===== INICIANDO SERVICIO DE NOTIFICACIONES =====');
        console.log('Frecuencia: Cada 60 segundos');
        console.log('Funciones:');
        console.log('   - Verificar recordatorios de tareas');
        console.log('   - Verificar tareas repetitivas');
        console.log('   - Enviar notificaciones SSE en tiempo real');
        console.log('====================================================\n');
        */
        this.isRunning = true;

        // Ejecutar inmediatamente al iniciar
        this.verificarNotificaciones();

        // Ejecutar cada 60 segundos
        this.intervalId = setInterval(() => {
            this.verificarNotificaciones();
        }, 60000); // 60 segundos
    }

    //Detener el servicio
    detener() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            this.isRunning = false;
            console.log('Servicio de notificaciones detenido\n');
        }
    }


    //Verificar y procesar todas las notificaciones pendientes
    async verificarNotificaciones() {
        const ahora = new Date();
        console.log(`\n [${ahora.toISOString()}] Verificando notificaciones pendientes...`);

        try {
            // 1Verificar recordatorios
            await this.verificarRecordatorios();

            //  Verificar tareas repetitivas
            await this.verificarTareasRepetitivas();

            //console.log('Verificación completada\n');
        } catch (error) {
            //console.error('Error en verificación de notificaciones:', error);
            //console.error('Stack:', error.stack);
        }
    }

    //Verificar recordatorios de tareas que deben notificarse ahora
    async verificarRecordatorios() {
        const connection = await pool.getConnection();

        try {
            console.log('Verificando recordatorios múltiples...');

            // Buscar tareas con recordatorio JSON activo
            const [tareas] = await connection.execute(
                `SELECT 
                t.idTarea,
                t.nombre as tareaNombre,
                t.descripcion,
                t.recordatorio,
                t.fechaVencimiento,
                t.idUsuario,
                t.idLista,
                u.nombre as nombreUsuario,
                u.email as emailUsuario,
                l.nombre as nombreLista
            FROM tarea t
            INNER JOIN usuario u ON t.idUsuario = u.idUsuario
            LEFT JOIN lista l ON t.idLista = l.idLista
            WHERE t.recordatorio IS NOT NULL
              AND t.estado != 'C'
            LIMIT 100`
            );

            if (tareas.length === 0) {
                console.log('No hay tareas con recordatorios');
                return;
            }

            console.log(`Analizando ${tareas.length} tareas con recordatorios...`);

            let recordatoriosProcesados = 0;

            for (const tarea of tareas) {
                try {
                    // Parsear recordatorios (puede ser JSON o DATETIME antiguo)
                    let recordatorios = [];

                    if (typeof tarea.recordatorio === 'string') {
                        try {
                            recordatorios = JSON.parse(tarea.recordatorio);
                        } catch (parseError) {
                            // Si no es JSON, podría ser un DATETIME antiguo
                            const fechaAntigua = new Date(tarea.recordatorio);
                            if (!isNaN(fechaAntigua.getTime())) {
                                recordatorios = [{
                                    fecha: tarea.recordatorio,
                                    notificado: false,
                                    tipo: 'personalizado'
                                }];
                            }
                        }
                    } else if (Array.isArray(tarea.recordatorio)) {
                        recordatorios = tarea.recordatorio;
                    }

                    if (!Array.isArray(recordatorios) || recordatorios.length === 0) {
                        continue;
                    }

                    // Verificar cada recordatorio pendiente
                    const ahora = new Date();
                    let seModificaron = false;

                    for (let i = 0; i < recordatorios.length; i++) {
                        const recordatorio = recordatorios[i];

                        // Saltar si ya fue notificado
                        if (recordatorio.notificado) {
                            continue;
                        }

                        const fechaRecordatorio = new Date(recordatorio.fecha);

                        // Si llegó la hora del recordatorio
                        if (fechaRecordatorio <= ahora) {
                            console.log(`   Recordatorio pendiente encontrado:`);
                            console.log(`      Tarea: ${tarea.tareaNombre}`);
                            console.log(`      Usuario: ${tarea.emailUsuario}`);
                            console.log(`      Tipo: ${recordatorio.tipo}`);
                            console.log(`      Fecha: ${recordatorio.fecha}`);

                            // Crear notificación
                            await this.crearNotificacionRecordatorio(connection, {
                                ...tarea,
                                tipoRecordatorio: recordatorio.tipo
                            });

                            // Marcar como notificado
                            recordatorios[i].notificado = true;
                            recordatorios[i].fechaNotificado = new Date().toISOString();
                            seModificaron = true;
                            recordatoriosProcesados++;

                            // Registrar en historial
                            try {
                                await connection.execute(
                                    `INSERT INTO historial_recordatorios 
                                (idTarea, idUsuario, fechaRecordatorio, tipoRecordatorio, notificado, fechaNotificado)
                                VALUES (?, ?, ?, ?, TRUE, NOW())`,
                                    [tarea.idTarea, tarea.idUsuario, recordatorio.fecha, recordatorio.tipo]
                                );
                            } catch (histError) {
                                console.warn('Error al guardar en historial:', histError.message);
                            }
                        }
                    }

                    // Si se modificaron recordatorios, actualizar en BD
                    if (seModificaron) {
                        await connection.execute(
                            `UPDATE tarea SET recordatorio = ? WHERE idTarea = ?`,
                            [JSON.stringify(recordatorios), tarea.idTarea]
                        );
                    }

                } catch (tareaError) {
                    console.error(`Error al procesar tarea ${tarea.idTarea}:`, tareaError.message);
                }
            }

            if (recordatoriosProcesados > 0) {
                console.log(`${recordatoriosProcesados} recordatorios procesados`);
            } else {
                console.log('No hay recordatorios pendientes en este momento');
            }

        } catch (error) {
            console.error('Error al verificar recordatorios:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    //Crear y enviar notificación de recordatorio
    async crearNotificacionRecordatorio(connection, tarea) {
        try {
            // Personalizar título según tipo de recordatorio
            const tiposRecordatorio = {
                '1_dia_antes': '1 día antes',
                '1_hora_antes': '1 hora antes',
                'en_el_momento': 'ahora',
                'personalizado': ''
            };

            const tipoTexto = tiposRecordatorio[tarea.tipoRecordatorio] || '';
            const titulo = tipoTexto
                ? `Recordatorio (${tipoTexto}): ${tarea.tareaNombre}`
                : `Recordatorio: ${tarea.tareaNombre}`;

            let mensaje = `Recordatorio: "${tarea.tareaNombre}"`;

            if (tarea.fechaVencimiento) {
                mensaje += ` - Vence: ${new Date(tarea.fechaVencimiento).toLocaleDateString('es-MX', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric'
                })}`;
            }

            const datos = {
                tareaId: tarea.idTarea,
                tareaNombre: tarea.tareaNombre,
                descripcion: tarea.descripcion,
                fechaVencimiento: tarea.fechaVencimiento,
                tipoRecordatorio: tarea.tipoRecordatorio,
                idLista: tarea.idLista,
                nombreLista: tarea.nombreLista
            };

            // Insertar en base de datos
            const [result] = await connection.execute(
                `INSERT INTO notificaciones 
            (id_usuario, tipo, titulo, mensaje, datos_adicionales, leida, fecha_creacion) 
            VALUES (?, ?, ?, ?, ?, 0, NOW())`,
                [tarea.idUsuario, 'recordatorio', titulo, mensaje, JSON.stringify(datos)]
            );

            const idNotificacion = result.insertId;

            console.log(`Notificación de recordatorio creada: ID ${idNotificacion}`);

            // Enviar vía SSE en tiempo real
            const notificacionSSE = {
                event: 'nueva_notificacion',
                id: idNotificacion,
                idNotificacion,
                idUsuario: parseInt(tarea.idUsuario),
                tipo: 'recordatorio',
                titulo,
                mensaje,
                datos,
                leida: false,
                fechaCreacion: new Date().toISOString()
            };

            const sseManager = require('../utils/sseManager');
            const enviado = sseManager.sendToUser(parseInt(tarea.idUsuario), notificacionSSE);

            if (enviado) {
                console.log(`SSE enviado exitosamente a ${tarea.emailUsuario}`);
            } else {
                console.log(`Usuario ${tarea.emailUsuario} no conectado, notificación guardada en BD`);
            }

        } catch (error) {
            console.error('Error al crear notificación de recordatorio:', error);
            throw error;
        }
    }

    //Verificar tareas repetitivas que deben crear nuevas instancias
    async verificarTareasRepetitivas() {
        const connection = await pool.getConnection();

        try {
            // Buscar tareas completadas con repetición activa
            const [tareas] = await connection.execute(
                `SELECT 
                    t.idTarea,
                    t.nombre as tareaNombre,
                    t.tipoRepeticion,
                    t.configRepeticion,
                    t.ultimaRepeticion,
                    t.fechaVencimiento,
                    t.idUsuario,
                    t.idLista,
                    u.nombre as nombreUsuario,
                    u.email as emailUsuario,
                    l.nombre as nombreLista
                FROM tarea t
                INNER JOIN usuario u ON t.idUsuario = u.idUsuario
                LEFT JOIN lista l ON t.idLista = l.idLista
                WHERE t.repetir = TRUE
                    AND t.estado = 'C'
                    AND t.tipoRepeticion IS NOT NULL
                    AND (
                        t.ultimaRepeticion IS NULL 
                        OR t.ultimaRepeticion < DATE_SUB(NOW(), INTERVAL 1 DAY)
                    )
                LIMIT 20`
            );

            if (tareas.length === 0) {
                console.log('No hay tareas repetitivas pendientes');
                return;
            }

            console.log(`   🔄 Encontradas ${tareas.length} tareas repetitivas`);

            for (const tarea of tareas) {
                await this.procesarTareaRepetitiva(connection, tarea);
            }

        } catch (error) {
            console.error('Error al verificar tareas repetitivas:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    //Procesar tarea repetitiva y crear notificación
    async procesarTareaRepetitiva(connection, tarea) {
        try {
            // Calcular nueva fecha de vencimiento según tipo de repetición
            const nuevaFecha = this.calcularNuevaFechaRepeticion(
                tarea.tipoRepeticion,
                tarea.fechaVencimiento,
                tarea.configRepeticion
            );

            // Actualizar ultimaRepeticion
            await connection.execute(
                `UPDATE tarea 
                 SET ultimaRepeticion = NOW() 
                 WHERE idTarea = ?`,
                [tarea.idTarea]
            );

            // Crear notificación
            const titulo = 'Tarea repetida';
            const mensaje = `Tu tarea "${tarea.tareaNombre}" se ha programado nuevamente para ${nuevaFecha.toLocaleDateString()}`;

            const datos = {
                tareaId: tarea.idTarea,
                tareaNombre: tarea.tareaNombre,
                fechaVencimiento: nuevaFecha,
                tipoRepeticion: tarea.tipoRepeticion,
                idLista: tarea.idLista,
                nombreLista: tarea.nombreLista
            };

            const [result] = await connection.execute(
                `INSERT INTO notificaciones 
                (id_usuario, tipo, titulo, mensaje, datos_adicionales, leida, fecha_creacion) 
                VALUES (?, ?, ?, ?, ?, 0, NOW())`,
                [tarea.idUsuario, 'tarea_repetir', titulo, mensaje, JSON.stringify(datos)]
            );

            const idNotificacion = result.insertId;

            console.log(`Notificación de repetición creada: ID ${idNotificacion}`);

            // Enviar vía SSE
            const notificacionSSE = {
                event: 'nueva_notificacion',
                id: idNotificacion,
                idNotificacion,
                idUsuario: parseInt(tarea.idUsuario),
                tipo: 'tarea_repetir',
                titulo,
                mensaje,
                datos,
                leida: false,
                fechaCreacion: new Date().toISOString()
            };

            const enviado = sseManager.sendToUser(parseInt(tarea.idUsuario), notificacionSSE);

            if (enviado) {
                console.log(`SSE enviado exitosamente a usuario ${tarea.emailUsuario}`);
            } else {
                console.log(`Usuario ${tarea.emailUsuario} no conectado`);
            }

        } catch (error) {
            console.error('Error al procesar tarea repetitiva:', error);
            throw error;
        }
    }

    //Calcular nueva fecha de repetición según tipo
    calcularNuevaFechaRepeticion(tipo, fechaActual, config) {
        const fecha = new Date(fechaActual);

        switch (tipo) {
            case 'diario':
                fecha.setDate(fecha.getDate() + 1);
                break;
            case 'laborales':
                do {
                    fecha.setDate(fecha.getDate() + 1);
                } while (fecha.getDay() === 0 || fecha.getDay() === 6); // Saltar sábado/domingo
                break;
            case 'semanal':
                fecha.setDate(fecha.getDate() + 7);
                break;
            case 'mensual':
                fecha.setMonth(fecha.getMonth() + 1);
                break;
            case 'personalizado':
                // Aquí deberías parsear el config JSON
                // Por ahora, por defecto suma 1 día
                fecha.setDate(fecha.getDate() + 1);
                break;
            default:
                fecha.setDate(fecha.getDate() + 1);
        }

        return fecha;
    }


    //Obtener estadísticas del servicio
    getEstadisticas() {
        return {
            activo: this.isRunning,
            ultimaEjecucion: new Date().toISOString(),
            clientesSSE: sseManager.getStats()
        };
    }
}

// Exportar instancia única (Singleton)
module.exports = new NotificacionesService();