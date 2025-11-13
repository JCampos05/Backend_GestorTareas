// src/controllers/compartir/notificacion.controller.js
const db = require('../../config/config');

/**
 * Crear una notificación
 */
exports.crearNotificacion = async (connection, idUsuario, tipo, titulo, mensaje, datos = {}) => {
    try {
        const [result] = await connection.execute(
            `INSERT INTO notificaciones 
            (id_usuario, tipo, titulo, mensaje, datos_adicionales, leida, fecha_creacion) 
            VALUES (?, ?, ?, ?, ?, FALSE, CURRENT_TIMESTAMP)`,
            [idUsuario, tipo, titulo, mensaje, JSON.stringify(datos)]
        );

        return result.insertId;
    } catch (error) {
        console.error('Error al crear notificación:', error);
        throw error;
    }
};

/**
 * Obtener notificaciones del usuario
 */
exports.obtenerNotificaciones = async (req, res) => {
    try {
        // ✅ FIX: Maneja ambos casos (id o idUsuario)
        const idUsuario = req.usuario.idUsuario || req.usuario.id;

        console.log('🔍 Usuario solicitando notificaciones:', idUsuario);
        console.log('🔍 Objeto completo req.usuario:', req.usuario);

        if (!idUsuario) {
            return res.status(401).json({ error: 'Usuario no autenticado correctamente' });
        }

        const [notificaciones] = await db.execute(
            `SELECT id as idNotificacion, 
                    id_usuario as idUsuario, 
                    tipo, 
                    titulo, 
                    mensaje, 
                    datos_adicionales as datos, 
                    leida, 
                    fecha_creacion as fechaCreacion
             FROM notificaciones 
             WHERE id_usuario = ? 
             ORDER BY fecha_creacion DESC 
             LIMIT 50`,
            [idUsuario]
        );

        console.log(`✅ Se encontraron ${notificaciones.length} notificaciones`);

        res.json({
            notificaciones: notificaciones.map(n => ({
                ...n,
                // ✅ FIX: Si ya es objeto, no parsear. Si es string, parsear
                datos: typeof n.datos === 'string' ? JSON.parse(n.datos) : n.datos
            }))
        });
    } catch (error) {
        console.error('❌ Error al obtener notificaciones:', error);
        res.status(500).json({
            error: 'Error al obtener notificaciones',
            detalle: error.message // ✅ Devuelve el error específico
        });
    }
};

/**
 * Marcar notificación como leída
 */
exports.marcarComoLeida = async (req, res) => {
    try {
        const { id } = req.params;
        const idUsuario = req.usuario.idUsuario || req.usuario.id;

        if (!idUsuario) {
            return res.status(401).json({ error: 'Usuario no autenticado' });
        }

        const [result] = await db.execute(
            `UPDATE notificaciones 
             SET leida = TRUE 
             WHERE id = ? AND id_usuario = ?`,
            [id, idUsuario]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Notificación no encontrada' });
        }

        res.json({ mensaje: 'Notificación marcada como leída' });
    } catch (error) {
        console.error('Error al marcar notificación:', error);
        res.status(500).json({ error: 'Error al actualizar notificación' });
    }
};

/**
 * Marcar todas como leídas
 */
exports.marcarTodasLeidas = async (req, res) => {
    try {
        const idUsuario = req.usuario.idUsuario || req.usuario.id;

        if (!idUsuario) {
            return res.status(401).json({ error: 'Usuario no autenticado' });
        }

        await db.execute(
            `UPDATE notificaciones 
             SET leida = TRUE 
             WHERE id_usuario = ? AND leida = FALSE`,
            [idUsuario]
        );

        res.json({ mensaje: 'Todas las notificaciones marcadas como leídas' });
    } catch (error) {
        console.error('Error al marcar notificaciones:', error);
        res.status(500).json({ error: 'Error al actualizar notificaciones' });
    }
};

/**
 * Aceptar invitación
 */
exports.aceptarInvitacion = async (req, res) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const { id } = req.params;
        const idUsuario = req.usuario.idUsuario || req.usuario.id;

        if (!idUsuario) {
            await connection.rollback();
            return res.status(401).json({ error: 'Usuario no autenticado' });
        }

        const [notificaciones] = await connection.execute(
            `SELECT * FROM notificaciones 
                WHERE id = ? AND id_usuario = ? AND tipo = 'invitacion_lista'`,
            [id, idUsuario]
        );

        if (notificaciones.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Notificación no encontrada' });
        }

        const notificacion = notificaciones[0];
        const datos = typeof notificacion.datos_adicionales === 'string'
            ? JSON.parse(notificacion.datos_adicionales)
            : notificacion.datos_adicionales;

        // Verificar que la lista existe
        const [listas] = await connection.execute(
            `SELECT * FROM lista WHERE idLista = ?`,
            [datos.listaId]
        );
        if (listas.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Lista no encontrada' });
        }

        await connection.execute(
            `INSERT INTO lista_compartida 
            (idLista, idUsuario, rol, compartidoPor, aceptado, activo, fechaCompartido)
            VALUES (?, ?, ?, ?, TRUE, TRUE, CURRENT_TIMESTAMP)
            ON DUPLICATE KEY UPDATE aceptado = TRUE, activo = TRUE`,
            [datos.listaId, idUsuario, datos.rol, datos.invitadoPorId || null]
        );

        await connection.execute(
            `UPDATE notificaciones SET leida = TRUE WHERE id = ?`,
            [id]
        );

        await connection.commit();

        res.json({
            mensaje: 'Invitación aceptada',
            lista: { idLista: datos.listaId, nombre: datos.listaNombre }
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error al aceptar invitación:', error);
        res.status(500).json({
            error: 'Error al aceptar invitación',
            detalle: error.message
        });
    } finally {
        connection.release();
    }
};

/**
 * Rechazar invitación
 */
exports.rechazarInvitacion = async (req, res) => {
    try {
        const { id } = req.params;
        const idUsuario = req.usuario.idUsuario || req.usuario.id;

        if (!idUsuario) {
            return res.status(401).json({ error: 'Usuario no autenticado' });
        }

        await db.execute(
            `UPDATE notificaciones 
             SET leida = TRUE 
             WHERE id = ? AND id_usuario = ?`,
            [id, idUsuario]
        );

        res.json({ mensaje: 'Invitación rechazada' });
    } catch (error) {
        console.error('Error al rechazar invitación:', error);
        res.status(500).json({ error: 'Error al rechazar invitación' });
    }
};

module.exports = exports;