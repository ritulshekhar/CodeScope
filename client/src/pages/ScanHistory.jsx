import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import './ScanHistory.css';

export default function ScanHistory() {
    const { token } = useAuth();
    const navigate = useNavigate();
    const [scans, setScans] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios.get('http://localhost:5000/api/scans', { headers: { Authorization: `Bearer ${token}` } })
            .then(res => { setScans(res.data); setLoading(false); })
            .catch(() => setLoading(false));
    }, [token]);

    const statusColor = { completed: '#06d6a0', failed: '#ff4d6d', scanning: '#b5f23d', pending: '#ffd166' };

    return (
        <div className="history-page">
            <div className="history-header">
                <h1 className="section-title">🕐 Scan History</h1>
                <button className="btn-primary" onClick={() => navigate('/dashboard')}>+ New Scan</button>
            </div>

            {loading ? (
                <div className="history-loading"><span className="spin" style={{ fontSize: 28 }}>⟳</span></div>
            ) : scans.length === 0 ? (
                <div className="history-empty card">
                    <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
                    <h3>No scans yet</h3>
                    <p>Start your first scan from the dashboard.</p>
                    <button className="btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/dashboard')}>Go to Dashboard</button>
                </div>
            ) : (
                <div className="history-table card">
                    <div className="ht-header">
                        <span>Repository</span>
                        <span>Source</span>
                        <span>Status</span>
                        <span>Issues</span>
                        <span>Quality Score</span>
                        <span>Scanned At</span>
                        <span>Actions</span>
                    </div>
                    {scans.map(scan => (
                        <div key={scan._id} className="ht-row">
                            <span className="ht-repo">📦 {scan.repoName}</span>
                            <span className="ht-source">{scan.repoSource === 'github' ? '🔗 GitHub' : '📁 ZIP'}</span>
                            <span style={{ color: statusColor[scan.status] || '#888', fontSize: 12, fontWeight: 600 }}>{scan.status}</span>
                            <span>{scan.metrics?.totalIssues ?? '—'}</span>
                            <span>{scan.metrics?.qualityScore ?? '—'}</span>
                            <span className="ht-date">{new Date(scan.createdAt).toLocaleDateString()}</span>
                            <button
                                className="btn-outline view-btn"
                                onClick={() => navigate(`/scan/${scan._id}`)}
                                disabled={scan.status !== 'completed'}
                            >View</button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
