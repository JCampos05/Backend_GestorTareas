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

            // No enviar el password aunque no esté en la query
            delete usuario.password;

            res.json(usuario);
        } catch (error) {
            console.error('Error al obtener perfil:', error);
            res.status(500).json({ error: 'Error al obtener perfil' });
        }
    },

    actualizarPerfil: async (req, res) => {
        try {
            const { nombre, bio, telefono, ubicacion, cargo, redes_sociales } = req.body;

            const datosActualizar = {};

            // AGREGAR ESTAS LÍNEAS para permitir actualizar el nombre
            if (nombre !== undefined) datosActualizar.nombre = nombre;

            if (bio !== undefined) datosActualizar.bio = bio;
            if (telefono !== undefined) datosActualizar.telefono = telefono;
            if (ubicacion !== undefined) datosActualizar.ubicacion = ubicacion;
            if (cargo !== undefined) datosActualizar.cargo = cargo;
            if (redes_sociales !== undefined) datosActualizar.redes_sociales = redes_sociales;

            if (Object.keys(datosActualizar).length === 0) {
                return res.status(400).json({
                    error: 'No se proporcionaron campos para actualizar'
                });
            }

            const actualizado = await Usuario.actualizarPerfil(
                req.usuario.idUsuario,
                datosActualizar
            );

            if (!actualizado) {
                return res.status(404).json({ error: 'Usuario no encontrado' });
            }

            // Obtener usuario actualizado
            const usuarioActualizado = await Usuario.buscarPorId(req.usuario.idUsuario);
            delete usuarioActualizado.password;

            res.json({
                mensaje: 'Perfil actualizado exitosamente',
                usuario: usuarioActualizado
            });
        } catch (error) {
            console.error('Error al actualizar perfil:', error);
            res.status(500).json({
                error: 'Error al actualizar perfil',
                detalle: error.message
            });
        }
    },

    actualizarNombre: async (req, res) => {
        try {
            const { nombre } = req.body;

            if (!nombre || nombre.trim().length === 0) {
                return res.status(400).json({ error: 'El nombre es requerido' });
            }

            const actualizado = await Usuario.actualizarNombre(
                req.usuario.idUsuario,
                nombre.trim()
            );

            if (!actualizado) {
                return res.status(404).json({ error: 'Usuario no encontrado' });
            }

            res.json({ mensaje: 'Nombre actualizado exitosamente' });
        } catch (error) {
            console.error('Error al actualizar nombre:', error);
            res.status(500).json({ error: 'Error al actualizar nombre' });
        }
    },

    cambiarPassword: async (req, res) => {
        try {
            const { passwordActual, passwordNuevo } = req.body;

            if (!passwordActual || !passwordNuevo) {
                return res.status(400).json({
                    error: 'Se requiere password actual y nuevo'
                });
            }

            if (passwordNuevo.length < 6) {
                return res.status(400).json({
                    error: 'El nuevo password debe tener al menos 6 caracteres'
                });
            }

            const actualizado = await Usuario.cambiarPassword(
                req.usuario.idUsuario,
                passwordActual,
                passwordNuevo
            );

            if (!actualizado) {
                return res.status(404).json({ error: 'Usuario no encontrado' });
            }

            res.json({ mensaje: 'Password actualizado exitosamente' });
        } catch (error) {
            console.error('Error al cambiar password:', error);

            if (error.message === 'Password actual incorrecto') {
                return res.status(400).json({ error: error.message });
            }

            res.status(500).json({ error: 'Error al cambiar password' });
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