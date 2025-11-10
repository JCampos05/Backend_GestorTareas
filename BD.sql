-- CREATE DATABASE PryTest;
-- CREATE DATABASE PryTest;
USE PryTest;

CREATE TABLE `usuario` (
  `idUsuario` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `fechaRegistro` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`idUsuario`),
  UNIQUE KEY `email` (`email`)
);

CREATE TABLE `categoria` (
  `idCategoria` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `idUsuario` int DEFAULT NULL,
  PRIMARY KEY (`idCategoria`),
  KEY `idUsuario` (`idUsuario`),
  CONSTRAINT `categoria_ibfk_1` FOREIGN KEY (`idUsuario`) REFERENCES `usuario` (`idUsuario`) ON DELETE CASCADE
);

CREATE TABLE `lista` (
  `idLista` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `color` varchar(7) DEFAULT NULL,
  `icono` varchar(50) DEFAULT NULL,
  importante BOOLEAN DEFAULT FALSE,
  `idCategoria` int DEFAULT NULL,
  `fechaCreacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `idUsuario` int DEFAULT NULL,
  PRIMARY KEY (`idLista`),
  KEY `idCategoria` (`idCategoria`),
  KEY `idUsuario` (`idUsuario`),
  CONSTRAINT `lista_ibfk_1` FOREIGN KEY (`idCategoria`) REFERENCES `categoria` (`idCategoria`) ON DELETE SET NULL,
  CONSTRAINT `lista_ibfk_2` FOREIGN KEY (`idUsuario`) REFERENCES `usuario` (`idUsuario`) ON DELETE CASCADE
);

CREATE TABLE `tarea` (
  `idTarea` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(50) NOT NULL,
  `descripcion` text,
  `prioridad` enum('A','N','B') DEFAULT NULL,
  `estado` enum('C','P','N') DEFAULT NULL,
  `fechaCreacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `fechaVencimiento` date DEFAULT NULL,
  miDia BOOLEAN DEFAULT FALSE,
  `pasos` json DEFAULT NULL,
  `notas` text,
  `recordatorio` datetime DEFAULT NULL,
  `repetir` tinyint(1) DEFAULT '0',
  `tipoRepeticion` enum('diario','laborales','semanal','mensual','personalizado') DEFAULT NULL,
  `configRepeticion` json DEFAULT NULL,
  `idLista` int DEFAULT NULL,
  `idUsuario` int DEFAULT NULL,
  PRIMARY KEY (`idTarea`),
  KEY `idLista` (`idLista`),
  KEY `idUsuario` (`idUsuario`),
  CONSTRAINT `tarea_ibfk_1` FOREIGN KEY (`idLista`) REFERENCES `lista` (`idLista`) ON DELETE SET NULL,
  CONSTRAINT `tarea_ibfk_2` FOREIGN KEY (`idUsuario`) REFERENCES `usuario` (`idUsuario`) ON DELETE CASCADE
);

INSERT INTO `usuario` VALUES 
(1,'Test','test1@gmail.com','$2b$10$lF8SUX/sJwmgQThhi8qBdOWrkGrGmquyBwdMbAi986JCx7JhGJ3c6','2025-11-04 01:30:16'),
(2,'test2','test2@gmail.com','$2b$10$rNwMSm5AVEa.LavdFDZH1e66knNrB5YgS2JXea95ri7VVbSKgaEsm','2025-11-04 01:32:05'),
(3,'Pito Pérez','pito.cys@gmail.com','$2b$10$WvKIexXgR8UyRDr8EzWkQeGungpyvPeBsRkx7n0Qqx/UhcU5WVJzq','2025-11-04 05:57:59');