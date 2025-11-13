-- ============================================
-- SCRIPT DE ACTUALIZACIÓN - CATEGORÍAS Y LISTAS COMPARTIDAS
-- ============================================

USE PryTest;

-- 1. MODIFICAR TABLA CATEGORIA
ALTER TABLE `categoria` 
ADD COLUMN `compartible` BOOLEAN DEFAULT TRUE,
ADD COLUMN `tipoPrivacidad` ENUM('privada','compartida') DEFAULT 'privada',
ADD COLUMN `claveCompartir` VARCHAR(12) UNIQUE DEFAULT NULL,
ADD COLUMN `fechaActualizacion` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- 2. MODIFICAR TABLA LISTA
ALTER TABLE `lista` 
ADD COLUMN `compartible` BOOLEAN DEFAULT TRUE,
ADD COLUMN `claveCompartir` VARCHAR(12) UNIQUE DEFAULT NULL,
ADD COLUMN `fechaActualizacion` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- 3. TABLA DE USUARIOS COMPARTIDOS EN CATEGORÍA
CREATE TABLE `categoria_compartida` (
  `idCategoriaCompartida` INT NOT NULL AUTO_INCREMENT,
  `idCategoria` INT NOT NULL,
  `idUsuario` INT NOT NULL, -- Usuario con quien se comparte
  `rol` ENUM('admin','editor','colaborador','visor') NOT NULL DEFAULT 'visor',
  `esCreador` BOOLEAN DEFAULT FALSE, -- TRUE para el creador original
  `fechaCompartido` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `compartidoPor` INT NOT NULL, -- Usuario que compartió
  `aceptado` BOOLEAN DEFAULT FALSE, -- Si el usuario aceptó la invitación
  `activo` BOOLEAN DEFAULT TRUE,
  PRIMARY KEY (`idCategoriaCompartida`),
  UNIQUE KEY `unique_categoria_usuario` (`idCategoria`, `idUsuario`),
  KEY `idx_categoria` (`idCategoria`),
  KEY `idx_usuario` (`idUsuario`),
  FOREIGN KEY (`idCategoria`) REFERENCES `categoria` (`idCategoria`) ON DELETE CASCADE,
  FOREIGN KEY (`idUsuario`) REFERENCES `usuario` (`idUsuario`) ON DELETE CASCADE,
  FOREIGN KEY (`compartidoPor`) REFERENCES `usuario` (`idUsuario`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. TABLA DE USUARIOS COMPARTIDOS EN LISTA
CREATE TABLE `lista_compartida` (
  `idListaCompartida` INT NOT NULL AUTO_INCREMENT,
  `idLista` INT NOT NULL,
  `idUsuario` INT NOT NULL,
  `rol` ENUM('admin','editor','colaborador','visor') NOT NULL DEFAULT 'visor',
  `esCreador` BOOLEAN DEFAULT FALSE,
  `fechaCompartido` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `compartidoPor` INT NOT NULL,
  `aceptado` BOOLEAN DEFAULT FALSE,
  `activo` BOOLEAN DEFAULT TRUE,
  PRIMARY KEY (`idListaCompartida`),
  UNIQUE KEY `unique_lista_usuario` (`idLista`, `idUsuario`),
  KEY `idx_lista` (`idLista`),
  KEY `idx_usuario` (`idUsuario`),
  FOREIGN KEY (`idLista`) REFERENCES `lista` (`idLista`) ON DELETE CASCADE,
  FOREIGN KEY (`idUsuario`) REFERENCES `usuario` (`idUsuario`) ON DELETE CASCADE,
  FOREIGN KEY (`compartidoPor`) REFERENCES `usuario` (`idUsuario`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. TABLA DE INVITACIONES PENDIENTES
CREATE TABLE `invitacion` (
  `idInvitacion` INT NOT NULL AUTO_INCREMENT,
  `tipo` ENUM('categoria','lista') NOT NULL,
  `idEntidad` INT NOT NULL, -- id de categoria o lista
  `emailInvitado` VARCHAR(100) NOT NULL,
  `rol` ENUM('admin','editor','colaborador','visor') NOT NULL DEFAULT 'visor',
  `token` VARCHAR(255) UNIQUE NOT NULL, -- Token único para aceptar
  `invitadoPor` INT NOT NULL,
  `fechaInvitacion` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `fechaExpiracion` TIMESTAMP NULL,
  `aceptada` BOOLEAN DEFAULT FALSE,
  `activa` BOOLEAN DEFAULT TRUE,
  PRIMARY KEY (`idInvitacion`),
  KEY `idx_email` (`emailInvitado`),
  KEY `idx_token` (`token`),
  FOREIGN KEY (`invitadoPor`) REFERENCES `usuario` (`idUsuario`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. TABLA DE AUDITORÍA (opcional pero recomendado)
CREATE TABLE `auditoria_compartidos` (
  `idAuditoria` INT NOT NULL AUTO_INCREMENT,
  `tipo` ENUM('categoria','lista') NOT NULL,
  `idEntidad` INT NOT NULL,
  `idUsuario` INT NOT NULL,
  `accion` VARCHAR(100) NOT NULL, -- 'compartir', 'modificar_rol', 'revocar', 'aceptar'
  `detalles` JSON,
  `fecha` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`idAuditoria`),
  KEY `idx_entidad` (`tipo`, `idEntidad`),
  KEY `idx_usuario` (`idUsuario`),
  KEY `idx_fecha` (`fecha`),
  FOREIGN KEY (`idUsuario`) REFERENCES `usuario` (`idUsuario`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- ÍNDICES PARA OPTIMIZACIÓN DE CONSULTAS
-- ============================================

-- Búsqueda rápida por clave de compartir
CREATE INDEX idx_categoria_clave ON categoria(claveCompartir);
CREATE INDEX idx_lista_clave ON lista(claveCompartir);

-- Consultas de categorías/listas activas por usuario
CREATE INDEX idx_categoria_compartida_activo ON categoria_compartida(activo, idCategoria);
CREATE INDEX idx_lista_compartida_activo ON lista_compartida(activo, idLista);

-- Búsqueda de invitaciones pendientes
CREATE INDEX idx_invitacion_activa ON invitacion(activa, aceptada);

-- Consultas combinadas comunes
CREATE INDEX idx_categoria_usuario_activo ON categoria_compartida(idUsuario, activo, aceptado);
CREATE INDEX idx_lista_usuario_activo ON lista_compartida(idUsuario, activo, aceptado);

-- ============================================
-- COMENTARIOS INFORMATIVOS
-- ============================================

-- ROL: admin = Control total (crear, editar, eliminar, compartir)
-- ROL: editor = Puede crear, editar, eliminar listas y tareas
-- ROL: colaborador = Puede crear y editar tareas, crear listas
-- ROL: visor = Solo lectura

-- EJEMPLO DE FLUJO:
-- 1. Usuario crea categoría -> Se crea registro en categoria_compartida con esCreador=TRUE, rol=admin
-- 2. Usuario genera clave compartir -> Se actualiza categoria.claveCompartir
-- 3. Otro usuario usa la clave -> Se crea registro en categoria_compartida con rol asignado
-- 4. Usuario invita por email -> Se crea registro en invitacion con token único
-- 5. Invitado acepta -> Se actualiza invitacion.aceptada y se crea en categoria_compartida


-- Crear tabla de notificaciones
CREATE TABLE notificaciones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario INT NOT NULL,
  tipo ENUM('invitacion_lista', 'tarea_asignada', 'comentario', 'otro') NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  mensaje TEXT NOT NULL,
  datos_adicionales JSON DEFAULT NULL,
  leida BOOLEAN DEFAULT FALSE,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT notificaciones_ibfk_1 
    FOREIGN KEY (id_usuario) 
    REFERENCES usuario(idUsuario) 
    ON DELETE CASCADE,
  INDEX idx_usuario_leida (id_usuario, leida),
  INDEX idx_fecha (fecha_creacion)
) ;
