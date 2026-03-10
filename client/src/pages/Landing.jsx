import { Link } from 'react-router-dom';
import './Landing.css';

const features = [
    { icon: '📊', title: 'Lines of Code', desc: 'Accurate LOC counting across all supported languages' },
    { icon: '🔄', title: 'Cyclomatic Complexity', desc: 'Measure code complexity and identify hot spots' },
    { icon: '🐛', title: 'Issue Detection', desc: 'Detect console.log, empty catch, long methods, deep nesting and more' },
    { icon: '⚠️', title: 'Risk Analysis', desc: 'Score every file as Low, Medium, or High risk' },
    { icon: '📈', title: 'Trend Charts', desc: 'Track issue trends over multiple scans' },
    { icon: '🔍', title: 'File Explorer', desc: 'Browse all files with risk badges and per-file metrics' },
];

export default function Landing() {
    return (
        <div className="landing">
            {/* Hero */}
            <section className="hero">
                <div className="hero-badge">✳ Code Quality Platform</div>
                <h1 className="hero-title">
                    Analyze Your Code.<br />
                    <span className="accent">Fix Issues. Ship Better.</span>
                </h1>
                <p className="hero-subtitle">
                    Upload a GitHub repo or a ZIP file and get an instant professional code quality report —
                    metrics, issues, risk analysis, and actionable recommendations.
                </p>
                <div className="hero-actions">
                    <Link to="/register" className="btn-primary">🚀 Start Free Scan</Link>
                    <Link to="/login" className="btn-outline">Sign in</Link>
                </div>

                {/* Mock dashboard preview */}
                <div className="hero-preview">
                    <div className="preview-bar">
                        <span className="dot red" /><span className="dot yellow" /><span className="dot green" />
                        <span className="preview-url">nlp-bug-finder.app/dashboard</span>
                    </div>
                    <div className="preview-mock">
                        <div className="preview-metric"><span className="metric-val accent">12.4k</span><span className="metric-lbl">Lines of Code</span></div>
                        <div className="preview-metric"><span className="metric-val red">567</span><span className="metric-lbl">Issues Found</span></div>
                        <div className="preview-metric"><span className="metric-val orange">12</span><span className="metric-lbl">High Risk Files</span></div>
                        <div className="preview-metric"><span className="metric-val accent">85</span><span className="metric-lbl">Quality Score</span></div>
                    </div>
                    <div className="preview-bar-chart">
                        {[400, 220, 120, 80, 60, 50].map((h, i) => (
                            <div key={i} className="preview-bar-item" style={{ height: `${h / 5}px` }} />
                        ))}
                    </div>
                </div>
            </section>

            {/* Features */}
            <section className="features-section">
                <h2 className="section-title" style={{ justifyContent: 'center', fontSize: 28, marginBottom: 48 }}>
                    Everything you need to improve code quality
                </h2>
                <div className="features-grid">
                    {features.map((f, i) => (
                        <div key={i} className="card feature-card animate-fade" style={{ animationDelay: `${i * 0.1}s` }}>
                            <div className="feature-icon">{f.icon}</div>
                            <h3 className="feature-title">{f.title}</h3>
                            <p className="feature-desc">{f.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* CTA */}
            <section className="cta-section">
                <h2>Ready to analyze your codebase?</h2>
                <p>Join thousands of developers who ship cleaner code.</p>
                <Link to="/register" className="btn-primary" style={{ fontSize: 16, padding: '14px 36px' }}>
                    Get Started — It's Free
                </Link>
            </section>
        </div>
    );
}
