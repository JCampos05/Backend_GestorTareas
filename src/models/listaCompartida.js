const db = require('../config/config');

class ListaCompartida {
    constructor(data) {
        this.idListaCompartida = data.idListaCompartida;
        this.idLista = data.idLista;
        this.idUsuario = data.idUsuario;
        this.rol = data.rol;
        this.esCreador = data.esCreador;
        this.fechaCompartido = data.fechaCompartido;
        this.compartidoPor = data.compartidoPor;
        this.aceptado = data.aceptado;
        this.activo = data.activo;
    }

    static async crear(data) {
        try {
            const query = `
                INSERT INTO lista_compartida 
                (idLista, idUsuario, rol, esCreador, compartidoPor, aceptado, activo)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `;
            const [result] = await db.execute(query, [
                data.idLista,
                data.idUsuario,
                data.rol || 'colaborador',
                data.esCreador || false,
                data.compartidoPor,
                data.aceptado !== undefined ? data.aceptado : false,
                data.activo !== undefined ? data.activo : true
            ]);

            return result.insertId;
        } catch (error) {
            throw new Error(`Error al crear compartido: ${error.message}`);
        }
    }

    static async obtener(idLista, idUsuario) {
        try {
            const query = `
                SELECT lc.*, u.nombre, u.email
                FROM lista_compartida lc
                JOIN usuario u ON lc.idUsuario = u.idUsuario
                WHERE lc.idLista = ? AND lc.idUsuario = ?
            `;
            const [rows] = await db.execute(query, [idLista, idUsuario]);
            return rows.length > 0 ? new ListaCompartida(rows[0]) : null;
        } catch (error) {
            throw new Error(`Error al obtener compartido: ${error.message}`);
        }
    }

    static async listarPorLista(idLista) {
        try {
            const query = `
                SELECT 
                    lc.*,
                    u.idUsuario,
                    u.nombre,
                    u.email
                FROM lista_compartida lc
                JOIN usuario u ON lc.idUsuario = u.idUsuario
                WHERE lc.idLista = ? AND lc.activo = TRUE
                ORDER BY lc.esCreador DESC, lc.fechaCompartido ASC
            `;
            const [rows] = await db.execute(query, [idLista]);
            return rows;
        } catch (error) {
            throw new Error(`Error al listar usuarios: ${error.message}`);
        }
    }

    static async actualizarRol(idLista, idUsuario, nuevoRol) {
        try {
            const query = `
                UPDATE lista_compartida 
                SET rol = ? 
                WHERE idLista = ? AND idUsuario = ? AND esCreador = FALSE
            `;
            const [result] = await db.execute(query, [nuevoRol, idLista, idUsuario]);
            return result.affectedRows > 0;
        } catch (error) {
            throw new Error(`Error al actualizar rol: ${error.message}`);
        }
    }

    static async revocar(idLista, idUsuario) {
        try {
            const query = `
                UPDATE lista_compartida 
                SET activo = FALSE 
                WHERE idLista = ? AND idUsuario = ? AND esCreador = FALSE
            `;
            const [result] = await db.execute(query, [idLista, idUsuario]);
            return result.affectedRows > 0;
        } catch (error) {
            throw new Error(`Error al revocar acceso: ${error.message}`);
        }
    }
}

module.exports = ListaCompartida;