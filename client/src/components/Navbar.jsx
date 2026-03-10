import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

// Stateless functional component — pure presentational, no state
function NavDropdown({ label, items }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    // Close on outside click
    useEffect(() => {
        function handleClick(e) {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    return (
        <div className="nav-dropdown" ref={ref}>
            <button
                className={`nav-link ${open ? 'active' : ''}`}
                onClick={() => setOpen(o => !o)}
                type="button"
            >
                {label} <span className="caret">{open ? '▴' : '▾'}</span>
            </button>
            {open && (
                <div className="dropdown-menu show">
                    {items.map((item, i) => (
                        <Link
                            key={i}
                            to={item.to}
                            className="dropdown-item"
                            onClick={() => setOpen(false)}
                        >
                            {item.label}
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function Navbar() {
    const { isAuthenticated, logout, user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [menuOpen, setMenuOpen] = useState(false);

    // Close mobile menu on route change
    useEffect(() => { setMenuOpen(false); }, [location.pathname]);

    const handleLogout = () => {
        logout();
        navigate('/', { replace: true });
    };

    return (
        <nav className="navbar">
            <div className="navbar-container">
                <Link to="/" className="navbar-logo">
                    <span className="logo-star">✳</span>
                    <span>Analyzer</span>
                </Link>

                <div className={`navbar-links ${menuOpen ? 'open' : ''}`}>
                    <NavDropdown label="Dashboard" items={[
                        { to: '/dashboard', label: '📊 Overview' },
                        { to: '/history', label: '🕐 Scan History' },
                    ]} />
                    <NavDropdown label="Analysis Reports" items={[
                        { to: '/dashboard', label: '📋 Latest Report' },
                        { to: '/history', label: '📂 All Reports' },
                    ]} />
                    <NavDropdown label="Quality Rules" items={[
                        { to: '/dashboard', label: '🚀 Run a Scan' },
                        { to: '/history', label: '📈 View History' },
                    ]} />
                    <NavDropdown label="Documentation" items={[
                        { to: '/', label: '🏠 Getting Started' },
                    ]} />
                </div>

                <div className="navbar-actions">
                    {isAuthenticated ? (
                        <>
                            <span className="nav-user">👤 {user?.name}</span>
                            <button className="btn-outline" type="button" onClick={handleLogout}>
                                Logout
                            </button>
                        </>
                    ) : (
                        <>
                            <Link to="/login" className="btn-outline">Sign in</Link>
                            <Link to="/register" className="btn-primary">Start Free Scan</Link>
                        </>
                    )}
                </div>

                <button
                    className="hamburger"
                    type="button"
                    onClick={() => setMenuOpen(o => !o)}
                    aria-label="Toggle menu"
                >
                    {menuOpen ? '✕' : '☰'}
                </button>
            </div>
        </nav>
    );
}
