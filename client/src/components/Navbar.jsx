import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <nav className="navbar">
      <div className="navbar-top">
        <Link to="/" className="navbar-brand" onClick={closeMenu} style={{ color: 'white', textDecoration: 'none' }}>Syam Incubators</Link>
        <button
          className={`hamburger ${menuOpen ? 'open' : ''}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>
      <div className={`navbar-links ${menuOpen ? 'show' : ''}`}>
        <Link to="/dashboard" className={location.pathname === '/dashboard' ? 'active' : ''} onClick={closeMenu}>Dashboard</Link>
        <Link to="/" className={location.pathname === '/' ? 'active' : ''} onClick={closeMenu}>Sales</Link>
        <Link to="/customers/new" className={location.pathname === '/customers/new' ? 'active' : ''} onClick={closeMenu}>New Sale</Link>
        <Link to="/deliveries" className={location.pathname === '/deliveries' ? 'active' : ''} onClick={closeMenu}>Deliveries</Link>
        <Link to="/hatchery" className={location.pathname === '/hatchery' ? 'active' : ''} onClick={closeMenu}>Hatchery</Link>
        <Link to="/settings" className={location.pathname === '/settings' ? 'active' : ''} onClick={closeMenu}>Settings</Link>
        <button onClick={handleLogout} className="btn-logout">Logout</button>
      </div>
    </nav>
  );
}
