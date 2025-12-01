const pool = require('../config/config');

class VerificacionService {


    //Generar código aleatorio de 6 dígitos
    generarCodigo() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    //Guardar código de verificación
    async guardarCodigo(idUsuario, codigo, ipGeneracion = null) {
        const expiracionMinutos = parseInt(process.env.CODIGO_EXPIRACION_MINUTOS || '15');

        const query = `
      INSERT INTO verificacion_email 
        (idUsuario, codigo, fechaExpiracion, ipGeneracion)
      VALUES 
        (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE), ?)
    `;

        try {
            const [result] = await pool.query(query, [
                idUsuario,
                codigo,
                expiracionMinutos,
                ipGeneracion
            ]);

            console.log(`Código guardado para usuario ${idUsuario}`);
            return { success: true, idVerificacion: result.insertId };
        } catch (error) {
            console.error('Error al guardar código:', error);
            throw new Error('No se pudo guardar el código de verificación');
        }
    }

    //Verificar código ingresado por el usuario
    async verificarCodigo(idUsuario, codigoIngresado) {
        const intentosMax = parseInt(process.env.CODIGO_INTENTOS_MAX || '3');

        // Buscar código activo no verificado
        const queryBuscar = `
      SELECT 
        idVerificacion,
        codigo,
        fechaExpiracion,
        intentos,
        verificado
      FROM verificacion_email
      WHERE idUsuario = ?
        AND verificado = FALSE
      ORDER BY fechaGeneracion DESC
      LIMIT 1
    `;

        try {
            const [rows] = await pool.query(queryBuscar, [idUsuario]);

            if (rows.length === 0) {
                return {
                    success: false,
                    error: 'NO_CODIGO',
                    message: 'No hay código de verificación pendiente'
                };
            }

            const registro = rows[0];

            // Verificar si expiró
            if (new Date(registro.fechaExpiracion) < new Date()) {
                return {
                    success: false,
                    error: 'EXPIRADO',
                    message: 'El código ha expirado. Solicita uno nuevo.'
                };
            }

            // Verificar intentos
            if (registro.intentos >= intentosMax) {
                return {
                    success: false,
                    error: 'INTENTOS_EXCEDIDOS',
                    message: 'Has excedido el número de intentos. Solicita un nuevo código.'
                };
            }

            // Verificar código
            if (registro.codigo !== codigoIngresado) {
                // Incrementar intentos
                await pool.query(
                    'UPDATE verificacion_email SET intentos = intentos + 1 WHERE idVerificacion = ?',
                    [registro.idVerificacion]
                );

                const intentosRestantes = intentosMax - (registro.intentos + 1);

                return {
                    success: false,
                    error: 'CODIGO_INCORRECTO',
                    message: `Código incorrecto. Te quedan ${intentosRestantes} intento(s).`,
                    intentosRestantes
                };
            }

            // Código correcto
            // Marcar como verificado
            await pool.query(
                'UPDATE verificacion_email SET verificado = TRUE WHERE idVerificacion = ?',
                [registro.idVerificacion]
            );

            // Marcar email como verificado en usuario
            await pool.query(
                'UPDATE usuario SET emailVerificado = TRUE WHERE idUsuario = ?',
                [idUsuario]
            );

            console.log(`Usuario ${idUsuario} verificado exitosamente`);

            return {
                success: true,
                message: 'Código verificado correctamente'
            };

        } catch (error) {
            console.error('Error al verificar código:', error);
            throw new Error('Error al verificar el código');
        }
    }

    //Verificar si puede solicitar un nuevo código (cooldown)
    async puedeReenviarCodigo(idUsuario) {
        const cooldownSegundos = parseInt(process.env.REENVIO_COOLDOWN_SEGUNDOS || '60');

        const query = `
      SELECT fechaGeneracion
      FROM verificacion_email
      WHERE idUsuario = ?
      ORDER BY fechaGeneracion DESC
      LIMIT 1
    `;

        try {
            const [rows] = await pool.query(query, [idUsuario]);

            if (rows.length === 0) {
                return { puede: true };
            }

            const ultimaFecha = new Date(rows[0].fechaGeneracion);
            const ahora = new Date();
            const segundosTranscurridos = (ahora - ultimaFecha) / 1000;

            if (segundosTranscurridos < cooldownSegundos) {
                const segundosRestantes = Math.ceil(cooldownSegundos - segundosTranscurridos);

                return {
                    puede: false,
                    message: `Debes esperar ${segundosRestantes} segundos antes de solicitar un nuevo código`,
                    segundosRestantes
                };
            }

            return { puede: true };

        } catch (error) {
            console.error('Error al verificar cooldown:', error);
            throw new Error('Error al verificar disponibilidad de reenvío');
        }
    }

    //Verificar límite de códigos por día
    async verificarLimiteDiario(idUsuario) {
        const limiteDia = parseInt(process.env.LIMITE_CODIGOS_DIA || '5');

        const query = `
      SELECT COUNT(*) as total
      FROM verificacion_email
      WHERE idUsuario = ?
        AND fechaGeneracion >= CURDATE()
    `;

        try {
            const [rows] = await pool.query(query, [idUsuario]);
            const totalHoy = rows[0].total;

            if (totalHoy >= limiteDia) {
                return {
                    permitido: false,
                    message: `Has alcanzado el límite de ${limiteDia} códigos por día`,
                    totalHoy
                };
            }

            return {
                permitido: true,
                totalHoy,
                restantes: limiteDia - totalHoy
            };

        } catch (error) {
            console.error('Error al verificar límite diario:', error);
            throw new Error('Error al verificar límite diario');
        }
    }

    //Limpiar códigos antiguos (llamado por cron)
    async limpiarCodigosExpirados() {
        const query = `
      DELETE FROM verificacion_email 
      WHERE fechaExpiracion < DATE_SUB(NOW(), INTERVAL 24 HOUR)
    `;

        try {
            const [result] = await pool.query(query);
            console.log(`${result.affectedRows} códigos expirados eliminados`);
            return { eliminados: result.affectedRows };
        } catch (error) {
            console.error('Error al limpiar códigos:', error);
            return { eliminados: 0 };
        }
    }

    //Obtener estadísticas de verificación (para admin)
    async obtenerEstadisticas() {
        const query = `
      SELECT 
        COUNT(*) as totalCodigos,
        SUM(CASE WHEN verificado = TRUE THEN 1 ELSE 0 END) as verificados,
        SUM(CASE WHEN fechaExpiracion < NOW() AND verificado = FALSE THEN 1 ELSE 0 END) as expirados,
        AVG(intentos) as promedioIntentos
      FROM verificacion_email
      WHERE fechaGeneracion >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `;

        try {
            const [rows] = await pool.query(query);
            return rows[0];
        } catch (error) {
            console.error('Error al obtener estadísticas:', error);
            return null;
        }
    }
}

module.exports = new VerificacionService();