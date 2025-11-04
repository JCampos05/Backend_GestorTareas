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
            'SELECT idUsuario, nombre, email, fechaRegistro FROM usuario WHERE idUsuario = ?',
            [idUsuario]
        );
        return rows[0];
    },

    validarPassword: async (password, hashedPassword) => {
        return await bcrypt.compare(password, hashedPassword);
    }
};

module.exports = Usuario;