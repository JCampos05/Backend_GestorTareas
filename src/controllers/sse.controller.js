const sseManager = require('../utils/sseManager');

//Stream de notificaciones en tiempo real usando SSE

exports.streamNotificaciones = (req, res) => {
    const idUsuario = req.usuario.idUsuario || req.usuario.id;

    if (!idUsuario) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    console.log(`Cliente SSE conectado - Usuario ID: ${idUsuario}`);

    // Configurar headers para SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Para Nginx

    // Enviar comentario inicial para mantener conexión activa
    res.write(': connected\n\n');

    // Agregar cliente al manager
    sseManager.addClient(idUsuario, res);

    // Enviar evento de conexión exitosa
    sseManager.sendToUser(idUsuario, {
        type: 'connected',
        message: 'Conectado al stream de notificaciones',
        timestamp: new Date().toISOString()
    });

    // Manejar desconexión del cliente
    req.on('close', () => {
        console.log(`Cliente SSE desconectado - Usuario ID: ${idUsuario}`);
        sseManager.removeClient(idUsuario, res);
    });
};