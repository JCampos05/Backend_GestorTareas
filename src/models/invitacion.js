// src/models/invitacion.js
const db = require('../config/config');

class Invitacion {
    constructor(data) {
        this.idInvitacion = data.idInvitacion;
        this.tipo = data.tipo;
        this.idEntidad = data.idEntidad;
        this.emailInvitado = data.emailInvitado;
        this.rol = data.rol;
        this.token = data.token;
        this.invitadoPor = data.invitadoPor;
        this.fechaInvitacion = data.fechaInvitacion;
        this.fechaExpiracion = data.fechaExpiracion;
        this.aceptada = data.aceptada;
        this.activa = data.activa;
    }

    static async crear(data) {
        try {
            const query = `
                INSERT INTO invitacion 
                (tipo, idEntidad, emailInvitado, rol, token, invitadoPor, fechaExpiracion, activa)
                VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)
            `;
            const [result] = await db.execute(query, [
                data.tipo,
                data.idEntidad,
                data.emailInvitado,
                data.rol,
                data.token,
                data.invitadoPor,
                data.fechaExpiracion
            ]);

            return result.insertId;
        } catch (error) {
            throw new Error(`Error al crear invitación: ${error.message}`);
        }
    }

    static async obtenerPorToken(token) {
        try {
            const query = `
                SELECT i.*, u.nombre as nombreInvitador
                FROM invitacion i
                JOIN usuario u ON i.invitadoPor = u.idUsuario
                WHERE i.token = ? AND i.activa = TRUE
            `;
            const [rows] = await db.execute(query, [token]);
            return rows.length > 0 ? new Invitacion(rows[0]) : null;
        } catch (error) {
            throw new Error(`Error al obtener invitación: ${error.message}`);
        }
    }

    static async obtenerPendientesPorEmail(email) {
        try {
            const query = `
                SELECT i.*, 
                    u.nombre as nombreInvitador,
                    CASE 
                        WHEN i.tipo = 'categoria' THEN c.nombre
                        WHEN i.tipo = 'lista' THEN l.nombre
                    END as nombreEntidad
                FROM invitacion i
                JOIN usuario u ON i.invitadoPor = u.idUsuario
                LEFT JOIN categoria c ON i.tipo = 'categoria' AND i.idEntidad = c.idCategoria
                LEFT JOIN lista l ON i.tipo = 'lista' AND i.idEntidad = l.idLista
                WHERE i.emailInvitado = ? 
                    AND i.activa = TRUE 
                    AND i.aceptada = FALSE
                    AND (i.fechaExpiracion IS NULL OR i.fechaExpiracion > NOW())
                ORDER BY i.fechaInvitacion DESC
            `;
            const [rows] = await db.execute(query, [email]);
            return rows;
        } catch (error) {
            throw new Error(`Error al obtener invitaciones: ${error.message}`);
        }
    }

    static async marcarComoAceptada(token) {
        try {
            const query = `
                UPDATE invitacion 
                SET aceptada = TRUE, activa = FALSE
                WHERE token = ?
            `;
            const [result] = await db.execute(query, [token]);
            return result.affectedRows > 0;
        } catch (error) {
            throw new Error(`Error al marcar invitación: ${error.message}`);
        }
    }
}

module.exports = Invitacion;