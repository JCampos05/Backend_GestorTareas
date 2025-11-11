// src/utils/compartir.utils.js
const crypto = require('crypto');

/**
 * Genera una clave alfanumérica de 8 caracteres para compartir
 * @returns {string}
 */
function generarClaveCompartir() {
    const caracteres = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Sin O, 0, I, 1 para evitar confusión
    let clave = '';
    for (let i = 0; i < 8; i++) {
        clave += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }
    return clave;
}

/**
 * Valida el formato de una clave de compartir
 * @param {string} clave 
 * @returns {boolean}
 */
function validarClaveCompartir(clave) {
    return /^[A-Z0-9]{8}$/.test(clave);
}

/**
 * Genera un token único para invitaciones
 * @returns {string}
 */
function generarTokenInvitacion() {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Valida si un rol es válido
 * @param {string} rol 
 * @returns {boolean}
 */
function esRolValido(rol) {
    const rolesValidos = ['admin', 'colaborador', 'lector'];
    return rolesValidos.includes(rol);
}

/**
 * Calcula fecha de expiración
 * @param {number} dias - Días hasta la expiración
 * @returns {Date}
 */
function calcularFechaExpiracion(dias = 7) {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + dias);
    return fecha;
}

/**
 * Normaliza un email (minúsculas y trim)
 * @param {string} email 
 * @returns {string}
 */
function normalizarEmail(email) {
    return email.toLowerCase().trim();
}

module.exports = {
    generarClaveCompartir,
    validarClaveCompartir,
    generarTokenInvitacion,
    esRolValido,
    calcularFechaExpiracion,
    normalizarEmail
};