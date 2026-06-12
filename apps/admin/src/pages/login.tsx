import { Button } from '@china-ru/ui';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '@/lib/auth';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (): Promise<void> => {
    setLoading(true);
    setError('');
    try {
      const user = await login({ email, password });
      if (user.role !== 'admin') {
        setError('Доступ разрешён только администраторам');
        return;
      }
      void navigate('/');
    } catch {
      setError('Неверный email или пароль');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface">
      <form
        className="w-full max-w-sm space-y-4 rounded-2xl border border-line bg-white p-8 shadow-sm"
        onSubmit={e => {
          e.preventDefault();
          void submit();
        }}
      >
        <h1 className="text-xl font-bold text-ink">
          China<span className="text-brand">.ru</span> · вход в админку
        </h1>
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={e => {
            setEmail(e.target.value);
          }}
          className="h-11 w-full rounded-lg border border-line px-3 outline-none focus:border-brand"
        />
        <input
          type="password"
          required
          placeholder="Пароль"
          value={password}
          onChange={e => {
            setPassword(e.target.value);
          }}
          className="h-11 w-full rounded-lg border border-line px-3 outline-none focus:border-brand"
        />
        {error && <p className="text-sm text-brand">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          Войти
        </Button>
      </form>
    </div>
  );
}
