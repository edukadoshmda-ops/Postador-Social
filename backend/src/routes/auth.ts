import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../core/db';
import { sendSuccess, sendError } from '../core/responseHandler';

export const authRouter = Router();

function getStore(): any {
  return (db as any).getStore ? (db as any).getStore() : (db as any).store;
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(':');
    if (!salt || !hash) return false;
    const derived = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(derived, 'hex'));
  } catch {
    return false;
  }
}

function ensureUsersArray() {
  const store = getStore();
  if (!Array.isArray(store.users)) store.users = [];
  return store.users;
}

// GET /api/auth/me — valida token
authRouter.get('/me', (req: Request, res: Response) => {
  try {
    const auth = String(req.headers.authorization || '');
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return sendError(res, 'Não autenticado', 401);
    const users: any[] = ensureUsersArray();
    const user = users.find((u) => u.token === token);
    if (!user) return sendError(res, 'Sessão expirada — faça login novamente', 401);
    return sendSuccess(res, { id: user.id, name: user.name, email: user.email, created_at: user.created_at });
  } catch (e: any) {
    return sendError(res, e.message);
  }
});

// POST /api/auth/register
authRouter.post('/register', (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body as { name?: string; email?: string; password?: string };
    if (!name || !email || !password) return sendError(res, 'Nome, e-mail e senha são obrigatórios', 400);
    if (String(password).length < 6) return sendError(res, 'Senha deve ter pelo menos 6 caracteres', 400);
    const normEmail = String(email).trim().toLowerCase();
    const users: any[] = ensureUsersArray();
    if (users.find((u) => String(u.email).toLowerCase() === normEmail)) {
      return sendError(res, 'Este e-mail já está cadastrado', 400);
    }
    const id = 'user_' + Date.now();
    const token = crypto.randomBytes(32).toString('hex');
    const user = {
      id,
      name: String(name).trim(),
      email: normEmail,
      password_hash: hashPassword(String(password)),
      token,
      created_at: new Date().toISOString(),
    };
    users.push(user);
    (db as any).save?.();
    return sendSuccess(res, { id: user.id, name: user.name, email: user.email, token }, 'Conta criada com sucesso — bem-vindo!', 201);
  } catch (e: any) {
    return sendError(res, e.message);
  }
});

// POST /api/auth/login
authRouter.post('/login', (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) return sendError(res, 'Informe e-mail e senha', 400);
    const normEmail = String(email).trim().toLowerCase();
    const users: any[] = ensureUsersArray();
    // seed automático: se não houver nenhum usuário, cria admin padrão admin@pulso.local / admin123
    if (users.length === 0) {
      const id = 'user_' + Date.now();
      const token = crypto.randomBytes(32).toString('hex');
      users.push({
        id,
        name: 'Administrador',
        email: 'admin@pulso.local',
        password_hash: hashPassword('admin123'),
        token,
        created_at: new Date().toISOString(),
      });
      (db as any).save?.();
    }
    const user = users.find((u) => String(u.email).toLowerCase() === normEmail);
    if (!user) return sendError(res, 'E-mail ou senha incorretos', 401);
    if (!verifyPassword(String(password), user.password_hash)) {
      return sendError(res, 'E-mail ou senha incorretos', 401);
    }
    // renova token
    user.token = crypto.randomBytes(32).toString('hex');
    (db as any).save?.();
    return sendSuccess(res, { id: user.id, name: user.name, email: user.email, token: user.token }, 'Login realizado com sucesso');
  } catch (e: any) {
    return sendError(res, e.message);
  }
});

// POST /api/auth/logout
authRouter.post('/logout', (req: Request, res: Response) => {
  try {
    const auth = String(req.headers.authorization || '');
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (token) {
      const users: any[] = ensureUsersArray();
      const u = users.find((x) => x.token === token);
      if (u) {
        u.token = null;
        (db as any).save?.();
      }
    }
    return sendSuccess(res, { ok: true }, 'Sessão encerrada');
  } catch (e: any) {
    return sendError(res, e.message);
  }
});
