import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import './Auth.css';

export default function Register() {
    const [form, setForm] = useState({ name: '', email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const { data } = await axios.post('http://localhost:5000/api/auth/register', form);
            login(data);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed. Please try again.');
        } finally { setLoading(false); }
    };

    return (
        <div className="auth-page">
            <div className="auth-card animate-fade">
                <div className="auth-logo"><span className="logo-star">✳</span> Analyzer</div>
                <h2 className="auth-title">Create your account</h2>
                <p className="auth-subtitle">Start analyzing your code for free</p>

                {error && <div className="auth-error">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Full name</label>
                        <input className="form-input" type="text" placeholder="John Doe" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Email address</label>
                        <input className="form-input" type="email" placeholder="you@example.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <input className="form-input" type="password" placeholder="••••••••" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required minLength={6} />
                    </div>
                    <button type="submit" className="btn-primary auth-btn" disabled={loading}>
                        {loading ? <span className="spin">⟳</span> : 'Create Account'}
                    </button>
                </form>

                <p className="auth-link">Already have an account? <Link to="/login">Sign in</Link></p>
            </div>
        </div>
    );
}
