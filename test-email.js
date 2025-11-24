require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

async function testEmail() {
    try {
        console.log('🔍 Verificando conexión...');
        await transporter.verify();
        console.log('✅ Conexión exitosa con el servidor SMTP');

        console.log('📧 Enviando email de prueba...');
        const info = await transporter.sendMail({
            from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
            to: 'test.pry1528@gmail.com',
            subject: '🧪 Test de Email - Taskeer',
            text: 'Si recibes este email, la configuración funciona correctamente.',
            html: '<h1>✅ Email funcionando!</h1><p>Tu configuración de nodemailer está correcta.</p>'
        });

        console.log('✅ Email enviado:', info.messageId);
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

testEmail();