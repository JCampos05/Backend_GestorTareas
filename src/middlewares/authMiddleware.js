const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET || 'tu_clave_secreta_aqui';

const authMiddleware = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: 'No se proporcionó token de autenticación' });
        }

        const decoded = jwt.verify(token, SECRET_KEY);
        req.usuario = decoded;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expirado' });
        }
        return res.status(401).json({ error: 'Token inválido' });
    }
};

module.exports = authMiddleware;