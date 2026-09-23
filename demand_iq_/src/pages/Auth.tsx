import React, { useState } from 'react';
import './Auth.css';

interface AuthProps {
  onLoginSuccess: (token: string, user: any) => void;
}

export default function Auth({ onLoginSuccess }: AuthProps): JSX.Element {
  const [email, setEmail] = useState<string>('admin@demandiq.ai');
  const [password, setPassword] = useState<string>('admin123');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:8000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Login failed');
      }

      // Pass token and user info to parent
      onLoginSuccess(data.token, data.user);
    } catch (err: any) {
      setError(err.message || 'Server connection failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-glass-card">
        <div className="auth-brand">
          <div className="brand-logo">IQ</div>
          <h2>DemandIQ</h2>
        </div>
        
        <p className="auth-subtitle">AI-Powered Retail Command Center</p>

        {error && <div className="auth-error-alert">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-input-group">
            <label>Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="manager@retail.com"
            />
          </div>

          <div className="auth-input-group">
            <label>Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <button type="submit" className="btn-glow auth-btn" disabled={isLoading}>
            {isLoading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className="demo-credentials-box">
          <span className="demo-title">🔑 Demo Credentials:</span>
          <span><strong>Email:</strong> admin@demandiq.ai</span>
          <span><strong>Password:</strong> admin123</span>
        </div>
      </div>
    </div>
  );
}