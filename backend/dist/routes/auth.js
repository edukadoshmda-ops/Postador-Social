"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const crypto_1 = __importDefault(require("crypto"));
const db_1 = require("../core/db");
const responseHandler_1 = require("../core/responseHandler");
exports.authRouter = (0, express_1.Router)();
function getStore() {
    return db_1.db.getStore ? db_1.db.getStore() : db_1.db.store;
}
function hashPassword(password) {
    const salt = crypto_1.default.randomBytes(16).toString('hex');
    const hash = crypto_1.default.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
}
function verifyPassword(password, stored) {
    try {
        const [salt, hash] = stored.split(':');
        if (!salt || !hash)
            return false;
        const derived = crypto_1.default.scryptSync(password, salt, 64).toString('hex');
        return crypto_1.default.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(derived, 'hex'));
    }
    catch {
        return false;
    }
}
function ensureUsersArray() {
    const store = getStore();
    if (!Array.isArray(store.users))
        store.users = [];
    return store.users;
}
// GET /api/auth/me — valida token
exports.authRouter.get('/me', (req, res) => {
    try {
        const auth = String(req.headers.authorization || '');
        const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
        if (!token)
            return (0, responseHandler_1.sendError)(res, 'Não autenticado', 401);
        const users = ensureUsersArray();
        const user = users.find((u) => u.token === token);
        if (!user)
            return (0, responseHandler_1.sendError)(res, 'Sessão expirada — faça login novamente', 401);
        return (0, responseHandler_1.sendSuccess)(res, { id: user.id, name: user.name, email: user.email, created_at: user.created_at });
    }
    catch (e) {
        return (0, responseHandler_1.sendError)(res, e.message);
    }
});
// POST /api/auth/register
exports.authRouter.post('/register', (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password)
            return (0, responseHandler_1.sendError)(res, 'Nome, e-mail e senha são obrigatórios', 400);
        if (String(password).length < 6)
            return (0, responseHandler_1.sendError)(res, 'Senha deve ter pelo menos 6 caracteres', 400);
        const normEmail = String(email).trim().toLowerCase();
        const users = ensureUsersArray();
        if (users.find((u) => String(u.email).toLowerCase() === normEmail)) {
            return (0, responseHandler_1.sendError)(res, 'Este e-mail já está cadastrado', 400);
        }
        const id = 'user_' + Date.now();
        const token = crypto_1.default.randomBytes(32).toString('hex');
        const user = {
            id,
            name: String(name).trim(),
            email: normEmail,
            password_hash: hashPassword(String(password)),
            token,
            created_at: new Date().toISOString(),
        };
        users.push(user);
        db_1.db.save?.();
        return (0, responseHandler_1.sendSuccess)(res, { id: user.id, name: user.name, email: user.email, token }, 'Conta criada com sucesso — bem-vindo!', 201);
    }
    catch (e) {
        return (0, responseHandler_1.sendError)(res, e.message);
    }
});
// POST /api/auth/login
exports.authRouter.post('/login', (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password)
            return (0, responseHandler_1.sendError)(res, 'Informe e-mail e senha', 400);
        const normEmail = String(email).trim().toLowerCase();
        const users = ensureUsersArray();
        // seed automático: se não houver nenhum usuário, cria admin padrão admin@pulso.local / admin123
        if (users.length === 0) {
            const id = 'user_' + Date.now();
            const token = crypto_1.default.randomBytes(32).toString('hex');
            users.push({
                id,
                name: 'Administrador',
                email: 'admin@pulso.local',
                password_hash: hashPassword('admin123'),
                token,
                created_at: new Date().toISOString(),
            });
            db_1.db.save?.();
        }
        const user = users.find((u) => String(u.email).toLowerCase() === normEmail);
        if (!user)
            return (0, responseHandler_1.sendError)(res, 'E-mail ou senha incorretos', 401);
        if (!verifyPassword(String(password), user.password_hash)) {
            return (0, responseHandler_1.sendError)(res, 'E-mail ou senha incorretos', 401);
        }
        // renova token
        user.token = crypto_1.default.randomBytes(32).toString('hex');
        db_1.db.save?.();
        return (0, responseHandler_1.sendSuccess)(res, { id: user.id, name: user.name, email: user.email, token: user.token }, 'Login realizado com sucesso');
    }
    catch (e) {
        return (0, responseHandler_1.sendError)(res, e.message);
    }
});
// POST /api/auth/logout
exports.authRouter.post('/logout', (req, res) => {
    try {
        const auth = String(req.headers.authorization || '');
        const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
        if (token) {
            const users = ensureUsersArray();
            const u = users.find((x) => x.token === token);
            if (u) {
                u.token = null;
                db_1.db.save?.();
            }
        }
        return (0, responseHandler_1.sendSuccess)(res, { ok: true }, 'Sessão encerrada');
    }
    catch (e) {
        return (0, responseHandler_1.sendError)(res, e.message);
    }
});
