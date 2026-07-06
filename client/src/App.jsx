import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { api, getToken, clearToken } from './api';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Expenses from './pages/Expenses';
import Goals from './pages/Goals';
import Budget from './pages/Budget';

export default function App() {
  const [user, setUser] = useState(undefined); // undefined = checking

  useEffect(() => {
    if (!getToken()) return setUser(null);
    api('/me').then(setUser).catch(() => setUser(null));
  }, []);

  if (user === undefined) return null;
  if (!user) return <Auth onAuthed={setUser} />;

  return (
    <BrowserRouter>
      <div className="shell">
        <div className="topbar">
          <span className="brand">dina<span>ri</span></span>
          <button className="signout" onClick={() => { clearToken(); setUser(null); }}>
            Sign out{user.name ? ` (${user.name})` : ''}
          </button>
        </div>
        <nav className="tabs">
          <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>Dashboard</NavLink>
          <NavLink to="/expenses" className={({ isActive }) => isActive ? 'active' : ''}>Expenses</NavLink>
          <NavLink to="/goals" className={({ isActive }) => isActive ? 'active' : ''}>Goals</NavLink>
          <NavLink to="/budget" className={({ isActive }) => isActive ? 'active' : ''}>Budget</NavLink>
        </nav>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/budget" element={<Budget />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
