import React, { useEffect, useState } from 'react';
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

  // Canonicalización Gmail
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

const cloudUserKey = (email: string) => `auth:mail:${normalizeEmail(email)}`;

const sanitizeUserPayload = (raw: any): User | null => {
  if (!raw || typeof raw !== 'object') return null;
  const email = normalizeEmail(raw.email);
  if (!email) return null;

  return {
    id: String(raw.id || '').trim() || crypto.randomUUID(),
    name: String(raw.name || '').trim() || email.split('@')[0],
    email,
    password: typeof raw.password === 'string' ? raw.password : ''
  };
};

const loadCloudUser = async (email: string): Promise<User | null> => {
  const key = cloudUserKey(email);

  const resp = await fetch(`/api/state?userId=${encodeURIComponent(key)}`);
  const json = await resp.json().catch(() => null);

  if (!resp.ok || !json?.ok) return null;
  if (!json?.found || !json?.payload || typeof json.payload !== 'object') return null;

  return sanitizeUserPayload(json.payload);
};

const saveCloudUser = async (user: User): Promise<void> => {
  const email = normalizeEmail(user.email);
  const key = cloudUserKey(email);

  const payload: User = {
    id: String(user.id || '').trim() || crypto.randomUUID(),
    name: String(user.name || '').trim(),
    email,
    password: typeof user.password === 'string' ? user.password : ''
  };

  const resp = await fetch('/api/state', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: key,
      payload
    })
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err?.error || `No se pudo guardar usuario en nube (${resp.status})`);
  }
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

  const usersCount = users.length;

  const clearError = () => setError('');

  const resetRegisterForm = () => {
    setNewName('');
    setNewEmail('');
    setNewPassword('');
    setConfirmPassword('');
    setShowNewPassword(false);
  };

  const upsertLocalUser = (user: User) => {
    setUsers((prev) => {
      const email = normalizeEmail(user.email);
      const next = [
        { ...user, email },
        ...prev.filter((u) => normalizeEmail(u.email) !== email)
      ];
      saveUsers(next);
      return next;
    });
  };

  const persistSession = (user: User) => {
    localStorage.setItem('f360_user', JSON.stringify(user));
    onSelectUser(user);
  };

  const handleLogin = async (e: React.FormEvent) => {
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
      // 1) Intentar nube (cross-device)
      let cloudUser: User | null = null;
      try {
        cloudUser = await loadCloudUser(email);
      } catch {
        // silencioso: cae a local
      }

      if (cloudUser) {
        if ((cloudUser.password || '') !== loginPassword) {
          setError('Contraseña incorrecta.');
          return;
        }

        upsertLocalUser(cloudUser);
        persistSession(cloudUser);
        return;
      }

      // 2) Fallback local (usuario legado)
      const localUser = users.find((u) => normalizeEmail(u.email) === email);
      if (!localUser) {
        setError('No existe un perfil con ese correo. Crea uno nuevo.');
        return;
      }

      if ((localUser.password || '') !== loginPassword) {
        setError('Contraseña incorrecta.');
        return;
      }

      // Migración transparente a nube
      try {
        await saveCloudUser({
          ...localUser,
          email,
          password: localUser.password || loginPassword
        });
      } catch {
        // no bloquea login
      }

      persistSession(localUser);
    } finally {
      setBusy(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
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

    setBusy(true);
    try {
      // validar duplicado local
      const existsLocal = users.some((u) => normalizeEmail(u.email) === email);
      if (existsLocal) {
        setError('Ya existe un usuario con ese correo. Inicia sesión.');
        setMode('login');
        return;
      }

      // validar duplicado nube
      try {
        const existsCloud = await loadCloudUser(email);
        if (existsCloud) {
          setError('Ya existe un usuario con ese correo. Inicia sesión.');
          setMode('login');
          return;
        }
      } catch {
        // si falla la lectura de nube, igual intentamos crear
      }

      const newUser: User = {
        id: crypto.randomUUID(),
        name,
        email,
        password
      };

      // Guardar en nube (clave para cross-device)
      await saveCloudUser(newUser);

      // Guardar local + sesión
      upsertLocalUser(newUser);
      localStorage.setItem('f360_user', JSON.stringify(newUser));

      resetRegisterForm();
      onSelectUser(newUser);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el usuario.');
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
          Tus datos se almacenan localmente y se sincronizan en nube.
        </p>

        <p className="mt-2 text-center text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em]">
          Usuarios en este dispositivo: {usersCount}
        </p>
      </div>
    </div>
  );
};
