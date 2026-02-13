import React, { useEffect, useMemo, useState } from 'react';
import {
  Sparkles,
  Mail,
  User as UserIcon,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  Plus
} from 'lucide-react';
import { User } from '../types';

interface Props {
  onSelectUser: (user: User) => void;
}

type Mode = 'login' | 'register';

const PRIMARY_USERS_KEY = 'f360_users_list';
const LEGACY_USERS_KEYS = ['f360_users_list', 'f360_users', 'users'];

const safeParse = <T,>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const normalizeEmail = (email?: string | null): string => {
  const raw = String(email || '').trim().toLowerCase();
  if (!raw || !raw.includes('@')) return '';

  const [localPart, domain] = raw.split('@');
  if (!localPart || !domain) return raw;

  // Canonicalización Gmail (evita duplicados tipo nombre.apellido+tag@gmail.com)
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    const localNoPlus = localPart.split('+')[0];
    const localNoDots = localNoPlus.replace(/\./g, '');
    return `${localNoDots}@gmail.com`;
  }

  return raw;
};

const readUsers = (): User[] => {
  for (const key of LEGACY_USERS_KEYS) {
    const parsed = safeParse<User[] | null>(localStorage.getItem(key), null);
    if (Array.isArray(parsed)) return parsed;
  }
  return [];
};

const saveUsers = (users: User[]) => {
  localStorage.setItem(PRIMARY_USERS_KEY, JSON.stringify(users));
};

export const Auth: React.FC<Props> = ({ onSelectUser }) => {
  const [mode, setMode] = useState<Mode>('login');
  const [users, setUsers] = useState<User[]>([]);

  // Login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Registro
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Estado UI
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setUsers(readUsers());
  }, []);

  const usersCount = useMemo(() => users.length, [users]);

  const clearError = () => setError('');

  const resetRegisterForm = () => {
    setNewName('');
    setNewEmail('');
    setNewPassword('');
    setConfirmPassword('');
    setShowNewPassword(false);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    const email = normalizeEmail(loginEmail);

    if (!email || !email.includes('@')) {
      setError('Ingresa un correo válido.');
      return;
    }

    if (!loginPassword) {
      setError('Ingresa tu contraseña.');
      return;
    }

    setBusy(true);
    try {
      const userFound = users.find(
        (u) => normalizeEmail((u as any).email) === email
      );

      if (!userFound) {
        setError('No existe un perfil con ese correo. Crea uno nuevo.');
        return;
      }

      if ((userFound as any).password !== loginPassword) {
        setError('Contraseña incorrecta.');
        return;
      }

      // Mantener sesión activa
      localStorage.setItem('f360_user', JSON.stringify(userFound));
      onSelectUser(userFound);
    } finally {
      setBusy(false);
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    const name = newName.trim();
    const email = normalizeEmail(newEmail);
    const password = newPassword;

    if (!name) {
      setError('Ingresa tu nombre completo.');
      return;
    }

    if (!email || !email.includes('@')) {
      setError('Ingresa un correo válido.');
      return;
    }

    if (!password || password.length < 4) {
      setError('La contraseña debe tener al menos 4 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    const exists = users.some((u) => normalizeEmail((u as any).email) === email);
    if (exists) {
      setError('Ya existe un usuario con ese correo. Inicia sesión.');
      setMode('login');
      return;
    }

    setBusy(true);
    try {
      const newUser: User = {
        id: crypto.randomUUID(),
        name,
        email,
        password
      } as User;

      const updatedUsers = [...users, newUser];
      setUsers(updatedUsers);
      saveUsers(updatedUsers);

      // Dejar sesión iniciada automáticamente
      localStorage.setItem('f360_user', JSON.stringify(newUser));
      resetRegisterForm();
      onSelectUser(newUser);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-[1.5rem] shadow-2xl shadow-blue-200 text-white mb-6">
            <Sparkles size={32} />
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">Finanza360</h1>
          <p className="text-slate-500 font-medium italic">Acceso Seguro Multiusuario</p>
        </div>

        <div className="bg-white rounded-[3rem] p-8 shadow-xl border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Tabs */}
          <div className="mb-8 flex justify-center">
            <div className="inline-flex bg-slate-100 rounded-2xl p-1">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  clearError();
                }}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition ${
                  mode === 'login'
                    ? 'bg-slate-900 text-white shadow'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Iniciar sesión
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  clearError();
                }}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition ${
                  mode === 'register'
                    ? 'bg-slate-900 text-white shadow'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Crear usuario
              </button>
            </div>
          </div>

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <Mail size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => {
                      setLoginEmail(e.target.value);
                      clearError();
                    }}
                    placeholder="tucorreo@gmail.com"
                    className="w-full pl-14 pr-6 py-4 rounded-2xl bg-slate-50 border-none outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-900"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => {
                      setLoginPassword(e.target.value);
                      clearError();
                    }}
                    placeholder="••••••••"
                    className="w-full pl-14 pr-14 py-4 rounded-2xl bg-slate-50 border-none outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-900"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
                  >
                    {showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="flex items-center gap-2 text-rose-500 font-bold text-[10px] uppercase tracking-widest justify-center">
                  <AlertCircle size={14} /> {error}
                </p>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 disabled:opacity-60"
              >
                <span className="inline-flex items-center gap-2">
                  <ArrowRight size={16} />
                  {busy ? 'Ingresando...' : 'Ingresar'}
                </span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleCreate} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4">
                  Nombre Completo
                </label>
                <div className="relative">
                  <UserIcon size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input
                    autoFocus
                    type="text"
                    value={newName}
                    onChange={(e) => {
                      setNewName(e.target.value);
                      clearError();
                    }}
                    placeholder="Ej. Juan Pérez"
                    className="w-full pl-14 pr-6 py-4 rounded-2xl bg-slate-50 border-none outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-900"
                    required
                    autoComplete="name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <Mail size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => {
                      setNewEmail(e.target.value);
                      clearError();
                    }}
                    placeholder="juan@ejemplo.com"
                    className="w-full pl-14 pr-6 py-4 rounded-2xl bg-slate-50 border-none outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-900"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      clearError();
                    }}
                    placeholder="Mínimo 4 caracteres"
                    className="w-full pl-14 pr-14 py-4 rounded-2xl bg-slate-50 border-none outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-900"
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4">
                  Confirmar Contraseña
                </label>
                <div className="relative">
                  <Lock size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      clearError();
                    }}
                    placeholder="Repite tu contraseña"
                    className="w-full pl-14 pr-6 py-4 rounded-2xl bg-slate-50 border-none outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-900"
                    required
                    autoComplete="new-password"
                  />
                </div>
              </div>

              {error && (
                <p className="flex items-center gap-2 text-rose-500 font-bold text-[10px] uppercase tracking-widest justify-center">
                  <AlertCircle size={14} /> {error}
                </p>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 disabled:opacity-60"
              >
                <span className="inline-flex items-center gap-2">
                  <Plus size={16} />
                  {busy ? 'Creando...' : 'Crear Perfil'}
                </span>
              </button>
            </form>
          )}
        </div>

        <p className="mt-8 text-center text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">
          Tus datos se almacenan localmente en este dispositivo.
        </p>

        <p className="mt-2 text-center text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em]">
          Usuarios registrados: {usersCount}
        </p>
      </div>
    </div>
  );
};
