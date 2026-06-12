'use client';

import { chineseZodiac } from '@china-ru/shared';
import { Button } from '@china-ru/ui';
import { useState } from 'react';


import { Link, useRouter } from '@/i18n/navigation';
import { accountClient, authClient, ClientApiError } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';

import type { UserDto } from '@china-ru/shared';

type Save = 'idle' | 'saving' | 'saved' | 'error';

/**
 * Блок никнейма. Для верифицированного профиля — активный ввод; иначе серый
 * неактивный с подсказкой (ⓘ), что нужно пройти верификацию.
 */
function NicknameBlock({ user, onSaved }: { user: UserDto; onSaved: (u: UserDto) => void }) {
  const [value, setValue] = useState(user.nickname ?? '');
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle');
  const [error, setError] = useState('');

  const save = async (): Promise<void> => {
    setStatus('saving');
    setError('');
    try {
      onSaved(await accountClient.setNickname(value.trim()));
      setStatus('idle');
    } catch (e) {
      setStatus('error');
      setError(e instanceof ClientApiError ? e.message : 'Не удалось сохранить никнейм');
    }
  };

  return (
    <div className={`rounded-2xl border border-line bg-white p-6 ${user.verified ? '' : 'opacity-60'}`}>
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold text-ink">Никнейм</h2>
        {!user.verified && (
          <span
            className="flex h-5 w-5 cursor-help items-center justify-center rounded-full border border-line text-xs text-muted"
            title="Чтобы выбрать никнейм, профиль должен пройти верификацию («синяя галочка»). После подтверждения модератором поле станет активным."
          >
            i
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-muted">
        {user.verified
          ? 'Выберите никнейм — он заменит числовой ID в вашем профиле.'
          : 'Доступен после верификации профиля. Сейчас используется числовой ID.'}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-muted">@</span>
        <input
          value={value}
          disabled={!user.verified}
          onChange={e => {
            setValue(e.target.value);
          }}
          placeholder={user.verified ? 'my_nickname' : String(user.publicId)}
          className="h-10 w-48 rounded-lg border border-line px-3 outline-none focus:border-brand disabled:bg-surface"
        />
        <Button
          variant="outline"
          disabled={!user.verified || status === 'saving' || !value.trim()}
          onClick={() => {
            void save();
          }}
        >
          Сохранить
        </Button>
      </div>
      {error && <p className="mt-2 text-sm text-brand">{error}</p>}
    </div>
  );
}

const SUBNAV = [
  { key: 'payment-methods', label: 'Карты оплаты' },
  { key: 'addresses', label: 'Адрес доставки' },
] as const;

export default function ProfilePage() {
  const { user, setUser, logout } = useAuth();
  const router = useRouter();

  const [name, setName] = useState(user?.name ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [birthday, setBirthday] = useState(user?.birthday ?? '');
  const [status, setStatus] = useState<Save>('idle');

  const [curPass, setCurPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passStatus, setPassStatus] = useState<Save | 'mismatch'>('idle');

  const zodiac = chineseZodiac(birthday || user?.birthday);

  const saveProfile = async (): Promise<void> => {
    setStatus('saving');
    try {
      const updated = await accountClient.updateProfile({
        name: name.trim() || undefined,
        lastName: lastName.trim() || undefined,
        phone: phone.trim() || undefined,
        birthday: birthday || undefined,
      });
      setUser(updated);
      setStatus('saved');
    } catch {
      setStatus('error');
    }
  };

  const changePassword = async (): Promise<void> => {
    if (newPass !== confirmPass || newPass.length < 6) {
      setPassStatus('mismatch');
      return;
    }
    setPassStatus('saving');
    try {
      await authClient.changePassword({ currentPassword: curPass, newPassword: newPass });
      // Смена пароля рвёт сессию — выходим и отправляем на вход.
      await logout();
      router.replace('/login');
    } catch {
      setPassStatus('error');
    }
  };

  const initial = (user?.name ?? user?.email ?? '?').slice(0, 1).toUpperCase();

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-ink">
            Профиль
            {user?.verified && (
              <span
                className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-xs text-white"
                title="Профиль верифицирован"
              >
                ✓
              </span>
            )}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {user?.nickname ? (
              <span className="font-mono">@{user.nickname}</span>
            ) : (
              <>
                ID <span className="font-mono">{user?.publicId}</span>
              </>
            )}
          </p>
        </div>
        <div className="flex gap-2 text-sm">
          {SUBNAV.map(s => (
            <Link
              key={s.key}
              href={`/cabinet/profile/${s.key}`}
              className="rounded-lg border border-line px-3 py-1.5 text-muted hover:text-ink"
            >
              {s.label}
            </Link>
          ))}
        </div>
      </div>

      <form
        className="space-y-5 rounded-2xl border border-line bg-white p-6"
        onSubmit={e => {
          e.preventDefault();
          void saveProfile();
        }}
      >
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand/10 text-xl font-bold text-brand">
            {initial}
          </div>
          <div>
            <button
              type="button"
              className="rounded-lg border border-line px-3 py-1.5 text-sm text-ink hover:bg-surface"
            >
              Изменить фото
            </button>
            <p className="mt-1 text-xs text-muted">JPG, PNG или WebP, до 2 МБ.</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-sm font-medium text-ink">Имя</span>
            <input
              value={name}
              onChange={e => {
                setName(e.target.value);
              }}
              className="h-11 w-full rounded-lg border border-line px-3 outline-none focus:border-brand"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-ink">Фамилия</span>
            <input
              value={lastName}
              onChange={e => {
                setLastName(e.target.value);
              }}
              className="h-11 w-full rounded-lg border border-line px-3 outline-none focus:border-brand"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-ink">Дата рождения</span>
            <input
              type="date"
              value={birthday}
              onChange={e => {
                setBirthday(e.target.value);
              }}
              className="h-11 w-full rounded-lg border border-line px-3 outline-none focus:border-brand"
            />
            {zodiac && (
              <span className="text-xs text-muted">
                Знак: {zodiac.emoji} {zodiac.ru} · стихия {zodiac.element} —{' '}
                <Link href="/cabinet/horoscope" className="text-brand hover:underline">
                  гороскоп
                </Link>
              </span>
            )}
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-ink">Телефон</span>
            <input
              value={phone}
              onChange={e => {
                setPhone(e.target.value);
              }}
              className="h-11 w-full rounded-lg border border-line px-3 outline-none focus:border-brand"
            />
          </label>
          <label className="block space-y-1 sm:col-span-2">
            <span className="text-sm font-medium text-ink">Email</span>
            <input
              value={user?.email ?? ''}
              disabled
              className="h-11 w-full rounded-lg border border-line bg-surface px-3 text-muted"
            />
          </label>
        </div>

        {status === 'error' && <p className="text-sm text-brand">Не удалось сохранить</p>}
        {status === 'saved' && <p className="text-sm text-green-600">Данные сохранены</p>}
        <Button type="submit" disabled={status === 'saving'}>
          Сохранить
        </Button>
      </form>

      {user && <NicknameBlock user={user} onSaved={setUser} />}

      <form
        className="space-y-4 rounded-2xl border border-line bg-white p-6"
        onSubmit={e => {
          e.preventDefault();
          void changePassword();
        }}
      >
        <h2 className="text-lg font-semibold text-ink">Смена пароля</h2>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-ink">Текущий пароль</span>
          <input
            type="password"
            value={curPass}
            onChange={e => {
              setCurPass(e.target.value);
            }}
            className="h-11 w-full rounded-lg border border-line px-3 outline-none focus:border-brand"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-sm font-medium text-ink">Новый пароль</span>
            <input
              type="password"
              value={newPass}
              onChange={e => {
                setNewPass(e.target.value);
              }}
              className="h-11 w-full rounded-lg border border-line px-3 outline-none focus:border-brand"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-ink">Подтверждение</span>
            <input
              type="password"
              value={confirmPass}
              onChange={e => {
                setConfirmPass(e.target.value);
              }}
              className="h-11 w-full rounded-lg border border-line px-3 outline-none focus:border-brand"
            />
          </label>
        </div>
        {passStatus === 'mismatch' && (
          <p className="text-sm text-brand">Пароли не совпадают или короче 6 символов</p>
        )}
        {passStatus === 'error' && (
          <p className="text-sm text-brand">Не удалось сменить пароль — проверьте текущий</p>
        )}
        <p className="text-xs text-muted">После смены пароля потребуется войти заново.</p>
        <Button type="submit" variant="outline" disabled={passStatus === 'saving'}>
          Сменить пароль
        </Button>
      </form>
    </div>
  );
}
