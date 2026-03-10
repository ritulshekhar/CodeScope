import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import MetricCard from '../components/MetricCard';
import BarChart from '../components/BarChart';
import ScanProgress from '../components/ScanProgress';
import './Dashboard.css';

const SEVERITY_COLORS = { High: '#ff4d6d', Medium: '#ffd166', Low: '#06d6a0' };

const RECOMMENDED_ACTIONS = [
    { icon: '◌', title: 'Improve code readability by refactoring large and complex methods.' },
    { icon: '⊟', title: 'Reduce Conditional Nesting' },
    { icon: '⵿', title: 'Remove Unused Imports & Variables' },
    { icon: '↗', title: 'Optimize Loop Performance' },
    { icon: '🔒', title: 'Improve Security & Error Handling' },
];

const ITEMS_PER_PAGE = 7;

function formatLOC(n) {
    if (!n) return '0';
    return n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n);
}

export default function Dashboard() {
    const { token } = useAuth();
    const navigate = useNavigate();
    const [githubUrl, setGithubUrl] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [scanning, setScanning] = useState(false);
    const [scanId, setScanId] = useState(null);
    const [scanData, setScanData] = useState(null);
    const [issues, setIssues] = useState([]);
    const [error, setError] = useState('');
    const [page, setPage] = useState(1);
    const [filterSeverity, setFilterSeverity] = useState('All');
    const [filterLang, setFilterLang] = useState('All');
    const pollRef = useRef(null);
    const fileRef = useRef(null);

    const headers = { Authorization: `Bearer ${token}` };

    const fetchScan = useCallback(async (id) => {
        const { data } = await axios.get(`http://localhost:5000/api/scans/${id}`, { headers });
        setScanData(data.scan);
        setIssues(data.issues || []);
    }, [token]);

    // Poll for scan completion
    const startPolling = useCallback((id) => {
        pollRef.current = setInterval(async () => {
            try {
                const { data } = await axios.get(`http://localhost:5000/api/scans/${id}/status`, { headers });
                if (data.status === 'completed' || data.status === 'failed') {
                    clearInterval(pollRef.current);
                    setScanning(false);
                    if (data.status === 'completed') await fetchScan(id);
                    else setError('Scan failed. Please try again.');
                }
            } catch { clearInterval(pollRef.current); setScanning(false); }
        }, 2000);
    }, [token, fetchScan]);

    useEffect(() => () => clearInterval(pollRef.current), []);

    const handleGithubScan = async () => {
        if (!githubUrl.trim()) return setError('Please enter a GitHub URL');
        setError(''); setScanning(true); setScanData(null); setIssues([]);
        try {
            const { data } = await axios.post('http://localhost:5000/api/scans/github', { url: githubUrl }, { headers });
            setScanId(data.scanId);
            startPolling(data.scanId);
        } catch (err) {
            setScanning(false);
            setError(err.response?.data?.message || 'Failed to start scan');
        }
    };

    const handleZipScan = async () => {
        if (!selectedFile) return setError('Please select a ZIP file');
        setError(''); setScanning(true); setScanData(null); setIssues([]);
        const fd = new FormData(); fd.append('file', selectedFile);
        try {
            const { data } = await axios.post('http://localhost:5000/api/scans/upload', fd, { headers, 'Content-Type': 'multipart/form-data' });
            setScanId(data.scanId);
            startPolling(data.scanId);
        } catch (err) {
            setScanning(false);
            setError(err.response?.data?.message || 'Failed to start scan');
        }
    };

    const metrics = scanData?.metrics || {};
    const langDist = metrics.languageDistribution || {};
    const trend = metrics.issueTrend || [];

    // Filter issues
    const filteredIssues = issues.filter(issue => {
        if (filterSeverity !== 'All' && issue.severity !== filterSeverity) return false;
        if (filterLang !== 'All' && issue.language !== filterLang) return false;
        return true;
    });
    const totalPages = Math.ceil(filteredIssues.length / ITEMS_PER_PAGE);
    const pagedIssues = filteredIssues.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
    const allLangs = ['All', ...new Set(issues.map(i => i.language).filter(Boolean))];

    return (
        <div className="dashboard">
            {/* Scan Input Section */}
            <section className="scan-section">
                <h1 className="scan-title">Repository Overview</h1>
                <div className="scan-inputs">
                    <div className="scan-github">
                        <div className="scan-input-wrap">
                            <span className="scan-icon">🔗</span>
                            <input
                                className="scan-github-input"
                                placeholder="Paste GitHub repository URL (e.g. https://github.com/user/repo)"
                                value={githubUrl}
                                onChange={e => setGithubUrl(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleGithubScan()}
                            />
                        </div>
                        <button className="btn-primary" onClick={handleGithubScan} disabled={scanning}>
                            {scanning ? <><span className="spin">⟳</span> Scanning…</> : '🚀 Start Scan'}
                        </button>
                    </div>
                    <div className="scan-divider"><span>or</span></div>
                    <div className="scan-zip">
                        <input ref={fileRef} type="file" accept=".zip" style={{ display: 'none' }} onChange={e => setSelectedFile(e.target.files[0])} />
                        <button className="btn-outline" onClick={() => fileRef.current.click()}>
                            📁 {selectedFile ? selectedFile.name : 'Upload ZIP file'}
                        </button>
                        {selectedFile && <button className="btn-primary" onClick={handleZipScan} disabled={scanning}>Analyze</button>}
                    </div>
                </div>
                {error && <div className="scan-error">⚠️ {error}</div>}
            </section>

            {/* ScanProgress — Stateful Class Component: manages step progression via this.state + lifecycle methods */}
            {scanning && <ScanProgress active={scanning} />}

            {scanData && (
                <>
                    {/* Metric Cards */}
                    <div className="metrics-grid">
                        <MetricCard title="Total Lines of Code" value={formatLOC(metrics.totalLoc)} subtitle={`+12% increase since previous scan`} />
                        <MetricCard title="Total Issues Detected" value={metrics.totalIssues} subtitle={(Object.keys(langDist).slice(0, 3).join(', ')) || 'Multiple languages'} />
                        <MetricCard title="High Risk Files" value={metrics.highRiskFiles || 0} subtitle="High complexity files" />
                        <MetricCard title="Overall Code Quality Score" value={metrics.qualityScore || 0} subtitle={metrics.qualityScore >= 80 ? '1% improvement' : 'Needs improvement'} />
                    </div>

                    {/* Charts */}
                    <div className="charts-section">
                        <h2 className="section-title">Codebase Analytics</h2>
                        <div className="charts-grid">
                            <div className="chart-card card">
                                <div className="chart-header">
                                    <div>
                                        <div className="chart-label">Code Distribution by Programming Language</div>
                                        <div className="chart-big-label">Distribution <span className="chart-sub">Last updated today</span></div>
                                    </div>
                                    <button className="mc-menu">•••</button>
                                </div>
                                <div className="chart-wrap">
                                    <BarChart
                                        labels={Object.keys(langDist).map(l => l.length > 8 ? l.slice(0, 8) + '…' : l)}
                                        data={Object.values(langDist)}
                                        label="Files"
                                    />
                                </div>
                            </div>
                            <div className="chart-card card">
                                <div className="chart-header">
                                    <div>
                                        <div className="chart-label">Issue Trend Over Time</div>
                                        <div className="chart-big-label">Trend <span className="chart-sub">+3% increase this week</span></div>
                                    </div>
                                    <button className="mc-menu">•••</button>
                                </div>
                                <div className="chart-wrap">
                                    <BarChart
                                        labels={trend.map(t => t.day)}
                                        data={trend.map(t => t.count)}
                                        label="Issues"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Issues List */}
                    <div className="issues-section">
                        <div className="issues-header">
                            <h2 className="section-title" style={{ marginBottom: 0 }}>
                                {filteredIssues.length} Issues Found in Current Scan
                            </h2>
                            {scanId && (
                                <button className="btn-outline" onClick={() => navigate(`/scan/${scanId}`)}>Full Report →</button>
                            )}
                        </div>

                        <div className="issues-filters">
                            <select className="filter-select" value={filterSeverity} onChange={e => { setFilterSeverity(e.target.value); setPage(1); }}>
                                <option value="All">Severity Level ▾</option>
                                <option value="High">High</option>
                                <option value="Medium">Medium</option>
                                <option value="Low">Low</option>
                            </select>
                            <select className="filter-select" value={filterLang} onChange={e => { setFilterLang(e.target.value); setPage(1); }}>
                                {allLangs.map(l => <option key={l} value={l}>{l === 'All' ? 'Language ▾' : l}</option>)}
                            </select>
                            <select className="filter-select" defaultValue="All">
                                <option value="All">Risk Category ▾</option>
                                <option value="High">High Risk</option>
                                <option value="Medium">Medium Risk</option>
                                <option value="Low">Low Risk</option>
                            </select>
                        </div>

                        <div className="issues-list">
                            {pagedIssues.length === 0 ? (
                                <div className="issues-empty">No issues match the current filters.</div>
                            ) : (
                                pagedIssues.map((issue, i) => (
                                    <div key={i} className="issue-item">
                                        <div className="issue-file">File: <strong>{issue.filePath}</strong></div>
                                        <div className="issue-desc">Issue: {issue.description}</div>
                                        <span className={`issue-severity`} style={{ color: SEVERITY_COLORS[issue.severity] || '#888' }}>
                                            {issue.severity}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="pagination">
                                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
                                    <button key={p} className={`page-btn ${page === p ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
                                ))}
                                {page < totalPages && (
                                    <button className="page-btn page-next" onClick={() => setPage(p => Math.min(p + 1, totalPages))}>›</button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Recommended Actions */}
                    <div className="actions-section">
                        <h2 className="section-title">💡 Recommended Actions</h2>
                        <div className="actions-grid">
                            {RECOMMENDED_ACTIONS.map((a, i) => (
                                <div key={i} className={`action-card card ${i >= 3 ? 'action-wide' : ''}`}>
                                    <div className="action-icon">{a.icon}</div>
                                    <div className="action-title">{a.title}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {/* Empty state if no scan yet */}
            {!scanning && !scanData && (
                <div className="empty-state">
                    <div className="empty-icon">🔍</div>
                    <h3>No analysis yet</h3>
                    <p>Enter a GitHub repo URL above or upload a ZIP to start your first code quality scan.</p>
                </div>
            )}
        </div>
    );
}
