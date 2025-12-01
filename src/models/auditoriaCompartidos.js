const db = require('../config/config');

class AuditoriaCompartidos {
    static async registrar(data) {
        try {
            const query = `
                INSERT INTO auditoria_compartidos 
                (tipo, idEntidad, idUsuario, accion, detalles)
                VALUES (?, ?, ?, ?, ?)
            `;
            const [result] = await db.execute(query, [
                data.tipo,
                data.idEntidad,
                data.idUsuario,
                data.accion,
                JSON.stringify(data.detalles || {})
            ]);

            return result.insertId;
        } catch (error) {
            console.error('Error en auditoría:', error);
            // No lanzar error para no bloquear operaciones
            return null;
        }
    }

    static async obtenerPorEntidad(tipo, idEntidad, limite = 50) {
        try {
            const query = `
                SELECT a.*, u.nombre as nombreUsuario
                FROM auditoria_compartidos a
                JOIN usuario u ON a.idUsuario = u.idUsuario
                WHERE a.tipo = ? AND a.idEntidad = ?
                ORDER BY a.fecha DESC
                LIMIT ?
            `;
            const [rows] = await db.execute(query, [tipo, idEntidad, limite]);
            return rows;
        } catch (error) {
            throw new Error(`Error al obtener auditoría: ${error.message}`);
        }
    }
}

module.exports = AuditoriaCompartidos;