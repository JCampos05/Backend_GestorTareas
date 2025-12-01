const transporter = require('../config/email.config');
const fs = require('fs').promises;
const path = require('path');
const { obtenerFrontendUrl } = require('../utils/urlHelper');

class EmailService {

  async cargarTemplate(nombreTemplate) {
    try {
      const templatePath = path.join(__dirname, '../template/email', nombreTemplate);
      //console.log('Buscando template en:', templatePath); 
      const html = await fs.readFile(templatePath, 'utf-8');
      return html;
    } catch (error) {
      //console.error(`Error al cargar template ${nombreTemplate}:`, error);
      throw new Error(`No se pudo cargar el template: ${nombreTemplate}`);
    }
  }

  reemplazarPlaceholders(html, datos) {
    let resultado = html;

    Object.keys(datos).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      resultado = resultado.replace(regex, datos[key]);
    });

    return resultado;
  }

  async enviarCodigoVerificacion(email, nombre, codigo) {
    try {
      let html = await this.cargarTemplate('verificacion.html');

      html = this.reemplazarPlaceholders(html, {
        NOMBRE: nombre,
        CODIGO: codigo,
        ANIO: new Date().getFullYear(),
        FRONTEND_URL: obtenerFrontendUrl()
      });

      const mailOptions = {
        from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
        to: email,
        subject: 'Verifica tu cuenta en Taskeer',
        html: html,
        text: `Hola ${nombre},\n\nTu código de verificación es: ${codigo}\n\nEste código expira en 15 minutos.\n\n¡Gracias por unirte a Taskeer!`
      };

      const info = await transporter.sendMail(mailOptions);
      //console.log('Email de verificación enviado:', info.messageId);
      //console.log('Destinatario:', email);

      return {
        success: true,
        messageId: info.messageId,
        destinatario: email
      };
    } catch (error) {
      //console.error('Error al enviar email de verificación:', error);
      throw new Error('No se pudo enviar el email de verificación');
    }
  }

  async enviarBienvenida(email, nombre) {
    try {
      let html = await this.cargarTemplate('bienvenida.html');

      html = this.reemplazarPlaceholders(html, {
        NOMBRE: nombre,
        EMAIL: email,
        ANIO: new Date().getFullYear(),
        FRONTEND_URL: obtenerFrontendUrl()
      });

      const mailOptions = {
        from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
        to: email,
        subject: '¡Bienvenido a Taskeer!',
        html: html,
        text: `¡Hola ${nombre}!\n\nTu cuenta ha sido verificada exitosamente.\n\n¡Bienvenido a Taskeer!`
      };

      const info = await transporter.sendMail(mailOptions);
      //console.log('Email de bienvenida enviado:', info.messageId);

      return { success: true, messageId: info.messageId };
    } catch (error) {
      //console.error('Error al enviar email de bienvenida:', error);
      return { success: false, error: error.message };
    }
  }

  async testConexion() {
    try {
      await transporter.verify();
      //console.log('Conexión con servidor de email exitosa');
      return { success: true, message: 'Servidor de email conectado' };
    } catch (error) {
      //console.error('Error al conectar con servidor de email:', error);
      return { success: false, error: error.message };
    }
  }

  async enviarCodigoCambioPassword(email, nombre, codigo) {
    try {
      let html = await this.cargarTemplate('cambio-password.html');

      html = this.reemplazarPlaceholders(html, {
        NOMBRE: nombre,
        CODIGO: codigo,
        ANIO: new Date().getFullYear(),
        FRONTEND_URL: obtenerFrontendUrl()
      });

      const mailOptions = {
        from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
        to: email,
        subject: 'Código para Cambio de Contraseña - Taskeer',
        html: html,
        text: `Hola ${nombre},\n\nTu código para cambiar la contraseña es: ${codigo}\n\nEste código expira en 15 minutos.\n\nSi no solicitaste este cambio, ignora este mensaje.`
      };

      const info = await transporter.sendMail(mailOptions);
      //console.log('Email de cambio de contraseña enviado:', info.messageId);
      //console.log('Destinatario:', email);

      return {
        success: true,
        messageId: info.messageId,
        destinatario: email
      };
    } catch (error) {
      //console.error('Error al enviar email de cambio de contraseña:', error);
      throw new Error('No se pudo enviar el email de cambio de contraseña');
    }
  }

  async enviarCodigoRecuperacionPassword(email, nombre, codigo) {
    try {
      let html = await this.cargarTemplate('recuperacion-password.html');

      html = this.reemplazarPlaceholders(html, {
        NOMBRE: nombre,
        CODIGO: codigo,
        ANIO: new Date().getFullYear(),
        FRONTEND_URL: obtenerFrontendUrl()
      });

      const mailOptions = {
        from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
        to: email,
        subject: 'Código de Recuperación de Contraseña - Taskeer',
        html: html,
        text: `Hola ${nombre},\n\nTu código de recuperación de contraseña es: ${codigo}\n\nEste código expira en 15 minutos.\n\nSi no solicitaste este cambio, ignora este mensaje.`
      };

      const info = await transporter.sendMail(mailOptions);
      //console.log('Email de recuperación enviado:', info.messageId);
      //console.log('Destinatario:', email);

      return {
        success: true,
        messageId: info.messageId,
        destinatario: email
      };
    } catch (error) {
      //console.error('Error al enviar email de recuperación:', error);
      throw new Error('No se pudo enviar el email de recuperación');
    }
  }
}

module.exports = new EmailService();