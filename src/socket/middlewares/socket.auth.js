const jwt = require('jsonwebtoken');


//Middleware para autenticar conexiones de Socket.IO
const socketAuth = async (socket, next) => {
    try {
        //console.log('\nIntentando autenticar socket...');
        
        // Obtener token del handshake
        let token = socket.handshake.auth.token || socket.handshake.headers.authorization;

        //console.log('Token recibido:', token ? `${token.substring(0, 20)}...` : 'NO HAY TOKEN');

        if (!token) {
            console.error('No se proporcionó token');
            return next(new Error('Token no proporcionado'));
        }

        // Limpiar token (remover "Bearer " si existe)
        const cleanToken = token.replace('Bearer ', '').trim();
        //console.log('Token limpio:', `${cleanToken.substring(0, 20)}...`);

        // Verificar que JWT_SECRET esté definido
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            //console.error('JWT_SECRET no está definido en variables de entorno');
            return next(new Error('Configuración de servidor incorrecta'));
        }

        //console.log('Verificando token con JWT_SECRET...');

        // Verificar token
        const decoded = jwt.verify(cleanToken, jwtSecret);

        //console.log('Token verificado exitosamente');
        /*console.log('Usuario:', {
            idUsuario: decoded.idUsuario,
            email: decoded.email,
            nombre: decoded.nombre
        });*/

        // Agregar información del usuario al socket
        socket.userId = decoded.idUsuario;
        socket.userEmail = decoded.email;
        socket.userName = decoded.nombre;

        //console.log('Usuario autenticado en socket:', socket.userEmail, `(ID: ${socket.userId})\n`);

        next();
    } catch (error) {
        //console.error('\nError de autenticación en socket:', error.message);

        if (error.name === 'TokenExpiredError') {
            //console.error('El token ha expirado');
            return next(new Error('Token expirado - Por favor inicia sesión nuevamente'));
        }

        if (error.name === 'JsonWebTokenError') {
            //console.error('Token JWT inválido:', error.message);
            return next(new Error('Token inválido - Por favor inicia sesión nuevamente'));
        }

        //console.error('Error desconocido:', error);
        return next(new Error('Error de autenticación'));
    }
};

module.exports = socketAuth;