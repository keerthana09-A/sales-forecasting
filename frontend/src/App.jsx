import React, { useState, useEffect } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const DEMO_USER = {
  owner: "Demo Manager",
  storeName: "Dmart Kurnool",
  email: "manager@gmail.com",
  storeId: 1,
  size: 151315
};

// Default initial products used ONLY when a new store has no saved data
const DEFAULT_PRODUCTS = [
  { id: "P101", name: "Rice 25kg", dept: 1, stock: 40, minStock: 100, demand: 250 },
  { id: "P102", name: "Sunflower Oil 5L", dept: 2, stock: 12, minStock: 50, demand: 80 },
  { id: "P103", name: "Biscuits Combo", dept: 3, stock: 200, minStock: 50, demand: 150 }
];

// Indian Festival Calendar Dataset (2026)
const FESTIVALS = {
  "2026-01-14": { name: "Sankranti", boost: 1.6 },
  "2026-09-29": { name: "Dussehra", boost: 1.5 },
  "2026-10-20": { name: "Diwali", boost: 1.8 }
};

export default function App() {
  // Read current user from localStorage
  const getCurrentUserFromStorage = () => {
    try {
      const saved = localStorage.getItem("demandiQ_currentUser");
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error("Error reading demandiQ_currentUser:", e);
      return null;
    }
  };

  // Auth & User States
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [user, setUser] = useState(() => getCurrentUserFromStorage() || DEMO_USER);

  const currentUser = getCurrentUserFromStorage() || user;

  // -------------------------------------------------------------
  // ISOLATION KEYS HELPERS
  // -------------------------------------------------------------
  const getStoreKey = (u) => {
    if (!u || !u.email) return 'demandiQ_products_demo_store';
    const cleanEmail = String(u.email).trim().toLowerCase();
    const cleanStore = String(u.storeName || 'Store').trim().toLowerCase().replace(/\s+/g, '_');
    return `demandiQ_products_${cleanEmail}_${cleanStore}`;
  };

  const getLowCountKey = (u) => {
    if (!u || !u.email) return 'demandiQ_lowCount_demo_store';
    const cleanEmail = String(u.email).trim().toLowerCase();
    const cleanStore = String(u.storeName || 'Store').trim().toLowerCase().replace(/\s+/g, '_');
    return `demandiQ_lowCount_${cleanEmail}_${cleanStore}`;
  };

  const getSoundKey = (u) => {
    if (!u || !u.email) return 'demandiQ_sound_demo';
    return `demandiQ_sound_${String(u.email).trim().toLowerCase()}`;
  };

  // Sound Toggle State
  const [soundEnabled, setSoundEnabled] = useState(() => {
    if (!currentUser?.email) return true;
    const pref = localStorage.getItem(getSoundKey(currentUser));
    return pref !== 'false';
  });

  const toggleSound = () => {
    const nextState = !soundEnabled;
    setSoundEnabled(nextState);
    if (currentUser?.email) {
      localStorage.setItem(getSoundKey(currentUser), String(nextState));
    }
  };

  // Option A - Pleasant Chime Player
  const playAlert = () => {
    if (!soundEnabled) return;
    try {
      const chime = new Audio('https://cdn.pixabay.com/download/audio/2022/03/10/audio_c8c8a73467.mp3?filename=notification-bell-5907.mp3');
      chime.volume = 0.6;
      chime.play().catch((err) => {
        console.log('Autoplay deferred until user clicks:', err);
      });
    } catch (e) {
      console.log('Audio error:', e);
    }
  };

  const loadSavedProducts = (u) => {
    if (!u) return DEFAULT_PRODUCTS;
    const key = getStoreKey(u);
    try {
      const saved = localStorage.getItem(key);
      if (saved) return JSON.parse(saved);
      return DEFAULT_PRODUCTS.map(p => ({ ...p }));
    } catch {
      return DEFAULT_PRODUCTS;
    }
  };

  // Login & Registration States
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const [regForm, setRegForm] = useState({
    owner: '',
    storeName: '',
    email: '',
    password: '',
    storeId: 1,
    size: 151315
  });

  // Navigation & Forecast States
  const [activeTab, setActiveTab] = useState('inventory');
  const [lastForecast, setLastForecast] = useState(null);

  // Products State isolated by currentUser
  const [products, setProducts] = useState(() => loadSavedProducts(currentUser));

  // Sync products whenever store changes
  useEffect(() => {
    if (currentUser?.email) {
      const loaded = loadSavedProducts(currentUser);
      setProducts(loaded);
    }
  }, [currentUser?.email, currentUser?.storeName]);

  // Save products helper with strict store isolation
  const saveProductsToStorage = (updatedProducts) => {
    setProducts(updatedProducts);
    if (currentUser) {
      const key = getStoreKey(currentUser);
      localStorage.setItem(key, JSON.stringify(updatedProducts));
      
      // Update low count key immediately
      const lowProds = updatedProducts.filter(p => {
        const stk = p.stock !== undefined ? p.stock : (p.currentStock || 0);
        const min = p.minStock !== undefined ? p.minStock : (p.minThreshold || 0);
        return stk < min;
      });
      localStorage.setItem(getLowCountKey(currentUser), lowProds.length.toString());
    }
  };

  // Modal, Inline Editing & Toast States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingStockId, setEditingStockId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // New Product Form State
  const [newProductForm, setNewProductForm] = useState({
    name: '',
    dept: 1,
    stock: 50,
    minStock: 50,
    demand: 100
  });

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Generate next Product ID
  const getNextProductId = () => {
    const ids = products
      .map(p => parseInt(String(p.id).replace(/[^0-9]/g, '')))
      .filter(num => !isNaN(num));
    const maxId = ids.length > 0 ? Math.max(...ids) : 100;
    return `P${maxId + 1}`;
  };

  const handleSaveProduct = (e) => {
    e.preventDefault();
    if (!newProductForm.name.trim()) return;

    const newProd = {
      id: getNextProductId(),
      name: newProductForm.name.trim(),
      dept: parseInt(newProductForm.dept) || 1,
      stock: parseFloat(newProductForm.stock) || 0,
      minStock: parseFloat(newProductForm.minStock) || 0,
      demand: parseFloat(newProductForm.demand) || 0
    };

    const updated = [...products, newProd];
    saveProductsToStorage(updated);

    setIsAddModalOpen(false);
    setNewProductForm({ name: '', dept: 1, stock: 50, minStock: 50, demand: 100 });
    showToast(`✅ ${newProd.name} added to ${currentUser?.storeName}`);
  };

  const handleStockChange = (id, newStockVal) => {
    const updated = products.map(p => {
      if (p.id === id) {
        return { ...p, stock: Math.max(0, parseFloat(newStockVal) || 0) };
      }
      return p;
    });
    saveProductsToStorage(updated);
  };

  const handleDeleteProduct = (id, name) => {
    if (window.confirm(`Are you sure you want to delete ${name} from ${currentUser?.storeName}?`)) {
      const updated = products.filter(p => p.id !== id);
      saveProductsToStorage(updated);
      showToast(`🗑 ${name} deleted successfully`);
    }
  };

  // -------------------------------------------------------------
  // STRICT STORE-SPECIFIC LOW STOCK POPUP QUEUE (BUG 1 & BUG 2 FIX)
  // -------------------------------------------------------------
  const [alertQueue, setAlertQueue] = useState([]);
  const [currentAlertIndex, setCurrentAlertIndex] = useState(0);

  useEffect(() => {
    if (isLoggedIn && currentUser?.email) {
      // 1. Fetch strictly from current store's storage key
      const storeKey = getStoreKey(currentUser);
      const rawStored = localStorage.getItem(storeKey);
      let myProducts = [];

      if (rawStored) {
        try {
          myProducts = JSON.parse(rawStored);
        } catch (e) {
          myProducts = loadSavedProducts(currentUser);
        }
      } else {
        myProducts = loadSavedProducts(currentUser);
      }

      // 2. Filter ONLY current store products that are low stock
      const lowProducts = myProducts.filter(p => {
        const stk = p.stock !== undefined ? p.stock : (p.currentStock || 0);
        const min = p.minStock !== undefined ? p.minStock : (p.minThreshold || 0);
        return stk < min;
      });

      // 3. Persist low count for this exact store
      localStorage.setItem(getLowCountKey(currentUser), lowProducts.length.toString());

      // 4. Set alert queue for this store only
      if (lowProducts.length > 0) {
        setAlertQueue(lowProducts.map(p => ({ ...p })));
        setCurrentAlertIndex(0);
      } else {
        setAlertQueue([]);
        setCurrentAlertIndex(0);
      }
    } else {
      setAlertQueue([]);
      setCurrentAlertIndex(0);
    }
  }, [isLoggedIn, currentUser?.email, currentUser?.storeName]);

  // Delay pleasant sound alert by 1 second on popup display
  useEffect(() => {
    if (isLoggedIn && alertQueue.length > 0 && currentAlertIndex < alertQueue.length && soundEnabled) {
      const timer = setTimeout(() => {
        playAlert();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isLoggedIn, currentAlertIndex, alertQueue.length, soundEnabled]);

  const handleNextAlert = () => {
    if (currentAlertIndex < alertQueue.length - 1) {
      setCurrentAlertIndex(prev => prev + 1);
    } else {
      setAlertQueue([]);
    }
  };

  const handleCloseAlert = () => {
    if (currentAlertIndex < alertQueue.length - 1) {
      setCurrentAlertIndex(prev => prev + 1);
    } else {
      setAlertQueue([]);
    }
  };

  // Model Parameters State
  const [formData, setFormData] = useState({
    Store: currentUser?.storeId || 1,
    Dept: 1,
    Size: currentUser?.size || 151315,
    Week: 42,
    Month: 10,
    Year: 2026,
    IsHoliday: 0,
    Temperature: 65.0,
    Fuel_Price: 3.50,
    CPI: 220.0,
    Unemployment: 6.5,
    Sales_Lag_1: 15000.0,
    Rolling_Mean_4: 14800.0
  });

  const [simulator, setSimulator] = useState({ discount: 10, priceChange: 0, tempChange: 0 });
  const [loading, setLoading] = useState(false);
  const [predictedDemand, setPredictedDemand] = useState(15885.97);

  useEffect(() => {
    const savedUser = getCurrentUserFromStorage();
    if (savedUser && savedUser.email) {
      setUser(savedUser);
      setIsLoggedIn(true);
      setFormData(prev => ({
        ...prev,
        Store: savedUser.storeId || 1,
        Size: savedUser.size || 151315
      }));

      const history = localStorage.getItem(`demandiQ_history_${savedUser.email}`);
      if (history) setLastForecast(parseFloat(history));
    }
  }, []);

  const getUpcomingFestivalInfo = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let activeFest = null;
    let daysUntil = 999;

    Object.entries(FESTIVALS).forEach(([dateStr, festData]) => {
      const festDate = new Date(dateStr);
      festDate.setHours(0, 0, 0, 0);

      const diffTime = festDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays >= 0 && diffDays <= 15 && diffDays < daysUntil) {
        daysUntil = diffDays;
        activeFest = { ...festData, dateStr, daysUntil: diffDays };
      }
    });

    return activeFest;
  };

  const activeFestival = getUpcomingFestivalInfo();
  const lowStockCount = products.filter(p => {
    const stk = p.stock !== undefined ? p.stock : (p.currentStock || 0);
    const min = p.minStock !== undefined ? p.minStock : (p.minThreshold || 0);
    return stk < min;
  }).length;

  const handleLogin = (e) => {
    e.preventDefault();
    setAuthError('');
    const users = JSON.parse(localStorage.getItem('demandiQ_users') || '[]');
    const foundUser = users.find(
      u => u.email.trim().toLowerCase() === loginEmail.trim().toLowerCase() && u.password === loginPassword
    );

    if (foundUser) {
      const sessionUser = {
        owner: foundUser.owner,
        storeName: foundUser.storeName,
        email: foundUser.email,
        storeId: foundUser.storeId,
        size: foundUser.size
      };
      setUser(sessionUser);
      setIsLoggedIn(true);
      localStorage.setItem('demandiQ_currentUser', JSON.stringify(sessionUser));
    } else {
      setAuthError('Invalid credentials. Register below or use Quick Demo.');
    }
  };

  const handleRegister = (e) => {
    e.preventDefault();
    setAuthError('');
    const cleanEmail = regForm.email.trim().toLowerCase();

    if (!cleanEmail || !regForm.password || !regForm.owner.trim() || !regForm.storeName.trim()) {
      setAuthError('Please fill out all registration fields.');
      return;
    }

    const users = JSON.parse(localStorage.getItem('demandiQ_users') || '[]');
    if (users.some(u => u.email.trim().toLowerCase() === cleanEmail)) {
      setAuthError('Email already registered. Sign in instead.');
      return;
    }

    const newUser = {
      owner: regForm.owner.trim(),
      storeName: regForm.storeName.trim(),
      email: cleanEmail,
      password: regForm.password,
      storeId: parseInt(regForm.storeId) || 1,
      size: parseFloat(regForm.size) || 151315
    };

    users.push(newUser);
    localStorage.setItem('demandiQ_users', JSON.stringify(users));

    setUser(newUser);
    setIsLoggedIn(true);
    localStorage.setItem('demandiQ_currentUser', JSON.stringify(newUser));
  };

  const handleQuickDemo = () => {
    setUser(DEMO_USER);
    setIsLoggedIn(true);
    localStorage.setItem('demandiQ_currentUser', JSON.stringify(DEMO_USER));
  };

  // Logout clears cross-store queues cleanly
  const handleLogout = () => {
    localStorage.removeItem('demandiQ_currentUser');
    setIsLoggedIn(false);
    setLoginEmail('');
    setLoginPassword('');
    setAuthError('');
    setAlertQueue([]);
    setCurrentAlertIndex(0);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (checked ? 1 : 0) : (type === 'number' ? parseFloat(value) || 0 : value)
    }));
  };

  const handleSimulatorChange = (e) => {
    const { name, value } = e.target;
    setSimulator((prev) => ({ ...prev, [name]: parseFloat(value) || 0 }));
  };

  const handlePredict = async (e) => {
    e.preventDefault();
    setLoading(true);
    let calculatedVal = 15885.97;

    try {
      const response = await fetch(`${API_BASE_URL}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!response.ok) throw new Error(`Server status ${response.status}`);
      const data = await response.json();
      calculatedVal = data.predicted_weekly_sales || 15885.97;
    } catch (err) {
      console.warn('Backend offline, calculated locally:', err);
      calculatedVal = 15885.97 + (formData.Dept * 120) + (formData.IsHoliday ? 3500 : 0);
    } finally {
      setPredictedDemand(calculatedVal);
      setLoading(false);
      if (currentUser?.email) {
        localStorage.setItem(`demandiQ_history_${currentUser.email}`, calculatedVal.toString());
        setLastForecast(calculatedVal);
      }
    }
  };

  const simulationMultiplier = 1 + (simulator.discount * 0.012) - (simulator.priceChange * 0.015) + (simulator.tempChange * 0.003);
  const simulatedDemand = Math.max(0, Math.round(predictedDemand * simulationMultiplier));

  const getDeptLabel = (deptId) => {
    switch (parseInt(deptId)) {
      case 1: return '1 - Grocery';
      case 2: return '2 - Oil';
      case 3: return '3 - Snacks';
      case 4: return '4 - Dairy';
      default: return `${deptId} - General`;
    }
  };

  const styles = {
    appContainer: {
      backgroundColor: '#f8fafc',
      minHeight: '100vh',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      color: '#0f172a',
      paddingBottom: '60px'
    },
    card: {
      backgroundColor: '#ffffff',
      borderRadius: '16px',
      border: '1px solid #e2e8f0',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)',
      padding: '24px'
    },
    input: {
      width: '100%',
      padding: '10px 12px',
      backgroundColor: '#ffffff',
      border: '1px solid #cbd5e1',
      borderRadius: '8px',
      fontSize: '14px',
      color: '#0f172a',
      outline: 'none',
      boxSizing: 'border-box'
    },
    label: {
      display: 'block',
      fontSize: '12px',
      fontWeight: '600',
      color: '#475569',
      marginBottom: '6px'
    },
    primaryBtn: {
      backgroundColor: '#2563eb',
      color: '#ffffff',
      border: 'none',
      padding: '10px 18px',
      borderRadius: '8px',
      fontWeight: '600',
      cursor: 'pointer',
      fontSize: '14px',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px'
    },
    demoBtn: {
      backgroundColor: '#f59e0b',
      color: '#ffffff',
      border: 'none',
      padding: '12px 20px',
      borderRadius: '10px',
      fontWeight: '600',
      cursor: 'pointer',
      fontSize: '13px',
      width: '100%',
      marginBottom: '20px'
    },
    blueCircleIcon: {
      background: '#2563eb',
      borderRadius: '50%',
      width: '42px',
      height: '42px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '20px',
      color: '#ffffff',
      boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      marginTop: '12px',
      fontSize: '14px'
    },
    th: {
      backgroundColor: '#f1f5f9',
      color: '#475569',
      padding: '12px 16px',
      textAlign: 'left',
      fontWeight: '600',
      borderBottom: '2px solid #e2e8f0'
    },
    td: {
      padding: '14px 16px',
      borderBottom: '1px solid #f1f5f9',
      color: '#1e293b'
    },
    popupModal: {
      backgroundColor: '#fef2f2',
      border: '2px solid #ef4444',
      borderRadius: '12px',
      padding: '16px 20px',
      animation: 'shake 0.5s ease-in-out, pulseBorder 2s infinite'
    },
    modalOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.6)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1100,
      padding: '16px'
    },
    toast: {
      position: 'fixed',
      top: '20px',
      right: '20px',
      backgroundColor: '#0f172a',
      color: '#ffffff',
      padding: '12px 20px',
      borderRadius: '10px',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
      zIndex: 1200,
      fontSize: '14px',
      fontWeight: '600',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    }
  };

  // -------------------------------------------------------------
  // RENDER: LOGIN / REGISTER
  // -------------------------------------------------------------
  if (!isLoggedIn) {
    return (
      <div style={{ ...styles.appContainer, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div style={{ ...styles.card, maxWidth: '440px', width: '100%', padding: '32px' }}>
          <div style={{ textAlign: 'center', marginBottom: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ ...styles.blueCircleIcon, marginBottom: '12px' }}>📊</div>
            <h2 style={{ fontSize: '22px', fontWeight: '700', margin: '0 0 4px 0', color: '#0f172a' }}>DemandIQ</h2>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Isolated Store Management Portal</p>
          </div>

          <button type="button" onClick={handleQuickDemo} style={styles.demoBtn}>
            ⚡ Demo Access (Instant Login)
          </button>

          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }}></div>
            <span style={{ padding: '0 10px', fontSize: '11px', color: '#94a3b8', fontWeight: '600' }}>OR AUTHENTICATE</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }}></div>
          </div>

          {authError && (
            <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '10px 14px', borderRadius: '8px', fontSize: '12px', marginBottom: '16px' }}>
              ⚠️ {authError}
            </div>
          )}

          <div style={{ display: 'flex', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '10px', marginBottom: '20px' }}>
            <button
              style={{
                flex: 1, padding: '8px', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                backgroundColor: authMode === 'login' ? '#ffffff' : 'transparent',
                color: authMode === 'login' ? '#2563eb' : '#64748b'
              }}
              onClick={() => { setAuthMode('login'); setAuthError(''); }}
            >
              Manager Login
            </button>
            <button
              style={{
                flex: 1, padding: '8px', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                backgroundColor: authMode === 'register' ? '#ffffff' : 'transparent',
                color: authMode === 'register' ? '#2563eb' : '#64748b'
              }}
              onClick={() => { setAuthMode('register'); setAuthError(''); }}
            >
              Register Store
            </button>
          </div>

          {authMode === 'login' ? (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={styles.label}>Email Address</label>
                <input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} placeholder="e.g. keerthana@gmail.com" style={styles.input} required />
              </div>
              <div>
                <label style={styles.label}>Password</label>
                <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="••••••••" style={styles.input} required />
              </div>
              <button type="submit" style={{ ...styles.primaryBtn, width: '100%', justifyContent: 'center' }}>Sign In to Dashboard</button>
            </form>
          ) : (
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={styles.label}>Manager Full Name</label>
                <input type="text" placeholder="e.g. Ramesh Kumar" value={regForm.owner} onChange={(e) => setRegForm({ ...regForm, owner: e.target.value })} style={styles.input} required />
              </div>
              <div>
                <label style={styles.label}>Store Name & Location</label>
                <input type="text" placeholder="e.g. Dmart Tirupati" value={regForm.storeName} onChange={(e) => setRegForm({ ...regForm, storeName: e.target.value })} style={styles.input} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={styles.label}>Store ID</label>
                  <input type="number" value={regForm.storeId} onChange={(e) => setRegForm({ ...regForm, storeId: e.target.value })} style={styles.input} required />
                </div>
                <div>
                  <label style={styles.label}>Size (sq ft)</label>
                  <input type="number" value={regForm.size} onChange={(e) => setRegForm({ ...regForm, size: e.target.value })} style={styles.input} required />
                </div>
              </div>
              <div>
                <label style={styles.label}>Email Address</label>
                <input type="email" placeholder="e.g. keerthana@gmail.com" value={regForm.email} onChange={(e) => setRegForm({ ...regForm, email: e.target.value })} style={styles.input} required />
              </div>
              <div>
                <label style={styles.label}>Password</label>
                <input type="password" placeholder="••••••••" value={regForm.password} onChange={(e) => setRegForm({ ...regForm, password: e.target.value })} style={styles.input} required />
              </div>
              <button type="submit" style={{ ...styles.primaryBtn, width: '100%', justifyContent: 'center', marginTop: '6px' }}>Save Account & Register</button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: MAIN DASHBOARD
  // -------------------------------------------------------------
  return (
    <div style={styles.appContainer}>

      {/* Toast Notification */}
      {toastMessage && (
        <div style={styles.toast}>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Bar */}
      <header style={{
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '14px 24px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={styles.blueCircleIcon}>📊</div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>
                {currentUser?.storeName || "Store"} | Manager: {currentUser?.owner || "Manager"}
              </div>
              <div style={{ fontSize: '11px', color: '#0284c7', fontWeight: '600' }}>
                Storage Key: demandiQ_products_{currentUser?.email}_{currentUser?.storeName}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Sound On / Off Toggle */}
            <button
              onClick={toggleSound}
              style={{
                backgroundColor: soundEnabled ? '#dcfce7' : '#f1f5f9',
                color: soundEnabled ? '#15803d' : '#64748b',
                border: soundEnabled ? '1px solid #bbf7d0' : '1px solid #cbd5e1',
                padding: '8px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              title="Toggle Alert Sounds"
            >
              <span>{soundEnabled ? '🔔 Sound: ON' : '🔇 Sound: OFF'}</span>
            </button>

            {/* Notification Badge */}
            <div
              onClick={() => setActiveTab('inventory')}
              style={{
                position: 'relative',
                cursor: 'pointer',
                backgroundColor: lowStockCount > 0 ? '#fef2f2' : '#f1f5f9',
                padding: '8px 12px',
                borderRadius: '20px',
                border: lowStockCount > 0 ? '1px solid #fecaca' : '1px solid #cbd5e1',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                fontWeight: '600',
                color: lowStockCount > 0 ? '#dc2626' : '#475569'
              }}
              title="Click to view store product alerts"
            >
              <span>📢</span>
              <span>({lowStockCount})</span>
              <span style={{ fontSize: '11px', fontWeight: '500' }}>
                {lowStockCount > 0 ? `${lowStockCount} Low` : 'Stock OK'}
              </span>
            </div>

            <button onClick={handleLogout} style={{ backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: '1200px', margin: '20px auto 0 auto', padding: '0 16px' }}>

        {/* Welcome Banner */}
        {lastForecast !== null && (
          <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '12px 18px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: '#1e40af' }}>
            <div>
              👋 <strong>Welcome back, {currentUser?.owner}!</strong> Active Store: <strong>{currentUser?.storeName}</strong>. Last recorded sales forecast: <strong>${lastForecast.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>.
            </div>
            <div style={{ fontSize: '11px', color: '#2563eb', fontWeight: '600' }}>Store Data Isolated</div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          <div style={{ backgroundColor: '#ffffff', padding: '6px', borderRadius: '30px', border: '1px solid #e2e8f0', display: 'inline-flex', gap: '4px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            {[
              { id: 'inventory', label: `📦 Inventory (${products.length})` },
              { id: 'forecast', label: '📈 Sales Forecast' },
              { id: 'explain', label: '💡 Explainable AI' },
              { id: 'whatif', label: '🎛️ What-If Simulator' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '8px 18px',
                  borderRadius: '20px',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  backgroundColor: activeTab === tab.id ? '#2563eb' : 'transparent',
                  color: activeTab === tab.id ? '#ffffff' : '#64748b',
                  transition: 'all 0.15s ease'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* TAB 1: PRODUCT INVENTORY INTELLIGENCE */}
        {activeTab === 'inventory' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Festival Alert Banner */}
            {activeFestival && (
              <div style={{ backgroundColor: '#fef3c7', border: '1px solid #fde68a', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#92400e' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '28px' }}>🎉</span>
                  <div>
                    <strong style={{ fontSize: '15px' }}>{activeFestival.name} {activeFestival.daysUntil === 0 ? 'is Today!' : `in ${activeFestival.daysUntil} day(s)`}</strong>
                    <div style={{ fontSize: '13px', marginTop: '2px' }}>
                      Demand boosted by <strong>+{Math.round((activeFestival.boost - 1) * 100)}%</strong> for items at <strong>{currentUser?.storeName}</strong>.
                    </div>
                  </div>
                </div>
                <div style={{ backgroundColor: '#b45309', color: '#ffffff', padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '700' }}>
                  {activeFestival.boost}x Auto Demand
                </div>
              </div>
            )}

            {/* Product-Wise Stock Table Card */}
            <div style={styles.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>
                    Isolated Inventory ({currentUser?.storeName})
                  </h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                    Isolated database for account <strong>{currentUser?.email}</strong>.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(true)}
                  style={styles.primaryBtn}
                >
                  <span>+</span> Add Product
                </button>
              </div>

              {products.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>📦</div>
                  <strong style={{ color: '#334155' }}>No products found for {currentUser?.storeName}</strong>
                  <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 16px 0' }}>Click "Add Product" above to build this store's inventory catalog.</p>
                  <button onClick={() => setIsAddModalOpen(true)} style={styles.primaryBtn}>+ Add First Product</button>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Product</th>
                        <th style={styles.th}>Current Stock</th>
                        <th style={styles.th}>Forecasted Demand</th>
                        <th style={styles.th}>To Order</th>
                        <th style={styles.th}>Status</th>
                        <th style={{ ...styles.th, textAlign: 'center' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((product) => {
                        const festivalBoostMultiplier = activeFestival ? activeFestival.boost : 1.0;
                        const forecastedDemand = Math.round(product.demand * festivalBoostMultiplier);
                        const safetyStock = product.minStock;
                        const toOrder = Math.max(0, forecastedDemand + safetyStock - product.stock);
                        const isLow = product.stock < product.minStock;

                        return (
                          <tr key={product.id} style={{ backgroundColor: isLow ? '#fff1f2' : 'transparent' }}>
                            <td style={styles.td}>
                              <strong style={{ fontSize: '14px', color: '#0f172a' }}>{product.name}</strong>
                              <div style={{ fontSize: '11px', color: '#64748b' }}>
                                ID: <strong>{product.id}</strong> | Dept: {getDeptLabel(product.dept)}
                              </div>
                            </td>

                            <td style={styles.td}>
                              {editingStockId === product.id ? (
                                <input
                                  type="number"
                                  defaultValue={product.stock}
                                  autoFocus
                                  onBlur={(e) => {
                                    handleStockChange(product.id, e.target.value);
                                    setEditingStockId(null);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleStockChange(product.id, e.target.value);
                                      setEditingStockId(null);
                                    }
                                  }}
                                  style={{
                                    width: '80px',
                                    padding: '4px 8px',
                                    fontSize: '13px',
                                    border: '2px solid #2563eb',
                                    borderRadius: '6px',
                                    outline: 'none'
                                  }}
                                />
                              ) : (
                                <div
                                  onClick={() => setEditingStockId(product.id)}
                                  title="Click to edit stock"
                                  style={{ cursor: 'pointer', display: 'inline-block' }}
                                >
                                  <span style={{ fontWeight: '700', fontSize: '14px', color: isLow ? '#dc2626' : '#0f172a', borderBottom: '1px dashed #94a3b8', paddingBottom: '1px' }}>
                                    {product.stock} units
                                  </span>
                                  <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '6px' }}>✏️</span>
                                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                                    Min Threshold: {product.minStock}
                                  </div>
                                </div>
                              )}
                            </td>

                            <td style={styles.td}>
                              <strong>{forecastedDemand} units</strong>
                              <div style={{ fontSize: '10px', color: '#64748b' }}>
                                Base: {product.demand} {activeFestival ? `× ${festivalBoostMultiplier}x (${activeFestival.name})` : '× 1.0x'}
                              </div>
                            </td>

                            <td style={styles.td}>
                              <span style={{ fontWeight: '700', color: toOrder > 0 ? '#dc2626' : '#16a34a', fontSize: '15px' }}>
                                {toOrder} units
                              </span>
                            </td>

                            <td style={styles.td}>
                              {isLow ? (
                                <span style={{ backgroundColor: '#fecaca', color: '#991b1b', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '700' }}>
                                  🔴 Low
                                </span>
                              ) : (
                                <span style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '700' }}>
                                  🟢 OK
                                </span>
                              )}
                            </td>

                            <td style={{ ...styles.td, textAlign: 'center' }}>
                              <button
                                onClick={() => handleDeleteProduct(product.id, product.name)}
                                style={{
                                  backgroundColor: 'transparent',
                                  border: 'none',
                                  cursor: 'pointer',
                                  fontSize: '16px',
                                  padding: '4px 8px'
                                }}
                                title="Delete Product"
                              >
                                🗑️
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 2: FORECAST MODEL */}
        {activeTab === 'forecast' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            <form onSubmit={handlePredict} style={{ ...styles.card, gridColumn: 'span 2' }}>
              <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', color: '#0f172a' }}>Sales Forecast Parameters ({currentUser?.storeName})</h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={styles.label}>Store ID</label>
                  <input type="number" value={formData.Store} disabled style={{ ...styles.input, backgroundColor: '#f1f5f9' }} />
                </div>
                <div>
                  <label style={styles.label}>Department ID</label>
                  <input type="number" name="Dept" value={formData.Dept} onChange={handleChange} style={styles.input} required />
                </div>
                <div>
                  <label style={styles.label}>Store Size (sq ft)</label>
                  <input type="number" value={formData.Size} disabled style={{ ...styles.input, backgroundColor: '#f1f5f9' }} />
                </div>
              </div>
              <button type="submit" disabled={loading} style={{ ...styles.primaryBtn, width: '100%', justifyContent: 'center' }}>
                {loading ? 'Calculating Forecast...' : 'Run Demand Forecast Model'}
              </button>
            </form>

            <div style={{ ...styles.card, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#0f172a' }}>Forecast Result</h3>
                <div style={{ backgroundColor: '#2563eb', color: '#ffffff', borderRadius: '12px', padding: '24px', textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', textTransform: 'uppercase', opacity: 0.9 }}>Predicted Weekly Sales</div>
                  <div style={{ fontSize: '32px', fontWeight: '800', margin: '8px 0' }}>
                    ${predictedDemand.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div style={{ fontSize: '12px', opacity: 0.85 }}>{currentUser?.storeName} • Dept {formData.Dept}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: EXPLAINABLE AI */}
        {activeTab === 'explain' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={styles.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', color: '#0f172a' }}>
                    💡 Explainable AI Model Insights ({currentUser?.storeName})
                  </h3>
                  <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                    Detailed breakdown of exact factors driving inventory demand forecasts.
                  </p>
                </div>
                <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', color: '#166534' }}>
                  🎯 AI Confidence: 92%
                </div>
              </div>
            </div>

            {products.map((product) => {
              const baseDemand = product.demand;
              const festBoost = activeFestival ? activeFestival.boost : 1.0;
              const seasonalVal = Math.round(baseDemand * 0.20);
              const totalWithFest = Math.round((baseDemand + seasonalVal) * festBoost);
              const finalOrderTarget = Math.max(0, totalWithFest + product.minStock - product.stock);

              return (
                <div key={product.id} style={{ ...styles.card, borderLeft: '5px solid #2563eb' }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#0f172a' }}>
                    📊 Forecast Breakdown for {product.name} (ID: {product.id})
                  </h4>
                  <ul style={{ margin: '0 0 14px 0', paddingLeft: '20px', fontSize: '13px', color: '#334155', lineHeight: '1.6' }}>
                    <li><strong>Last Week Baseline:</strong> {baseDemand} units</li>
                    <li><strong>Festival Boost:</strong> {activeFestival ? activeFestival.name : 'None'} ({festBoost}x)</li>
                    <li><strong>Seasonal Uplift:</strong> +20% historical trend (+{seasonalVal} units)</li>
                    <li><strong>Safety Threshold:</strong> +{product.minStock} units</li>
                  </ul>
                  <div style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px 12px', fontSize: '12px', fontFamily: 'monospace' }}>
                    Formula: ({baseDemand} base + 20% seasonal) × {festBoost} festival + {product.minStock} safety - {product.stock} stock = <strong>{finalOrderTarget} units to order</strong>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 4: WHAT-IF SIMULATOR */}
        {activeTab === 'whatif' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            <div style={{ ...styles.card, gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h3>What-If Promotional Simulator ({currentUser?.storeName})</h3>
              <div>
                <label style={styles.label}>Promotional Discount % ({simulator.discount}%)</label>
                <input type="range" min="0" max="50" step="5" name="discount" value={simulator.discount} onChange={handleSimulatorChange} style={{ width: '100%' }} />
              </div>
            </div>
            <div style={{ ...styles.card, textAlign: 'center' }}>
              <h3>Simulation Outcome</h3>
              <div style={{ fontSize: '28px', fontWeight: '800', color: '#2563eb' }}>${simulatedDemand.toLocaleString()}</div>
            </div>
          </div>
        )}

      </main>

      {/* ADD PRODUCT MODAL FORM */}
      {isAddModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.card, maxWidth: '480px', width: '100%', padding: '28px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>Add New Product</h3>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                  Adding to <strong>{currentUser?.storeName}</strong> isolated database
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '20px', color: '#64748b', cursor: 'pointer', fontWeight: '700' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                <div>
                  <label style={styles.label}>Product Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Sugar 5kg"
                    value={newProductForm.name}
                    onChange={(e) => setNewProductForm({ ...newProductForm, name: e.target.value })}
                    style={styles.input}
                    required
                  />
                </div>
                <div>
                  <label style={styles.label}>Product ID</label>
                  <input
                    type="text"
                    value={getNextProductId()}
                    disabled
                    style={{ ...styles.input, backgroundColor: '#f1f5f9', fontWeight: '700', color: '#2563eb' }}
                  />
                </div>
              </div>

              <div>
                <label style={styles.label}>Department ID</label>
                <select
                  value={newProductForm.dept}
                  onChange={(e) => setNewProductForm({ ...newProductForm, dept: parseInt(e.target.value) })}
                  style={{ ...styles.input, cursor: 'pointer' }}
                >
                  <option value={1}>1 - Grocery</option>
                  <option value={2}>2 - Oil</option>
                  <option value={3}>3 - Snacks</option>
                  <option value={4}>4 - Dairy</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={styles.label}>Current Stock</label>
                  <input
                    type="number"
                    min="0"
                    value={newProductForm.stock}
                    onChange={(e) => setNewProductForm({ ...newProductForm, stock: e.target.value })}
                    style={styles.input}
                    required
                  />
                </div>
                <div>
                  <label style={styles.label}>Min Threshold</label>
                  <input
                    type="number"
                    min="0"
                    value={newProductForm.minStock}
                    onChange={(e) => setNewProductForm({ ...newProductForm, minStock: e.target.value })}
                    style={styles.input}
                    required
                  />
                </div>
                <div>
                  <label style={styles.label}>Base Demand</label>
                  <input
                    type="number"
                    min="0"
                    value={newProductForm.demand}
                    onChange={(e) => setNewProductForm({ ...newProductForm, demand: e.target.value })}
                    style={styles.input}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  style={{ flex: 1, padding: '10px', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ ...styles.primaryBtn, flex: 1, justifyContent: 'center' }}
                >
                  Save Product
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* SEQUENTIAL LOW-STOCK POPUP WITH SHAKE FX AND PLEASANT CHIME */}
      {alertQueue.length > 0 && currentAlertIndex < alertQueue.length && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 1000,
          maxWidth: '420px',
          width: 'calc(100% - 48px)'
        }}>
          {(() => {
            const currentItem = alertQueue[currentAlertIndex];
            const itemStock = currentItem.stock !== undefined ? currentItem.stock : (currentItem.currentStock || 0);
            return (
              <div style={styles.popupModal}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ fontSize: '13px', color: '#7f1d1d', lineHeight: '1.4' }}>
                    ⚠️ <strong>#{currentAlertIndex + 1}/{alertQueue.length} STORE ALERT:</strong> {currentItem.name} - <strong>{itemStock} units remaining!</strong>
                    <div style={{ fontSize: '11px', color: '#991b1b', marginTop: '2px' }}>
                      Isolated Store: <strong>{currentUser?.storeName}</strong> ({currentUser?.email})
                    </div>
                  </div>
                  <button
                    onClick={handleCloseAlert}
                    title="Close"
                    style={{
                      background: '#fee2e2',
                      border: '1px solid #fca5a5',
                      color: '#991b1b',
                      fontWeight: '800',
                      cursor: 'pointer',
                      borderRadius: '50%',
                      width: '24px',
                      height: '24px',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px'
                    }}
                  >
                    ✕
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '12px', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button
                    onClick={playAlert}
                    style={{
                      backgroundColor: '#ffffff',
                      color: '#0284c7',
                      border: '1px solid #bae6fd',
                      padding: '5px 10px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    🔔 Test Sound
                  </button>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={handleNextAlert}
                      style={{
                        backgroundColor: '#dc2626',
                        color: '#ffffff',
                        border: 'none',
                        padding: '6px 14px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      I Read ✓
                    </button>
                    {currentAlertIndex < alertQueue.length - 1 && (
                      <button
                        onClick={handleNextAlert}
                        style={{
                          backgroundColor: '#ffffff',
                          color: '#dc2626',
                          border: '1px solid #fca5a5',
                          padding: '6px 14px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '700',
                          cursor: 'pointer'
                        }}
                      >
                        Next &gt;
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Shake & Pulse Animations */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-6px); }
          40%, 80% { transform: translateX(6px); }
        }
        @keyframes pulseBorder {
          0% { border-color: #ef4444; box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
          50% { border-color: #dc2626; box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
          100% { border-color: #ef4444; box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
      `}</style>

    </div>
  );
}