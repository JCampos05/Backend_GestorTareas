-- ============================================
-- MIGRACIÓN OPTIMIZADA: Sistema de Chat
-- Versión simplificada pero funcional
-- ============================================

USE tasker;

-- ============================================
-- TABLA: mensaje
-- Descripción: Mensajes del chat (SIN CAMBIOS)
-- ============================================
CREATE TABLE mensaje (
  idMensaje INT NOT NULL AUTO_INCREMENT,
  contenido TEXT NOT NULL,
  idLista INT NOT NULL,
  idUsuario INT NOT NULL,
  editado BOOLEAN DEFAULT FALSE,
  fechaCreacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fechaEdicion TIMESTAMP NULL,
  eliminado BOOLEAN DEFAULT FALSE,
  fechaEliminacion TIMESTAMP NULL,
  
  PRIMARY KEY (idMensaje),
  KEY idx_mensaje_lista_fecha (idLista, fechaCreacion DESC),
  KEY idx_mensaje_usuario (idUsuario),
  KEY idx_mensaje_lista_activo (idLista, eliminado, fechaCreacion DESC),
  
  CONSTRAINT fk_mensaje_lista 
    FOREIGN KEY (idLista) 
    REFERENCES lista (idLista) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE,
    
  CONSTRAINT fk_mensaje_usuario 
    FOREIGN KEY (idUsuario) 
    REFERENCES usuario (idUsuario) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE
) ;

-- ============================================
-- TABLA: mensaje_lectura
-- Descripción: NECESARIA - Relación muchos-a-muchos
-- No se puede unificar porque un mensaje puede ser
-- leído por múltiples usuarios en diferentes momentos
-- ============================================
CREATE TABLE mensaje_lectura (
  idMensajeLectura INT NOT NULL AUTO_INCREMENT,
  idMensaje INT NOT NULL,
  idUsuario INT NOT NULL,
  fechaLeido TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  PRIMARY KEY (idMensajeLectura),
  UNIQUE KEY uk_mensaje_usuario (idMensaje, idUsuario),
  KEY idx_lectura_mensaje (idMensaje),
  KEY idx_lectura_usuario (idUsuario),
  
  CONSTRAINT fk_lectura_mensaje 
    FOREIGN KEY (idMensaje) 
    REFERENCES mensaje (idMensaje) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE,
    
  CONSTRAINT fk_lectura_usuario 
    FOREIGN KEY (idUsuario) 
    REFERENCES usuario (idUsuario) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE
) ;

-- ============================================
-- TABLA UNIFICADA: usuario_actividad
-- Descripción: Combina estado online y escribiendo
-- OPTIMIZACIÓN: Una tabla con campos específicos
-- ============================================
CREATE TABLE usuario_actividad (
  idActividad INT NOT NULL AUTO_INCREMENT,
  idUsuario INT NOT NULL,
  idLista INT NOT NULL,
  socketId VARCHAR(100) NOT NULL,
  
  -- Estado de conexión
  conectado BOOLEAN DEFAULT TRUE,
  ultimaActividad TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Estado de escritura
  escribiendo BOOLEAN DEFAULT FALSE,
  escribiendoDesde TIMESTAMP NULL,
  
  PRIMARY KEY (idActividad),
  UNIQUE KEY uk_usuario_lista_socket (idUsuario, idLista, socketId),
  KEY idx_actividad_usuario (idUsuario),
  KEY idx_actividad_lista (idLista),
  KEY idx_actividad_lista_conectado (idLista, conectado, ultimaActividad),
  KEY idx_actividad_lista_escribiendo (idLista, escribiendo, escribiendoDesde),
  
  CONSTRAINT fk_actividad_usuario 
    FOREIGN KEY (idUsuario) 
    REFERENCES usuario (idUsuario) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE,
    
  CONSTRAINT fk_actividad_lista 
    FOREIGN KEY (idLista) 
    REFERENCES lista (idLista) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE
) ;

-- ============================================
-- MODIFICACIÓN: Actualizar tipos de notificaciones
-- ============================================
ALTER TABLE notificaciones 
  MODIFY COLUMN tipo ENUM(
    'invitacion_lista',
    'tarea_asignada',
    'comentario',
    'tarea_repetir',
    'recordatorio',
    'mensaje_chat',
    'otro'
  ) NOT NULL;

-- Agregar columna para referenciar mensajes
ALTER TABLE notificaciones
  ADD COLUMN idMensaje INT DEFAULT NULL AFTER datos_adicionales,
  ADD KEY idx_notificacion_mensaje (idMensaje);

ALTER TABLE notificaciones
  ADD CONSTRAINT fk_notificacion_mensaje 
    FOREIGN KEY (idMensaje) 
    REFERENCES mensaje (idMensaje) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE;

-- ============================================
-- PROCEDIMIENTOS ALMACENADOS ACTUALIZADOS
-- ============================================

-- Limpiar actividad inactiva
DELIMITER $$
DROP PROCEDURE IF EXISTS sp_limpiar_actividad_inactiva$$
CREATE PROCEDURE sp_limpiar_actividad_inactiva()
BEGIN
  -- Marcar usuarios como desconectados (más de 5 minutos sin actividad)
  UPDATE usuario_actividad 
  SET conectado = FALSE, escribiendo = FALSE
  WHERE ultimaActividad < DATE_SUB(NOW(), INTERVAL 5 MINUTE)
    AND conectado = TRUE;
  
  -- Eliminar registros muy antiguos (más de 1 hora)
  DELETE FROM usuario_actividad 
  WHERE ultimaActividad < DATE_SUB(NOW(), INTERVAL 1 HOUR);
  
  -- Limpiar estado "escribiendo" después de 30 segundos
  UPDATE usuario_actividad
  SET escribiendo = FALSE, escribiendoDesde = NULL
  WHERE escribiendo = TRUE
    AND escribiendoDesde < DATE_SUB(NOW(), INTERVAL 30 SECOND);
END$$
DELIMITER ;

-- Obtener historial de mensajes con info de lectura
DELIMITER $$
DROP PROCEDURE IF EXISTS sp_obtener_mensajes_lista$$
CREATE PROCEDURE sp_obtener_mensajes_lista(
  IN p_idLista INT,
  IN p_idUsuario INT,
  IN p_limite INT,
  IN p_offset INT
)
BEGIN
  -- Verificar acceso
  IF EXISTS(
    SELECT 1 FROM lista_compartida 
    WHERE idLista = p_idLista 
      AND idUsuario = p_idUsuario 
      AND activo = TRUE 
      AND aceptado = TRUE
  ) OR EXISTS(
    SELECT 1 FROM lista
    WHERE idLista = p_idLista
      AND idUsuario = p_idUsuario
  ) THEN
    
    SELECT 
      m.idMensaje,
      m.contenido,
      m.idUsuario,
      m.idLista,
      m.editado,
      m.fechaCreacion,
      m.fechaEdicion,
      u.nombre as nombreUsuario,
      u.email as emailUsuario,
      (SELECT COUNT(*) FROM mensaje_lectura ml WHERE ml.idMensaje = m.idMensaje) as totalLecturas,
      EXISTS(
        SELECT 1 FROM mensaje_lectura ml 
        WHERE ml.idMensaje = m.idMensaje 
          AND ml.idUsuario = p_idUsuario
      ) as leidoPorMi
    FROM mensaje m
    INNER JOIN usuario u ON m.idUsuario = u.idUsuario
    WHERE m.idLista = p_idLista 
      AND m.eliminado = FALSE
    ORDER BY m.fechaCreacion DESC
    LIMIT p_limite OFFSET p_offset;
    
  ELSE
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Usuario sin permisos para esta lista';
  END IF;
END$$
DELIMITER ;

-- Marcar mensajes como leídos
DELIMITER $$
DROP PROCEDURE IF EXISTS sp_marcar_mensajes_leidos$$
CREATE PROCEDURE sp_marcar_mensajes_leidos(
  IN p_idLista INT,
  IN p_idUsuario INT
)
BEGIN
  INSERT INTO mensaje_lectura (idMensaje, idUsuario, fechaLeido)
  SELECT 
    m.idMensaje, 
    p_idUsuario,
    NOW()
  FROM mensaje m
  LEFT JOIN mensaje_lectura ml ON m.idMensaje = ml.idMensaje 
    AND ml.idUsuario = p_idUsuario
  WHERE m.idLista = p_idLista
    AND m.idUsuario != p_idUsuario
    AND m.eliminado = FALSE
    AND ml.idMensajeLectura IS NULL
  ON DUPLICATE KEY UPDATE fechaLeido = NOW();
  
  SELECT ROW_COUNT() as mensajesMarcados;
END$$
DELIMITER ;

-- ============================================
-- EVENTOS PROGRAMADOS
-- ============================================

SET GLOBAL event_scheduler = ON;

DROP EVENT IF EXISTS evt_limpiar_actividad_inactiva;
CREATE EVENT evt_limpiar_actividad_inactiva
ON SCHEDULE EVERY 1 MINUTE
DO
  CALL sp_limpiar_actividad_inactiva();

-- ============================================
-- TRIGGERS
-- ============================================

DELIMITER $$
DROP TRIGGER IF EXISTS trg_mensaje_notificar$$
CREATE TRIGGER trg_mensaje_notificar
AFTER INSERT ON mensaje
FOR EACH ROW
BEGIN
  INSERT INTO notificaciones (
    id_usuario, 
    tipo, 
    titulo, 
    mensaje, 
    idMensaje,
    datos_adicionales
  )
  SELECT 
    lc.idUsuario,
    'mensaje_chat',
    CONCAT('Nuevo mensaje en ', l.nombre),
    LEFT(NEW.contenido, 100),
    NEW.idMensaje,
    JSON_OBJECT(
      'idLista', NEW.idLista,
      'idMensaje', NEW.idMensaje,
      'nombreLista', l.nombre
    )
  FROM lista_compartida lc
  INNER JOIN lista l ON lc.idLista = l.idLista
  WHERE lc.idLista = NEW.idLista
    AND lc.idUsuario != NEW.idUsuario
    AND lc.activo = TRUE
    AND lc.aceptado = TRUE;
END$$
DELIMITER ;

-- ============================================
-- VISTAS ÚTILES
-- ============================================

-- Vista de usuarios online por lista
CREATE OR REPLACE VIEW v_usuarios_online_lista AS
SELECT 
  ua.idLista,
  ua.idUsuario,
  u.nombre,
  u.email,
  COUNT(DISTINCT ua.socketId) as conexionesActivas,
  MAX(ua.ultimaActividad) as ultimaActividad,
  MAX(CASE WHEN ua.escribiendo = TRUE THEN 1 ELSE 0 END) as estaEscribiendo
FROM usuario_actividad ua
INNER JOIN usuario u ON ua.idUsuario = u.idUsuario
WHERE ua.conectado = TRUE
  AND ua.ultimaActividad >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)
GROUP BY ua.idLista, ua.idUsuario, u.nombre, u.email;

-- Vista de mensajes no leídos
CREATE OR REPLACE VIEW v_mensajes_no_leidos AS
SELECT 
  l.idLista,
  lc.idUsuario,
  COUNT(DISTINCT m.idMensaje) as mensajesNoLeidos
FROM lista l
INNER JOIN lista_compartida lc ON l.idLista = lc.idLista
INNER JOIN mensaje m ON l.idLista = m.idLista
LEFT JOIN mensaje_lectura ml ON m.idMensaje = ml.idMensaje 
  AND ml.idUsuario = lc.idUsuario
WHERE lc.activo = TRUE
  AND lc.aceptado = TRUE
  AND m.eliminado = FALSE
  AND m.idUsuario != lc.idUsuario
  AND ml.idMensajeLectura IS NULL
GROUP BY l.idLista, lc.idUsuario;

-- ============================================
-- ÍNDICES ADICIONALES PARA PERFORMANCE
-- ============================================

-- Índice para consultas de usuarios escribiendo
CREATE INDEX idx_actividad_escribiendo_activo 
  ON usuario_actividad(idLista, escribiendo, conectado, escribiendoDesde);

-- ============================================
-- VERIFICACIÓN
-- ============================================

SELECT 'Migración optimizada completada exitosamente' as status;

SELECT 
  TABLE_NAME, 
  TABLE_ROWS,
  ROUND(((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024), 2) as 'Tamaño (MB)'
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'tasker' 
  AND TABLE_NAME IN ('mensaje', 'mensaje_lectura', 'usuario_actividad')
ORDER BY TABLE_NAME;