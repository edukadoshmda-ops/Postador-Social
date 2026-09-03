import React, { useState } from 'react';
import { LogIn, UserPlus, ShieldCheck, Activity } from 'lucide-react';
import { api } from '../core/apiService';

interface Props {
  onAuthed: (user: any, token: string) => void;
}

export default function LoginPage({ onAuthed }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password || (mode === 'register' && !name)) {
      setError('Preencha todos os campos obrigatórios');
      return;
    }
    setLoading(true);
    try {
      const url = mode === 'login' ? '/auth/login' : '/auth/register';
      const body = mode === 'login' ? { email, password } : { name, email, password };
      const res = await api.post(url, body);
      const data = res.data.data;
      const token = data.token;
      localStorage.setItem('pulso_token', token);
      localStorage.setItem('pulso_user', JSON.stringify({ id: data.id, name: data.name, email: data.email }));
      onAuthed({ id: data.id, name: data.name, email: data.email }, token);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Falha no login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-[#090d16] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#0f172a] border border-[#1e293b] rounded-2xl p-6 shadow-2xl space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center border border-indigo-400/30">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-white text-base">Pulso Social — Login</h1>
            <p className="text-xs text-slate-400">Acesse com sua conta para usar o painel PRO</p>
          </div>
        </div>

        <div className="flex gap-2 p-1 bg-[#131c31] border border-[#1e293b] rounded-xl">
          <button type="button" onClick={() => setMode('login')} className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 ${mode === 'login' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>
            <LogIn className="w-4 h-4" /> Entrar
          </button>
          <button type="button" onClick={() => setMode('register')} className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 ${mode === 'register' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>
            <UserPlus className="w-4 h-4" /> Cadastrar
          </button>
        </div>

        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-start gap-2 text-xs text-blue-300">
          <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Primeiro acesso? Use <b>Cadastrar</b>. Se já tem conta, use <b>Entrar</b>. Login padrão de teste: <b>admin@pulso.local / admin123</b></span>
        </div>

        {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-300">{error}</div>}

        <form onSubmit={submit} className="space-y-3">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Nome</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" className="w-full px-3.5 py-2.5 bg-[#131c31] border border-[#1e293b] rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500" required />
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">E-mail</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" className="w-full px-3.5 py-2.5 bg-[#131c31] border border-[#1e293b] rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500" required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Senha</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••" className="w-full px-3.5 py-2.5 bg-[#131c31] border border-[#1e293b] rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500" required />
          </div>
          <button type="submit" disabled={loading} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg disabled:opacity-60">
            {loading ? 'Processando...' : mode === 'login' ? 'Entrar no Painel' : 'Criar conta e entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
