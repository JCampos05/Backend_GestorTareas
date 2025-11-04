const Usuario = require('../models/usuario');
const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET || 'tu_clave_secreta_aqui';

const UsuarioController = {
    registrar: async (req, res) => {
        try {
            const { nombre, email, password } = req.body;

            if (!nombre || !email || !password) {
                return res.status(400).json({ error: 'Todos los campos son requeridos' });
            }

            const usuarioExistente = await Usuario.buscarPorEmail(email);
            if (usuarioExistente) {
                return res.status(400).json({ error: 'El email ya está registrado' });
            }

            const idUsuario = await Usuario.crear(nombre, email, password);
            const token = jwt.sign({ idUsuario, email }, SECRET_KEY, { expiresIn: '24h' });

            res.status(201).json({
                mensaje: 'Usuario registrado exitosamente',
                token,
                usuario: { idUsuario, nombre, email }
            });
        } catch (error) {
            console.error('Error al registrar usuario:', error);
            res.status(500).json({ error: 'Error al registrar usuario' });
        }
    },

    login: async (req, res) => {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({ error: 'Email y password son requeridos' });
            }

            const usuario = await Usuario.buscarPorEmail(email);
            if (!usuario) {
                return res.status(401).json({ error: 'Credenciales inválidas' });
            }

            const passwordValido = await Usuario.validarPassword(password, usuario.password);
            if (!passwordValido) {
                return res.status(401).json({ error: 'Credenciales inválidas' });
            }

            const token = jwt.sign(
                { idUsuario: usuario.idUsuario, email: usuario.email },
                SECRET_KEY,
                { expiresIn: '24h' }
            );

            res.json({
                mensaje: 'Login exitoso',
                token,
                usuario: {
                    idUsuario: usuario.idUsuario,
                    nombre: usuario.nombre,
                    email: usuario.email
                }
            });
        } catch (error) {
            console.error('Error al hacer login:', error);
            res.status(500).json({ error: 'Error al hacer login' });
        }
    },

    obtenerPerfil: async (req, res) => {
        try {
            const usuario = await Usuario.buscarPorId(req.usuario.idUsuario);
            if (!usuario) {
                return res.status(404).json({ error: 'Usuario no encontrado' });
            }
            res.json(usuario);
        } catch (error) {
            console.error('Error al obtener perfil:', error);
            res.status(500).json({ error: 'Error al obtener perfil' });
        }
    },

    verificarUsuarios: async (req, res) => {
        try {
            const db = require('../config/config');
            const [rows] = await db.query('SELECT COUNT(*) as total FROM usuario');
            res.json({ existenUsuarios: rows[0].total > 0 });
        } catch (error) {
            console.error('Error al verificar usuarios:', error);
            res.status(500).json({ error: 'Error al verificar usuarios' });
        }
    }
};

module.exports = UsuarioController;