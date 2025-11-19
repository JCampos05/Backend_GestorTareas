// src/socket/handlers/chat.handler.js
const ChatService = require('../services/chat.service');
const Mensaje = require('../../models/mensaje');

class ChatHandler {
    constructor(io, socket) {
        this.io = io;
        this.socket = socket;
        this.chatNamespace = io.of('/chat');
        this.userId = socket.userId;
        this.userEmail = socket.userEmail;
        this.userName = socket.userName;

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Eventos de conexión a salas
        this.socket.on('join:list', this.handleJoinList.bind(this));
        this.socket.on('leave:list', this.handleLeaveList.bind(this));

        // Eventos de mensajes
        this.socket.on('message:send', this.handleSendMessage.bind(this));
        this.socket.on('message:edit', this.handleEditMessage.bind(this));
        this.socket.on('message:delete', this.handleDeleteMessage.bind(this));
        this.socket.on('message:read', this.handleMarkAsRead.bind(this));
        this.socket.on('messages:read_all', this.handleMarkAllAsRead.bind(this));

        // Eventos de estado
        this.socket.on('typing:start', this.handleTypingStart.bind(this));
        this.socket.on('typing:stop', this.handleTypingStop.bind(this));

        // Eventos de consulta
        this.socket.on('get:online_users', this.handleGetOnlineUsers.bind(this));
        this.socket.on('get:statistics', this.handleGetStatistics.bind(this));

        // Desconexión
        this.socket.on('disconnect', this.handleDisconnect.bind(this));
    }

    /**
     * Unirse a una sala de chat (lista)
     */
    async handleJoinList({ idLista }) {
        try {
            console.log(`📥 Usuario ${this.userEmail} intenta unirse a lista ${idLista}`);

            // Validar idLista
            if (!idLista || isNaN(idLista)) {
                return this.socket.emit('error', {
                    event: 'join:list',
                    message: 'ID de lista inválido'
                });
            }

            // Verificar permisos
            const tieneAcceso = await Mensaje.verificarAccesoLista(this.userId, idLista);

            if (!tieneAcceso) {
                return this.socket.emit('error', {
                    event: 'join:list',
                    message: 'No tienes permisos para acceder a esta lista'
                });
            }

            // Unirse a la sala
            const roomName = `lista:${idLista}`;
            await this.socket.join(roomName);

            // Registrar en base de datos
            await ChatService.registrarUsuarioOnline(this.userId, idLista, this.socket.id);

            console.log(`✅ Usuario ${this.userEmail} se unió a ${roomName}`);

            // Notificar a otros usuarios
            this.socket.to(roomName).emit('user:joined', {
                idUsuario: this.userId,
                email: this.userEmail,
                nombre: this.userName
            });

            // Obtener y enviar usuarios online
            const usuariosOnline = await ChatService.obtenerUsuariosOnline(idLista);
            this.socket.emit('users:online', { usuarios: usuariosOnline });

            // Confirmar unión
            this.socket.emit('join:success', {
                idLista,
                room: roomName,
                usuariosOnline: usuariosOnline.length
            });

        } catch (error) {
            console.error('Error en join:list:', error);
            this.socket.emit('error', {
                event: 'join:list',
                message: error.message
            });
        }
    }

    /**
     * Salir de una sala de chat
     */
    async handleLeaveList({ idLista }) {
        try {
            const roomName = `lista:${idLista}`;

            // Salir de la sala
            await this.socket.leave(roomName);

            // Remover de base de datos
            await ChatService.removerUsuarioLista(this.userId, idLista, this.socket.id);

            // Remover estado de escribiendo
            await ChatService.removerEscribiendo(this.userId, idLista);

            // Notificar a otros usuarios
            this.socket.to(roomName).emit('user:left', {
                idUsuario: this.userId,
                email: this.userEmail
            });

            console.log(`👋 Usuario ${this.userEmail} salió de ${roomName}`);

        } catch (error) {
            console.error('Error en leave:list:', error);
        }
    }

    /**
     * Enviar mensaje
     */
    async handleSendMessage({ idLista, contenido }) {
        try {
            console.log(`💬 Mensaje de ${this.userEmail} en lista ${idLista}`);

            // Crear mensaje
            const mensaje = await ChatService.crearMensaje(idLista, this.userId, contenido);

            // Remover estado de escribiendo
            await ChatService.removerEscribiendo(this.userId, idLista);

            // Preparar datos del mensaje
            const mensajeCompleto = {
                ...mensaje,
                usuario: {
                    idUsuario: this.userId,
                    email: this.userEmail,
                    nombre: this.userName
                }
            };

            // Broadcast a todos en la sala (incluyendo al emisor)
            const roomName = `lista:${idLista}`;
            this.chatNamespace.to(roomName).emit('message:new', mensajeCompleto);

            console.log(`✅ Mensaje enviado en ${roomName}`);

        } catch (error) {
            console.error('Error en message:send:', error);
            this.socket.emit('error', {
                event: 'message:send',
                message: error.message
            });
        }
    }

    /**
     * Editar mensaje
     */
    async handleEditMessage({ idMensaje, contenido }) {
        try {
            // Validar contenido
            const contenidoLimpio = ChatService.validarMensaje(contenido);

            // Editar mensaje
            const mensajeActualizado = await Mensaje.editar(idMensaje, this.userId, contenidoLimpio);

            // Broadcast a la sala
            const roomName = `lista:${mensajeActualizado.idLista}`;
            this.chatNamespace.to(roomName).emit('message:edited', {
                idMensaje,
                contenido: contenidoLimpio,
                editado: true,
                fechaEdicion: new Date()
            });

            console.log(`✏️ Mensaje ${idMensaje} editado por ${this.userEmail}`);

        } catch (error) {
            console.error('Error en message:edit:', error);
            this.socket.emit('error', {
                event: 'message:edit',
                message: error.message
            });
        }
    }

    /**
     * Eliminar mensaje
     */
    async handleDeleteMessage({ idMensaje, idLista }) {
        try {
            // Eliminar mensaje
            await Mensaje.eliminar(idMensaje, this.userId);

            // Broadcast a la sala
            const roomName = `lista:${idLista}`;
            this.chatNamespace.to(roomName).emit('message:deleted', {
                idMensaje,
                idUsuario: this.userId
            });

            console.log(`🗑️ Mensaje ${idMensaje} eliminado por ${this.userEmail}`);

        } catch (error) {
            console.error('Error en message:delete:', error);
            this.socket.emit('error', {
                event: 'message:delete',
                message: error.message
            });
        }
    }

    /**
     * Marcar mensaje como leído
     */
    async handleMarkAsRead({ idMensaje, idLista }) {
        try {
            await Mensaje.marcarComoLeido(idMensaje, this.userId);

            // Notificar al autor del mensaje
            const roomName = `lista:${idLista}`;
            this.socket.to(roomName).emit('message:read', {
                idMensaje,
                idUsuario: this.userId,
                email: this.userEmail
            });

        } catch (error) {
            console.error('Error en message:read:', error);
        }
    }

    /**
     * Marcar todos los mensajes como leídos
     */
    async handleMarkAllAsRead({ idLista }) {
        try {
            const resultado = await Mensaje.marcarTodosComoLeidos(idLista, this.userId);

            this.socket.emit('messages:marked_read', {
                idLista,
                count: resultado.mensajesMarcados
            });

            console.log(`✅ ${resultado.mensajesMarcados} mensajes marcados como leídos por ${this.userEmail}`);

        } catch (error) {
            console.error('Error en messages:read_all:', error);
            this.socket.emit('error', {
                event: 'messages:read_all',
                message: error.message
            });
        }
    }

    /**
     * Usuario empieza a escribir
     */
    async handleTypingStart({ idLista }) {
        try {
            await ChatService.registrarEscribiendo(this.userId, idLista, this.socket.id);

            const roomName = `lista:${idLista}`;
            this.socket.to(roomName).emit('typing:user', {
                idUsuario: this.userId,
                email: this.userEmail,
                nombre: this.userName
            });

        } catch (error) {
            console.error('Error en typing:start:', error);
        }
    }

    /**
     * Usuario deja de escribir
     */
    async handleTypingStop({ idLista }) {
        try {
            await ChatService.removerEscribiendo(this.userId, idLista, this.socket.id);

            const roomName = `lista:${idLista}`;
            this.socket.to(roomName).emit('typing:stop', {
                idUsuario: this.userId
            });

        } catch (error) {
            console.error('Error en typing:stop:', error);
        }
    }

    /**
     * Obtener usuarios online
     */
    async handleGetOnlineUsers({ idLista }) {
        try {
            const usuariosOnline = await ChatService.obtenerUsuariosOnline(idLista);

            this.socket.emit('users:online', {
                idLista,
                usuarios: usuariosOnline
            });

        } catch (error) {
            console.error('Error en get:online_users:', error);
            this.socket.emit('error', {
                event: 'get:online_users',
                message: error.message
            });
        }
    }

    /**
     * Obtener estadísticas del chat
     */
    async handleGetStatistics({ idLista }) {
        try {
            const estadisticas = await ChatService.obtenerEstadisticas(idLista);

            this.socket.emit('statistics', {
                idLista,
                ...estadisticas
            });

        } catch (error) {
            console.error('Error en get:statistics:', error);
            this.socket.emit('error', {
                event: 'get:statistics',
                message: error.message
            });
        }
    }

    /**
     * Desconexión
     */
    async handleDisconnect() {
        try {
            console.log(`🔌 Usuario desconectado: ${this.userEmail}`);

            // Remover de todas las salas online
            await ChatService.removerUsuarioOnline(this.socket.id);

            // Notificar a todas las salas en las que estaba
            const rooms = Array.from(this.socket.rooms).filter(room => room.startsWith('lista:'));

            for (const room of rooms) {
                this.socket.to(room).emit('user:left', {
                    idUsuario: this.userId,
                    email: this.userEmail
                });
            }

        } catch (error) {
            console.error('Error en disconnect:', error);
        }
    }
}

module.exports = ChatHandler;