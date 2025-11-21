-- CREATE DATABASE Tasker;
USE tasker;


CREATE TABLE usuario (
  idUsuario INT NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL,
  bio TEXT NULL,
  telefono VARCHAR(20) NULL,
  ubicacion VARCHAR(100) NULL,
  cargo VARCHAR(100) NULL,
  redes_sociales JSON NULL,
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
  recordatorio DATETIME DEFAULT NULL,
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