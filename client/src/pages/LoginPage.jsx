import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

const DEFAULT_URL =
  'https://script.google.com/macros/s/AKfycbxddAk2eDL8Haxo92VOAAsObzoQ3vSUYMQv5yGv9v7lZz0Obl6vc7bLK0GwZ5uM6zemeA/exec';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [scriptUrl, setScriptUrl] = useState(
    localStorage.getItem('apps_script_url') || import.meta.env.VITE_APPS_SCRIPT_URL || DEFAULT_URL
  );
  const [showConfig, setShowConfig] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (scriptUrl) {
      localStorage.setItem('apps_script_url', scriptUrl.trim());
    }

    try {
      const data = await api.login(username, password);
      login(data.token);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Login failed');
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>Syam Incubators</h1>
        <p className="login-subtitle">Egg Incubation Management</p>
        <form onSubmit={handleSubmit}>
          {error && <div className="error-msg">{error}</div>}

          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="Enter password"
              required
            />
          </div>

          <div style={{ marginTop: 12, marginBottom: 16 }}>
            <button
              type="button"
              className="btn"
              style={{
                fontSize: '0.8rem',
                padding: '4px 8px',
                background: 'transparent',
                border: '1px dashed #cbd5e1',
                color: '#64748b',
                width: '100%',
                cursor: 'pointer'
              }}
              onClick={() => setShowConfig(!showConfig)}
            >
              ⚙ {showConfig ? 'Hide' : 'Configure'} Google Apps Script URL
            </button>
          </div>

          {showConfig && (
            <div className="form-group" style={{ background: '#f1f5f9', padding: '10px', borderRadius: '6px' }}>
              <label htmlFor="scriptUrl" style={{ fontSize: '0.85rem' }}>
                Google Apps Script Web App URL
              </label>
              <input
                id="scriptUrl"
                type="url"
                value={scriptUrl}
                onChange={(e) => setScriptUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                style={{ fontSize: '0.85rem', marginTop: 4 }}
              />
              <p className="form-help" style={{ fontSize: '0.75rem', marginTop: 4, margin: 0 }}>
                Paste the URL copied after deploying your Apps Script as a Web App.
              </p>
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-full">
            Login
          </button>
        </form>
      </div>
    </div>
  );
}
