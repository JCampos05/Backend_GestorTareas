-- CREATE DATABASE Tasker;
USE tasker;


CREATE TABLE usuario (
  idUsuario INT NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL,
  emailVerificado BOOLEAN DEFAULT FALSE,
  bio TEXT NULL,
  telefono VARCHAR(20) NULL,
  ubicacion VARCHAR(100) NULL,
  zona_horaria VARCHAR(100) NULL,
  cargo VARCHAR(100) NULL,
  redes_sociales JSON NULL,
  password VARCHAR(255) NOT NULL,
  fechaRegistro TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER redes_sociales;

  PRIMARY KEY (idUsuario),
  UNIQUE KEY uk_usuario_email (email),
  KEY idx_usuario_email (email)
) ;
CREATE INDEX idx_usuario_ubicacion ON usuario(ubicacion);
-- ============================================
-- TABLA: categoria
-- Descripción: Categorías para organizar listas
-- ============================================

CREATE TABLE categoria (
  idCategoria INT NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(100) NOT NULL,
  idUsuario INT DEFAULT NULL,
  compartible TINYINT(1) NOT NULL DEFAULT '0',
  tipoPrivacidad ENUM('privada','compartida') DEFAULT 'privada',
  claveCompartir VARCHAR(12) DEFAULT NULL,
  fechaActualizacion TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (idCategoria),
  UNIQUE KEY uk_categoria_clave (claveCompartir),
  KEY idx_categoria_usuario (idUsuario),
  KEY idx_categoria_clave (claveCompartir),
  
  CONSTRAINT fk_categoria_usuario 
    FOREIGN KEY (idUsuario) 
    REFERENCES usuario (idUsuario) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE
) ;

-- ============================================
-- TABLA: lista
-- Descripción: Listas de tareas
-- ============================================
CREATE TABLE lista (
  idLista INT NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(100) NOT NULL,
  color VARCHAR(7) DEFAULT NULL,
  icono VARCHAR(100) DEFAULT NULL,
  importante TINYINT(1) DEFAULT '0',
  idCategoria INT DEFAULT NULL,
  fechaCreacion TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  idUsuario INT DEFAULT NULL,
  compartible TINYINT(1) DEFAULT '0',
  claveCompartir VARCHAR(12) DEFAULT NULL,
  fechaActualizacion TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (idLista),
  UNIQUE KEY uk_lista_clave (claveCompartir),
  KEY idx_lista_categoria (idCategoria),
  KEY idx_lista_usuario (idUsuario),
  KEY idx_lista_clave (claveCompartir),
  
  CONSTRAINT fk_lista_categoria 
    FOREIGN KEY (idCategoria) 
    REFERENCES categoria (idCategoria) 
    ON DELETE SET NULL 
    ON UPDATE CASCADE,
  CONSTRAINT fk_lista_usuario 
    FOREIGN KEY (idUsuario) 
    REFERENCES usuario (idUsuario) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE
) ;

-- ============================================
-- TABLA: tarea
-- Descripción: Tareas individuales dentro de listas
-- ============================================

CREATE TABLE tarea (
  idTarea INT NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(50) NOT NULL,
  descripcion TEXT,
  prioridad ENUM('A','N','B') DEFAULT NULL COMMENT 'A=Alta, N=Normal, B=Baja',
  estado ENUM('C','P','N') DEFAULT NULL COMMENT 'C=Completada, P=En Progreso, N=No Iniciada',
  fechaCreacion TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  fechaVencimiento DATE DEFAULT NULL,
  miDia BOOLEAN DEFAULT FALSE,
  pasos JSON DEFAULT NULL,
  notas TEXT,
  recordatorio JSON DEFAULT NULL,
  repetir BOOLEAN DEFAULT FALSE,
  ultimaRepeticion DATETIME NULL,
  tipoRepeticion ENUM('diario','laborales','semanal','mensual','personalizado') DEFAULT NULL,
  configRepeticion JSON DEFAULT NULL,
  idLista INT DEFAULT NULL,
  idUsuario INT DEFAULT NULL,
  idUsuarioAsignado INT DEFAULT NULL,
  
  PRIMARY KEY (idTarea),
  KEY idx_tarea_lista (idLista),
  KEY idx_tarea_usuario (idUsuario),
  KEY idx_tarea_usuario_asignado (idUsuarioAsignado),
  KEY idx_tarea_fecha_vencimiento (fechaVencimiento),
  KEY idx_tarea_estado (estado),
  
  CONSTRAINT fk_tarea_lista 
    FOREIGN KEY (idLista) 
    REFERENCES lista (idLista) 
    ON DELETE SET NULL 
    ON UPDATE CASCADE,
  CONSTRAINT fk_tarea_usuario 
    FOREIGN KEY (idUsuario) 
    REFERENCES usuario (idUsuario) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE,
  CONSTRAINT fk_tarea_usuario_asignado 
    FOREIGN KEY (idUsuarioAsignado) 
    REFERENCES usuario (idUsuario) 
    ON DELETE SET NULL 
    ON UPDATE CASCADE
) ;

CREATE INDEX idx_tarea_recordatorio ON tarea((CAST(recordatorio AS CHAR(100)) COLLATE utf8mb4_bin));
-- ============================================
-- TABLA: categoria_compartida
-- Descripción: Relación de categorías compartidas con usuarios
-- ============================================

CREATE TABLE categoria_compartida (
  idCategoriaCompartida INT NOT NULL AUTO_INCREMENT,
  idCategoria INT NOT NULL,
  idUsuario INT NOT NULL,
  rol ENUM('admin','editor','colaborador','visor') NOT NULL DEFAULT 'visor',
  esCreador BOOLEAN DEFAULT FALSE,
  fechaCompartido TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  compartidoPor INT NOT NULL,
  aceptado BOOLEAN DEFAULT FALSE,
  activo BOOLEAN DEFAULT TRUE,
  
  PRIMARY KEY (idCategoriaCompartida),
  UNIQUE KEY uk_categoria_usuario (idCategoria,idUsuario),
  KEY idx_categoria_compartida_categoria (idCategoria),
  KEY idx_categoria_compartida_usuario (idUsuario),
  KEY idx_categoria_compartida_por (compartidoPor),
  KEY idx_categoria_compartida_activo (activo,idCategoria),
  KEY idx_categoria_usuario_activo (idUsuario,activo,aceptado),
  
  CONSTRAINT fk_categoria_compartida_categoria 
    FOREIGN KEY (idCategoria) 
    REFERENCES categoria (idCategoria) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE,
  CONSTRAINT fk_categoria_compartida_usuario 
    FOREIGN KEY (idUsuario) 
    REFERENCES usuario (idUsuario) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE,
  CONSTRAINT fk_categoria_compartida_compartido_por 
    FOREIGN KEY (compartidoPor) 
    REFERENCES usuario (idUsuario) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE
) ;

-- ============================================
-- TABLA: lista_compartida
-- Descripción: Relación de listas compartidas con usuarios
-- ============================================

CREATE TABLE lista_compartida (
  idListaCompartida INT NOT NULL AUTO_INCREMENT,
  idLista INT NOT NULL,
  idUsuario INT NOT NULL,
  rol ENUM('admin','editor','colaborador','visor') NOT NULL DEFAULT 'visor',
  esCreador BOOLEAN DEFAULT FALSE,
  fechaCompartido TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  compartidoPor INT NOT NULL,
  aceptado BOOLEAN DEFAULT FALSE,
  activo BOOLEAN DEFAULT TRUE,
  
  PRIMARY KEY (idListaCompartida),
  UNIQUE KEY uk_lista_usuario (idLista,idUsuario),
  KEY idx_lista_compartida_lista (idLista),
  KEY idx_lista_compartida_usuario (idUsuario),
  KEY idx_lista_compartida_por (compartidoPor),
  KEY idx_lista_compartida_activo (activo,idLista),
  KEY idx_lista_usuario_activo (idUsuario,activo,aceptado),
  
  CONSTRAINT fk_lista_compartida_lista 
    FOREIGN KEY (idLista) 
    REFERENCES lista (idLista) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE,
  CONSTRAINT fk_lista_compartida_usuario 
    FOREIGN KEY (idUsuario) 
    REFERENCES usuario (idUsuario) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE,
  CONSTRAINT fk_lista_compartida_compartido_por 
    FOREIGN KEY (compartidoPor) 
    REFERENCES usuario (idUsuario) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE
) ;

-- ============================================
-- TABLA: invitacion
-- Descripción: Invitaciones pendientes para compartir categorías o listas
-- ============================================

CREATE TABLE invitacion (
  idInvitacion INT NOT NULL AUTO_INCREMENT,
  tipo ENUM('categoria','lista') NOT NULL,
  idEntidad INT NOT NULL,
  emailInvitado VARCHAR(100) NOT NULL,
  rol ENUM('admin','editor','colaborador','visor') NOT NULL DEFAULT 'visor',
  token VARCHAR(255) NOT NULL,
  invitadoPor INT NOT NULL,
  fechaInvitacion TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  fechaExpiracion TIMESTAMP NULL DEFAULT NULL,
  aceptada BOOLEAN DEFAULT FALSE,
  activa BOOLEAN DEFAULT TRUE,
  
  PRIMARY KEY (idInvitacion),
  UNIQUE KEY uk_invitacion_token (token),
  KEY idx_invitacion_email (emailInvitado),
  KEY idx_invitacion_token (token),
  KEY idx_invitacion_invitado_por (invitadoPor),
  KEY idx_invitacion_activa (activa,aceptada),
  KEY idx_invitacion_tipo_entidad (tipo,idEntidad),
  
  CONSTRAINT fk_invitacion_invitado_por 
    FOREIGN KEY (invitadoPor) 
    REFERENCES usuario (idUsuario) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE
) ;

-- ============================================
-- TABLA: notificaciones
-- Descripción: Sistema de notificaciones para usuarios
-- ============================================

CREATE TABLE notificaciones (
  id INT NOT NULL AUTO_INCREMENT,
  id_usuario INT NOT NULL,
  tipo ENUM('invitacion_lista','tarea_asignada','comentario','tarea_repetir', 'recordatorio',
  'mensaje_chat' , 'cambio_rol_lista', 'otro') NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  mensaje TEXT NOT NULL,
  datos_adicionales JSON DEFAULT NULL,
  leida BOOLEAN DEFAULT FALSE,
  fecha_creacion TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  
  PRIMARY KEY (id),
  KEY idx_notificacion_usuario_leida (id_usuario,leida),
  KEY idx_notificacion_fecha (fecha_creacion),
  KEY idx_notificacion_tipo (tipo),
  
  CONSTRAINT fk_notificacion_usuario 
    FOREIGN KEY (id_usuario) 
    REFERENCES usuario (idUsuario) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE
) ;

-- ============================================
-- TABLA: auditoria_compartidos
-- Descripción: Registro de auditoría para acciones en elementos compartidos
-- ============================================

CREATE TABLE auditoria_compartidos (
  idAuditoria INT NOT NULL AUTO_INCREMENT,
  tipo ENUM('categoria','lista') NOT NULL,
  idEntidad INT NOT NULL,
  idUsuario INT NOT NULL,
  accion VARCHAR(100) NOT NULL,
  detalles JSON DEFAULT NULL,
  fecha TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  
  PRIMARY KEY (idAuditoria),
  KEY idx_auditoria_tipo_entidad (tipo,idEntidad),
  KEY idx_auditoria_usuario (idUsuario),
  KEY idx_auditoria_fecha (fecha),
  KEY idx_auditoria_accion (accion),
  
  CONSTRAINT fk_auditoria_usuario 
    FOREIGN KEY (idUsuario) 
    REFERENCES usuario (idUsuario) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE
) ;

CREATE TABLE nota (
  idNota INT NOT NULL AUTO_INCREMENT,
  titulo VARCHAR(100) DEFAULT NULL,
  contenido TEXT DEFAULT NULL,
  color VARCHAR(7) DEFAULT '#FFF740', -- amarillo por defecto
  fijada BOOLEAN DEFAULT FALSE,
  posicion INT DEFAULT 0, -- para ordenamiento
  idUsuario INT NOT NULL,
  fechaCreacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fechaActualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (idNota),
  KEY idx_nota_usuario (idUsuario),
  KEY idx_nota_fijada (fijada, posicion),
  
  CONSTRAINT fk_nota_usuario 
    FOREIGN KEY (idUsuario) 
    REFERENCES usuario (idUsuario) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE
) ;


CREATE TABLE  zonas_horarias (
  idZona INT NOT NULL AUTO_INCREMENT,
  zona VARCHAR(100) NOT NULL COMMENT 'IANA timezone ID (Ej: America/Mexico_City)',
  nombre VARCHAR(200) NOT NULL COMMENT 'Nombre descriptivo',
  region VARCHAR(100) NOT NULL COMMENT 'Continente/Región',
  offset_actual VARCHAR(10) NOT NULL COMMENT 'Offset actual (Ej: GMT-6)',
  offset_minutos INT NOT NULL COMMENT 'Offset en minutos desde UTC',
  usa_dst BOOLEAN DEFAULT FALSE COMMENT 'Usa Daylight Saving Time',
  activa BOOLEAN DEFAULT TRUE,
  orden INT DEFAULT 0 COMMENT 'Para ordenamiento en UI',
  
  PRIMARY KEY (idZona),
  UNIQUE KEY uk_zona (zona),
  KEY idx_region (region),
  KEY idx_offset (offset_minutos)
);


-- ========== AMÉRICA ==========
INSERT INTO zonas_horarias (zona, nombre, region, offset_actual, offset_minutos, usa_dst, orden) VALUES

-- América del Norte
('America/New_York', 'Nueva York (Este)', 'América del Norte', 'GMT-5', -300, TRUE, 1),
('America/Chicago', 'Chicago (Centro)', 'América del Norte', 'GMT-6', -360, TRUE, 2),
('America/Denver', 'Denver (Montaña)', 'América del Norte', 'GMT-7', -420, TRUE, 3),
('America/Los_Angeles', 'Los Ángeles (Pacífico)', 'América del Norte', 'GMT-8', -480, TRUE, 4),
('America/Anchorage', 'Anchorage (Alaska)', 'América del Norte', 'GMT-9', -540, TRUE, 5),
('Pacific/Honolulu', 'Honolulu (Hawái)', 'América del Norte', 'GMT-10', -600, FALSE, 6),

-- México
('America/Mexico_City', 'Ciudad de México (Centro)', 'México', 'GMT-6', -360, FALSE, 10),
('America/Cancun', 'Cancún (Sureste)', 'México', 'GMT-5', -300, FALSE, 11),
('America/Monterrey', 'Monterrey (Centro)', 'México', 'GMT-6', -360, FALSE, 12),
('America/Tijuana', 'Tijuana (Noroeste)', 'México', 'GMT-8', -480, TRUE, 13),
('America/Mazatlan', 'Mazatlán (Pacífico)', 'México', 'GMT-7', -420, TRUE, 14),
('America/Hermosillo', 'Hermosillo (Sonora)', 'México', 'GMT-7', -420, FALSE, 15),

-- América Central
('America/Guatemala', 'Guatemala', 'América Central', 'GMT-6', -360, FALSE, 20),
('America/El_Salvador', 'El Salvador', 'América Central', 'GMT-6', -360, FALSE, 21),
('America/Tegucigalpa', 'Tegucigalpa (Honduras)', 'América Central', 'GMT-6', -360, FALSE, 22),
('America/Managua', 'Managua (Nicaragua)', 'América Central', 'GMT-6', -360, FALSE, 23),
('America/Costa_Rica', 'San José (Costa Rica)', 'América Central', 'GMT-6', -360, FALSE, 24),
('America/Panama', 'Ciudad de Panamá', 'América Central', 'GMT-5', -300, FALSE, 25),
('America/Belize', 'Belmopan (Belice)', 'América Central', 'GMT-6', -360, FALSE, 26),

-- Caribe
('America/Havana', 'La Habana (Cuba)', 'Caribe', 'GMT-5', -300, TRUE, 30),
('America/Jamaica', 'Kingston (Jamaica)', 'Caribe', 'GMT-5', -300, FALSE, 31),
('America/Port-au-Prince', 'Puerto Príncipe (Haití)', 'Caribe', 'GMT-5', -300, TRUE, 32),
('America/Santo_Domingo', 'Santo Domingo (Rep. Dominicana)', 'Caribe', 'GMT-4', -240, FALSE, 33),
('America/Puerto_Rico', 'San Juan (Puerto Rico)', 'Caribe', 'GMT-4', -240, FALSE, 34),

-- América del Sur
('America/Bogota', 'Bogotá (Colombia)', 'América del Sur', 'GMT-5', -300, FALSE, 40),
('America/Caracas', 'Caracas (Venezuela)', 'América del Sur', 'GMT-4', -240, FALSE, 41),
('America/Guayaquil', 'Guayaquil (Ecuador)', 'América del Sur', 'GMT-5', -300, FALSE, 42),
('America/Lima', 'Lima (Perú)', 'América del Sur', 'GMT-5', -300, FALSE, 43),
('America/La_Paz', 'La Paz (Bolivia)', 'América del Sur', 'GMT-4', -240, FALSE, 44),
('America/Santiago', 'Santiago (Chile)', 'América del Sur', 'GMT-3', -180, TRUE, 45),
('America/Argentina/Buenos_Aires', 'Buenos Aires (Argentina)', 'América del Sur', 'GMT-3', -180, FALSE, 46),
('America/Montevideo', 'Montevideo (Uruguay)', 'América del Sur', 'GMT-3', -180, FALSE, 47),
('America/Asuncion', 'Asunción (Paraguay)', 'América del Sur', 'GMT-3', -180, TRUE, 48),
('America/Sao_Paulo', 'São Paulo (Brasil)', 'América del Sur', 'GMT-3', -180, TRUE, 49),
('America/Manaus', 'Manaos (Brasil)', 'América del Sur', 'GMT-4', -240, FALSE, 50),
('America/Fortaleza', 'Fortaleza (Brasil)', 'América del Sur', 'GMT-3', -180, FALSE, 51),

-- ========== EUROPA ==========
('Europe/London', 'Londres (Reino Unido)', 'Europa Occidental', 'GMT+0', 0, TRUE, 100),
('Europe/Dublin', 'Dublín (Irlanda)', 'Europa Occidental', 'GMT+0', 0, TRUE, 101),
('Europe/Lisbon', 'Lisboa (Portugal)', 'Europa Occidental', 'GMT+0', 0, TRUE, 102),

('Europe/Paris', 'París (Francia)', 'Europa Central', 'GMT+1', 60, TRUE, 110),
('Europe/Madrid', 'Madrid (España)', 'Europa Central', 'GMT+1', 60, TRUE, 111),
('Europe/Berlin', 'Berlín (Alemania)', 'Europa Central', 'GMT+1', 60, TRUE, 112),
('Europe/Rome', 'Roma (Italia)', 'Europa Central', 'GMT+1', 60, TRUE, 113),
('Europe/Amsterdam', 'Ámsterdam (Países Bajos)', 'Europa Central', 'GMT+1', 60, TRUE, 114),
('Europe/Brussels', 'Bruselas (Bélgica)', 'Europa Central', 'GMT+1', 60, TRUE, 115),
('Europe/Vienna', 'Viena (Austria)', 'Europa Central', 'GMT+1', 60, TRUE, 116),
('Europe/Zurich', 'Zúrich (Suiza)', 'Europa Central', 'GMT+1', 60, TRUE, 117),
('Europe/Prague', 'Praga (Rep. Checa)', 'Europa Central', 'GMT+1', 60, TRUE, 118),
('Europe/Warsaw', 'Varsovia (Polonia)', 'Europa Central', 'GMT+1', 60, TRUE, 119),

('Europe/Athens', 'Atenas (Grecia)', 'Europa Oriental', 'GMT+2', 120, TRUE, 120),
('Europe/Bucharest', 'Bucarest (Rumania)', 'Europa Oriental', 'GMT+2', 120, TRUE, 121),
('Europe/Helsinki', 'Helsinki (Finlandia)', 'Europa Oriental', 'GMT+2', 120, TRUE, 122),
('Europe/Kiev', 'Kiev (Ucrania)', 'Europa Oriental', 'GMT+2', 120, TRUE, 123),
('Europe/Moscow', 'Moscú (Rusia)', 'Europa Oriental', 'GMT+3', 180, FALSE, 124),
('Europe/Istanbul', 'Estambul (Turquía)', 'Europa Oriental', 'GMT+3', 180, FALSE, 125),

-- ========== ASIA ==========
('Asia/Dubai', 'Dubái (EAU)', 'Medio Oriente', 'GMT+4', 240, FALSE, 200),
('Asia/Riyadh', 'Riad (Arabia Saudita)', 'Medio Oriente', 'GMT+3', 180, FALSE, 201),
('Asia/Jerusalem', 'Jerusalén (Israel)', 'Medio Oriente', 'GMT+2', 120, TRUE, 202),
('Asia/Tehran', 'Teherán (Irán)', 'Medio Oriente', 'GMT+3:30', 210, TRUE, 203),

('Asia/Karachi', 'Karachi (Pakistán)', 'Asia del Sur', 'GMT+5', 300, FALSE, 210),
('Asia/Kolkata', 'Calcuta (India)', 'Asia del Sur', 'GMT+5:30', 330, FALSE, 211),
('Asia/Dhaka', 'Daca (Bangladés)', 'Asia del Sur', 'GMT+6', 360, FALSE, 212),
('Asia/Kathmandu', 'Katmandú (Nepal)', 'Asia del Sur', 'GMT+5:45', 345, FALSE, 213),

('Asia/Bangkok', 'Bangkok (Tailandia)', 'Sudeste Asiático', 'GMT+7', 420, FALSE, 220),
('Asia/Singapore', 'Singapur', 'Sudeste Asiático', 'GMT+8', 480, FALSE, 221),
('Asia/Jakarta', 'Yakarta (Indonesia)', 'Sudeste Asiático', 'GMT+7', 420, FALSE, 222),
('Asia/Manila', 'Manila (Filipinas)', 'Sudeste Asiático', 'GMT+8', 480, FALSE, 223),
('Asia/Ho_Chi_Minh', 'Ho Chi Minh (Vietnam)', 'Sudeste Asiático', 'GMT+7', 420, FALSE, 224),

('Asia/Shanghai', 'Shanghái (China)', 'Asia Oriental', 'GMT+8', 480, FALSE, 230),
('Asia/Hong_Kong', 'Hong Kong', 'Asia Oriental', 'GMT+8', 480, FALSE, 231),
('Asia/Tokyo', 'Tokio (Japón)', 'Asia Oriental', 'GMT+9', 540, FALSE, 232),
('Asia/Seoul', 'Seúl (Corea del Sur)', 'Asia Oriental', 'GMT+9', 540, FALSE, 233),
('Asia/Taipei', 'Taipéi (Taiwán)', 'Asia Oriental', 'GMT+8', 480, FALSE, 234),

-- ========== OCEANÍA ==========
('Australia/Sydney', 'Sídney (Australia)', 'Oceanía', 'GMT+10', 600, TRUE, 300),
('Australia/Melbourne', 'Melbourne (Australia)', 'Oceanía', 'GMT+10', 600, TRUE, 301),
('Australia/Brisbane', 'Brisbane (Australia)', 'Oceanía', 'GMT+10', 600, FALSE, 302),
('Australia/Perth', 'Perth (Australia)', 'Oceanía', 'GMT+8', 480, FALSE, 303),
('Australia/Adelaide', 'Adelaida (Australia)', 'Oceanía', 'GMT+9:30', 570, TRUE, 304),

('Pacific/Auckland', 'Auckland (Nueva Zelanda)', 'Oceanía', 'GMT+12', 720, TRUE, 310),
('Pacific/Fiji', 'Suva (Fiyi)', 'Oceanía', 'GMT+12', 720, TRUE, 311),

-- ========== ÁFRICA ==========
('Africa/Cairo', 'El Cairo (Egipto)', 'África', 'GMT+2', 120, FALSE, 400),
('Africa/Johannesburg', 'Johannesburgo (Sudáfrica)', 'África', 'GMT+2', 120, FALSE, 401),
('Africa/Lagos', 'Lagos (Nigeria)', 'África', 'GMT+1', 60, FALSE, 402),
('Africa/Nairobi', 'Nairobi (Kenia)', 'África', 'GMT+3', 180, FALSE, 403),
('Africa/Casablanca', 'Casablanca (Marruecos)', 'África', 'GMT+0', 0, TRUE, 404);

-- ✅ PASO 5: Crear vista para facilitar consultas
CREATE OR REPLACE VIEW v_zonas_horarias_agrupadas AS
SELECT 
  region,
  COUNT(*) as total_zonas,
  GROUP_CONCAT(zona ORDER BY orden SEPARATOR ', ') as zonas
FROM zonas_horarias
WHERE activa = TRUE
GROUP BY region
ORDER BY MIN(orden);

-- ✅ PASO 6: Procedimiento para obtener zonas por región
DELIMITER $$
DROP PROCEDURE IF EXISTS sp_obtener_zonas_por_region$$
CREATE PROCEDURE sp_obtener_zonas_por_region(IN p_region VARCHAR(100))
BEGIN
  IF p_region IS NULL OR p_region = '' THEN
    -- Devolver todas las zonas agrupadas por región
    SELECT 
      idZona,
      zona,
      nombre,
      region,
      offset_actual,
      offset_minutos,
      usa_dst
    FROM zonas_horarias
    WHERE activa = TRUE
    ORDER BY orden, nombre;
  ELSE
    -- Devolver zonas de una región específica
    SELECT 
      idZona,
      zona,
      nombre,
      region,
      offset_actual,
      offset_minutos,
      usa_dst
    FROM zonas_horarias
    WHERE activa = TRUE 
      AND region = p_region
    ORDER BY orden, nombre;
  END IF;
END$$
DELIMITER ;



-- ============================================
-- TABLA: verificacion_email
-- Descripción: Sistema de verificación de correo
-- ============================================
CREATE TABLE verificacion_email (
  idVerificacion INT NOT NULL AUTO_INCREMENT,
  idUsuario INT NOT NULL,
  codigo VARCHAR(6) NOT NULL,
  fechaGeneracion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fechaExpiracion DATETIME NOT NULL,
  intentos INT DEFAULT 0,
  verificado BOOLEAN DEFAULT FALSE,
  ipGeneracion VARCHAR(45) NULL,
  
  PRIMARY KEY (idVerificacion),
  KEY idx_codigo (codigo),
  KEY idx_usuario_activo (idUsuario, verificado),
  KEY idx_expiracion (fechaExpiracion),
  
  CONSTRAINT fk_verificacion_usuario 
    FOREIGN KEY (idUsuario) 
    REFERENCES usuario (idUsuario) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE
);

-- ============================================
-- Agregar campo emailVerificado a usuario
-- ============================================
ADD KEY idx_usuario_verificado (emailVerificado);

-- ============================================
-- Procedimiento: Limpiar códigos expirados
-- ============================================
DELIMITER $$
DROP PROCEDURE IF EXISTS sp_limpiar_codigos_expirados$$
CREATE PROCEDURE sp_limpiar_codigos_expirados()
BEGIN
  -- Eliminar códigos expirados hace más de 24 horas
  DELETE FROM verificacion_email 
  WHERE fechaExpiracion < DATE_SUB(NOW(), INTERVAL 24 HOUR);
  
  SELECT ROW_COUNT() as codigosEliminados;
END$$
DELIMITER ;

-- ============================================
-- Evento programado: Limpieza automática
-- ============================================
DROP EVENT IF EXISTS evt_limpiar_codigos_expirados;
CREATE EVENT evt_limpiar_codigos_expirados
ON SCHEDULE EVERY 1 HOUR
DO
  CALL sp_limpiar_codigos_expirados();

-- ============================================
-- Vista: Usuarios pendientes de verificación
-- ============================================
CREATE OR REPLACE VIEW v_usuarios_sin_verificar AS
SELECT 
  u.idUsuario,
  u.nombre,
  u.email,
  u.fechaRegistro,
  TIMESTAMPDIFF(HOUR, u.fechaRegistro, NOW()) as horasSinVerificar,
  ve.codigo,
  ve.fechaExpiracion,
  ve.intentos,
  CASE 
    WHEN ve.fechaExpiracion < NOW() THEN 'EXPIRADO'
    WHEN ve.intentos >= 3 THEN 'BLOQUEADO'
    ELSE 'ACTIVO'
  END as estadoCodigo
FROM usuario u
LEFT JOIN verificacion_email ve ON u.idUsuario = ve.idUsuario 
  AND ve.verificado = FALSE
WHERE u.emailVerificado = FALSE
ORDER BY u.fechaRegistro DESC;    