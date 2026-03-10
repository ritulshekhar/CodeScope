import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import './ScanReport.css';

const RISK_COLORS = { High: '#ff4d6d', Medium: '#ffd166', Low: '#06d6a0' };
const SEV_COLORS = { High: '#ff4d6d', Medium: '#ffd166', Low: '#06d6a0' };

export default function ScanReport() {
    const { id } = useParams();
    const { token } = useAuth();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [expandedFile, setExpandedFile] = useState(null);

    useEffect(() => {
        axios.get(`http://localhost:5000/api/scans/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
        }).then(res => { setData(res.data); setLoading(false); })
            .catch(() => { setLoading(false); });
    }, [id, token]);

    if (loading) return <div className="report-loading"><span className="spin" style={{ fontSize: 32 }}>⟳</span><p>Loading report…</p></div>;
    if (!data) return <div className="report-loading"><p>Report not found.</p><button className="btn-outline" onClick={() => navigate('/dashboard')}>← Dashboard</button></div>;

    const { scan, issues } = data;
    const m = scan.metrics || {};

    return (
        <div className="scan-report">
            <div className="report-header">
                <button className="btn-outline back-btn" onClick={() => navigate('/dashboard')}>← Dashboard</button>
                <div>
                    <h1 className="report-title">📊 {scan.repoName}</h1>
                    <div className="report-meta">
                        <span className="badge badge-{scan.status === 'completed' ? 'low' : 'high'}">{scan.status}</span>
                        <span className="report-date">{new Date(scan.createdAt).toLocaleString()}</span>
                        <span className="report-source">{scan.repoSource === 'github' ? '🔗 GitHub' : '📁 ZIP Upload'}</span>
                    </div>
                </div>
            </div>

            {/* Summary cards */}
            <div className="report-metrics">
                {[
                    { label: 'Total LOC', val: m.totalLoc?.toLocaleString() },
                    { label: 'Total Files', val: m.totalFiles },
                    { label: 'Total Issues', val: m.totalIssues },
                    { label: 'High Risk Files', val: m.highRiskFiles },
                    { label: 'Quality Score', val: m.qualityScore },
                ].map((item, i) => (
                    <div key={i} className="card report-metric-card">
                        <div className="rmc-label">{item.label}</div>
                        <div className="rmc-val">{item.val ?? '—'}</div>
                    </div>
                ))}
            </div>

            {/* File explorer */}
            <section className="report-section">
                <h2 className="section-title">📁 File Explorer</h2>
                <div className="file-table">
                    <div className="file-table-header">
                        <span>File</span><span>Language</span><span>LOC</span><span>Complexity</span><span>Issues</span><span>Risk</span>
                    </div>
                    {(scan.files || []).map((f, i) => (
                        <div key={i}>
                            <div className={`file-row ${expandedFile === i ? 'expanded' : ''}`} onClick={() => setExpandedFile(expandedFile === i ? null : i)}>
                                <span className="file-path">📄 {f.filePath}</span>
                                <span>{f.language}</span>
                                <span>{f.loc}</span>
                                <span>{f.complexity}</span>
                                <span>{f.issueCount}</span>
                                <span className="risk-badge" style={{ color: RISK_COLORS[f.riskLevel] }}>{f.riskLevel}</span>
                            </div>
                            {expandedFile === i && (
                                <div className="file-issues">
                                    {issues.filter(iss => iss.filePath === f.filePath).length === 0 ? (
                                        <div className="no-issue">No issues detected</div>
                                    ) : (
                                        issues.filter(iss => iss.filePath === f.filePath).map((iss, j) => (
                                            <div key={j} className="file-issue-item">
                                                <span style={{ color: SEV_COLORS[iss.severity], fontWeight: 600, fontSize: 12 }}>{iss.severity}</span>
                                                <span>{iss.description}</span>
                                                {iss.line > 0 && <span className="issue-line">L{iss.line}</span>}
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </section>

            {/* All issues */}
            <section className="report-section">
                <h2 className="section-title">🐛 All Issues ({issues.length})</h2>
                <div className="all-issues">
                    {issues.slice(0, 100).map((iss, i) => (
                        <div key={i} className="issue-item">
                            <div className="issue-file">File: <strong>{iss.filePath}</strong></div>
                            <div className="issue-desc">Issue: {iss.description}</div>
                            <span className="issue-severity" style={{ color: SEV_COLORS[iss.severity] }}>{iss.severity}</span>
                        </div>
                    ))}
                    {issues.length > 100 && <div style={{ textAlign: 'center', padding: 16, color: 'var(--text-muted)', fontSize: 13 }}>Showing first 100 of {issues.length} issues</div>}
                </div>
            </section>
        </div>
    );
}
