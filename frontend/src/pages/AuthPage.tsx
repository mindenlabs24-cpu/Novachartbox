import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function AuthPage() {
  const { login, register } = useAuth();
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({ username: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (tab === 'login') {
        await login(form.phone, form.password);
      } else {
        await register(form.username, form.phone, form.password);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Hitilafu imetokea. Jaribu tena.');
    } finally {
      setLoading(false);
    }
  };

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-logo">
          <div className="auth-logo-icon">💬</div>
          <h1>Novachart</h1>
          <p>Zungumza, Pigia Simu, Shiriki — Pamoja Daima</p>
        </div>

        <div className="auth-card">
          <div className="auth-tabs">
            <button
              id="tab-login"
              className={`auth-tab ${tab === 'login' ? 'active' : ''}`}
              onClick={() => { setTab('login'); setError(''); }}
            >
              Ingia
            </button>
            <button
              id="tab-register"
              className={`auth-tab ${tab === 'register' ? 'active' : ''}`}
              onClick={() => { setTab('register'); setError(''); }}
            >
              Jiandikishe
            </button>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {tab === 'register' && (
              <div className="form-group">
                <label htmlFor="input-username">Jina lako</label>
                <input
                  id="input-username"
                  className="form-input"
                  type="text"
                  placeholder="Andika jina lako..."
                  value={form.username}
                  onChange={set('username')}
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="input-phone">Namba ya Simu</label>
              <input
                id="input-phone"
                className="form-input"
                type="tel"
                placeholder="+255 7xx xxx xxx"
                value={form.phone}
                onChange={set('phone')}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="input-password">Nywila</label>
              <input
                id="input-password"
                className="form-input"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={set('password')}
                required
              />
            </div>

            {error && <div className="auth-error">⚠ {error}</div>}

            <button
              id="btn-submit-auth"
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? 'Tafadhali subiri...' : tab === 'login' ? 'Ingia Sasa →' : 'Fungua Akaunti →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
