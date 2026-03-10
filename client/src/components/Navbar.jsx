import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

// Stateless functional component — displays a single nav link group
function NavDropdown({ label, items }) {
    return (
        <div className="nav-dropdown">
            <button className="nav-link">{label} <span className="caret">▾</span></button>
            <div className="dropdown-menu">
                {items.map((item, i) => (
                    <Link key={i} to={item.to} className="dropdown-item">{item.label}</Link>
                ))}
            </div>
        </div>
    );
}

export default function Navbar() {
    const { isAuthenticated, logout, user } = useAuth();
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);   // useState hook

    const handleLogout = () => { logout(); navigate('/'); };

    return (
        <nav className="navbar">
            <div className="navbar-container">
                <Link to="/" className="navbar-logo">
                    <span className="logo-star">✳</span>
                    <span>Analyzer</span>
                </Link>

                <div className={`navbar-links ${menuOpen ? 'open' : ''}`}>
                    <NavDropdown label="Dashboard" items={[
                        { to: '/dashboard', label: 'Overview' },
                        { to: '/history', label: 'Scan History' },
                    ]} />
                    <NavDropdown label="Analysis Reports" items={[
                        { to: '/dashboard', label: 'Latest Report' },
                        { to: '/history', label: 'All Reports' },
                    ]} />
                    <NavDropdown label="Quality Rules" items={[
                        { to: '/dashboard', label: 'Run a Scan' },
                        { to: '/history', label: 'View History' },
                    ]} />
                    <NavDropdown label="Documentation" items={[
                        { to: '/', label: 'Getting Started' },
                        { to: '/register', label: 'API Reference' },
                    ]} />
                </div>

                <div className="navbar-actions">
                    {isAuthenticated ? (
                        <>
                            <span className="nav-user">👤 {user?.name}</span>
                            <button className="btn-outline" onClick={handleLogout}>Logout</button>
                        </>
                    ) : (
                        <>
                            <Link to="/login" className="btn-outline">Sign in</Link>
                            <Link to="/register" className="btn-primary">Start Free Scan</Link>
                        </>
                    )}
                </div>

                <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)}>☰</button>
            </div>
        </nav>
    );
}
