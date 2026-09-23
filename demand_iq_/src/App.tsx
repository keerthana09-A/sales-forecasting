import React, { useState } from 'react';
import './App.css';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';

export default function App(): JSX.Element {
  const [token, setToken] = useState<string | null>(localStorage.getItem('demand_iq_token'));
  const [user, setUser] = useState<any>(
    JSON.parse(localStorage.getItem('demand_iq_user') || 'null')
  );
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'inventory'>('dashboard');

  const handleLoginSuccess = (authToken: string, userData: any) => {
    setToken(authToken);
    setUser(userData);
    localStorage.setItem('demand_iq_token', authToken);
    localStorage.setItem('demand_iq_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('demand_iq_token');
    localStorage.removeItem('demand_iq_user');
  };

  if (!token) {
    return <Auth onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="app-container">
      {/* Global Sidebar */}
      <aside className="app-sidebar">
        <div className="brand-header">
          <div className="brand-logo">IQ</div>
          <span className="brand-title">DemandIQ</span>
        </div>

        {/* Logged in User Badge */}
        {user && (
          <div style={{ marginBottom: '24px', padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#f8fafc' }}>{user.name}</div>
            <div style={{ fontSize: '11px', color: '#38bdf8' }}>{user.role}</div>
          </div>
        )}

        <nav className="side-nav">
          <button 
            className={`side-link ${currentPage === 'dashboard' ? 'active' : ''}`}
            onClick={() => setCurrentPage('dashboard')}
          >
            ⚡ AI Analytics
          </button>
          <button 
            className={`side-link ${currentPage === 'inventory' ? 'active' : ''}`}
            onClick={() => setCurrentPage('inventory')}
          >
            📦 Inventory
          </button>
          <button className="side-link" onClick={handleLogout}>
            🚪 Logout
          </button>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="app-viewport">
        {currentPage === 'dashboard' ? <Dashboard /> : <Inventory />}
      </main>
    </div>
  );
}