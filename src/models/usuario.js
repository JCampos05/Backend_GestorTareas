const db = require('../config/config');
const bcrypt = require('bcrypt');

const Usuario = {
    crear: async (nombre, email, password) => {
        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await db.query(
            'INSERT INTO usuario (nombre, email, password) VALUES (?, ?, ?)',
            [nombre, email, hashedPassword]
        );
        return result.insertId;
    },

    buscarPorEmail: async (email) => {
        const [rows] = await db.query(
            'SELECT * FROM usuario WHERE email = ?',
            [email]
        );
        return rows[0];
    },

    buscarPorId: async (idUsuario) => {
        const [rows] = await db.query(
            `SELECT 
                idUsuario, 
                nombre, 
                email, 
                bio,
                telefono,
                ubicacion,
                cargo,
                redes_sociales,
                fechaRegistro,
                fecha_actualizacion
            FROM usuario 
            WHERE idUsuario = ?`,
            [idUsuario]
        );

        // Parsear redes_sociales si existe
        if (rows[0] && rows[0].redes_sociales) {
            try {
                rows[0].redes_sociales = JSON.parse(rows[0].redes_sociales);
            } catch (e) {
                rows[0].redes_sociales = null;
            }
        }

        return rows[0];
    },

    actualizarPerfil: async (idUsuario, datos) => {
        const { nombre, bio, telefono, ubicacion, cargo, redes_sociales } = datos;

        // Construir query dinámicamente solo con campos proporcionados
        const campos = [];
        const valores = [];

        // AGREGAR ESTAS LÍNEAS para permitir actualizar el nombre
        if (nombre !== undefined) {
            campos.push('nombre = ?');
            valores.push(nombre);
        }

        if (bio !== undefined) {
            campos.push('bio = ?');
            valores.push(bio);
        }
        if (telefono !== undefined) {
            campos.push('telefono = ?');
            valores.push(telefono);
        }
        if (ubicacion !== undefined) {
            campos.push('ubicacion = ?');
            valores.push(ubicacion);
        }
        if (cargo !== undefined) {
            campos.push('cargo = ?');
            valores.push(cargo);
        }
        if (redes_sociales !== undefined) {
            campos.push('redes_sociales = ?');
            valores.push(JSON.stringify(redes_sociales));
        }

        if (campos.length === 0) {
            throw new Error('No hay campos para actualizar');
        }

        valores.push(idUsuario);

        const query = `UPDATE usuario SET ${campos.join(', ')} WHERE idUsuario = ?`;

        const [result] = await db.query(query, valores);
        return result.affectedRows > 0;
    },

    actualizarNombre: async (idUsuario, nombre) => {
        const [result] = await db.query(
            'UPDATE usuario SET nombre = ? WHERE idUsuario = ?',
            [nombre, idUsuario]
        );
        return result.affectedRows > 0;
    },

    cambiarPassword: async (idUsuario, passwordActual, passwordNuevo) => {
        // Obtener password actual del usuario
        const [rows] = await db.query(
            'SELECT password FROM usuario WHERE idUsuario = ?',
            [idUsuario]
        );

        if (rows.length === 0) {
            throw new Error('Usuario no encontrado');
        }

        // Verificar password actual
        const passwordValido = await bcrypt.compare(passwordActual, rows[0].password);
        if (!passwordValido) {
            throw new Error('Password actual incorrecto');
        }

        // Hashear nuevo password
        const hashedPassword = await bcrypt.hash(passwordNuevo, 10);

        // Actualizar password
        const [result] = await db.query(
            'UPDATE usuario SET password = ? WHERE idUsuario = ?',
            [hashedPassword, idUsuario]
        );

        return result.affectedRows > 0;
    },

    validarPassword: async (password, hashedPassword) => {
        return await bcrypt.compare(password, hashedPassword);
    }
};

module.exports = Usuario;