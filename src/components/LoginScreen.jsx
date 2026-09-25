import { useState } from 'react';
import { Bus, Eye, EyeOff } from 'lucide-react';
import { api } from '../lib/api';
import { getRememberedUsername, saveAuth } from '../lib/auth';
import InstallPrompt from './InstallPrompt';

export default function LoginScreen({ onLoggedIn }) {
  const remembered = getRememberedUsername();
  const [username, setUsername] = useState(remembered);
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    const { data, error: loginError } = await api.login({ username, password, remember });
    setBusy(false);
    if (loginError || !data?.token) {
      setError(loginError?.message || 'Usuário ou senha inválidos.');
      return;
    }
    saveAuth(data, remember);
    onLoggedIn(data);
  };

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-card__brand">
          <Bus size={28} aria-hidden />
          <div>
            <strong>Excursões</strong>
            <span>Administração</span>
          </div>
        </div>
        <h1>Entrar</h1>
        {error && (
          <p className="login-card__error" role="alert">
            {error}
          </p>
        )}
        <label className="form-group">
          <span className="form-label">Usuário</span>
          <input
            className="form-input"
            name="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            autoFocus
          />
        </label>
        <label className="form-group">
          <span className="form-label">Senha</span>
          <div className="password-field">
            <input
              className="form-input"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
            />
            <button
              type="button"
              className="password-field__toggle"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? 'Ocultar senha' : 'Ver senha'}
              title={showPassword ? 'Ocultar senha' : 'Ver senha'}
            >
              {showPassword ? <EyeOff size={20} aria-hidden /> : <Eye size={20} aria-hidden />}
            </button>
          </div>
        </label>
        <label className="login-remember">
          <input
            type="checkbox"
            checked={remember}
            onChange={(event) => setRemember(event.target.checked)}
          />
          Lembrar neste computador
        </label>
        <button type="submit" className="btn btn-primary login-card__submit" disabled={busy}>
          {busy ? 'Entrando…' : 'Entrar'}
        </button>
        <InstallPrompt />
      </form>
    </div>
  );
}
