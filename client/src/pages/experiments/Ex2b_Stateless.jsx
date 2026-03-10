import { Component } from 'react';
import { Link } from 'react-router-dom';
import './ExpPage.css';

// ─── Stateless (Functional) Component ─────────────────────────────
function UserCard({ name, role, score, language }) {
    const color = score >= 80 ? '#06d6a0' : score >= 60 ? '#ffd166' : '#ff4d6d';
    return (
        <div className="card" style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>👤</div>
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{name}</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>{role}</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, background: 'var(--surface)', padding: '4px 10px', borderRadius: 6, color: 'var(--text-muted)' }}>
                    Language: <strong style={{ color: 'var(--accent)' }}>{language}</strong>
                </span>
                <span style={{ fontSize: 12, background: 'var(--surface)', padding: '4px 10px', borderRadius: 6, color }}>
                    Score: <strong>{score}</strong>
                </span>
            </div>
        </div>
    );
}

function StatsList({ stats }) {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {stats.map((s, i) => (
                <div key={i} className="card" style={{ padding: '18px', textAlign: 'center' }}>
                    <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--accent)' }}>{s.value}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{s.label}</div>
                </div>
            ))}
        </div>
    );
}

const code = `// Stateless functional component — accepts props, no state
function UserCard({ name, role, score, language }) {
  const color = score >= 80 ? 'green' : score >= 60 ? 'yellow' : 'red';
  return (
    <div className="card">
      <h3>{name}</h3>
      <p>{role}</p>
      <span>Language: {language}</span>
      <span style={{ color }}>Score: {score}</span>
    </div>
  );
}

// Usage
<UserCard
  name="Alice Johnson"
  role="Senior Developer"
  score={92}
  language="JavaScript"
/>`;

const users = [
    { name: 'Alice Johnson', role: 'Senior Developer', score: 92, language: 'JavaScript' },
    { name: 'Bob Smith', role: 'Python Engineer', score: 74, language: 'Python' },
    { name: 'Carol White', role: 'Java Developer', score: 55, language: 'Java' },
];

export default function Ex2b_Stateless() {
    return (
        <div className="exp-page">
            <div className="exp-page-header">
                <Link to="/experiments" className="btn-outline back-link">← Experiments</Link>
                <div className="exp-page-meta">
                    <span className="exp-tag-sm">Ex No: 2b</span>
                    <span className="exp-date-sm">Date: 27-1-2026</span>
                </div>
            </div>

            <h1 className="exp-page-title">Stateless Class Component</h1>
            <p className="exp-page-subtitle">
                A <strong>stateless component</strong> (also called a pure or functional component) receives data via <code>props</code>
                and renders UI without managing any internal state. It is predictable and easy to test.
            </p>

            {/* Live Demo */}
            <div className="demo-box">
                <div className="demo-title">🔴 Live Demo — Stateless Components Rendering from Props</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
                    {users.map((u, i) => <UserCard key={i} {...u} />)}
                </div>
                <StatsList stats={[
                    { label: 'Total Users', value: users.length },
                    { label: 'Avg Score', value: Math.round(users.reduce((a, u) => a + u.score, 0) / users.length) },
                    { label: 'Languages', value: new Set(users.map(u => u.language)).size },
                ]} />
            </div>

            <section className="exp-section">
                <h2 className="exp-section-title">📝 Program Code</h2>
                <div className="code-block"><pre>{code}</pre></div>
            </section>

            <section className="exp-section">
                <h2 className="exp-section-title">📋 Props Passed</h2>
                <div className="card lib-table">
                    <div className="lib-header"><span>Prop</span><span>Type</span><span>Description</span></div>
                    {[
                        { prop: 'name', type: 'string', desc: 'Developer\'s full name' },
                        { prop: 'role', type: 'string', desc: 'Job title or specialization' },
                        { prop: 'score', type: 'number', desc: 'Code quality score (0–100)' },
                        { prop: 'language', type: 'string', desc: 'Primary programming language' },
                    ].map((p, i) => (
                        <div key={i} className="lib-row">
                            <span className="lib-name">{p.prop}</span>
                            <span className="lib-ver">{p.type}</span>
                            <span className="lib-desc">{p.desc}</span>
                        </div>
                    ))}
                </div>
            </section>

            <div className="exp-result">
                <h3>✅ Output</h3>
                <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 12 }}>
                    Three UserCard components are rendered from a props array. Each card displays the name, role, language, and a color-coded score (green ≥80, yellow ≥60, red below). StatsList shows aggregated stats derived from the same array — all without any state management.
                </p>
            </div>
        </div>
    );
}
