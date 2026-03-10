import { Component } from 'react';
import { Link } from 'react-router-dom';
import './ExpPage.css';

// ─── Stateful Class Component ───────────────────────────────────────
class CounterApp extends Component {
    constructor(props) {
        super(props);
        this.state = {
            count: 0,
            step: 1,
            history: [],
        };
        this.log = this.log.bind(this);
    }

    log(msg) {
        this.setState(prev => ({
            history: [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.history].slice(0, 8)
        }));
    }

    componentDidMount() { this.log('Component mounted'); }
    componentDidUpdate(_, prevState) {
        if (prevState.count !== this.state.count)
            this.log(`Count changed: ${prevState.count} → ${this.state.count}`);
    }
    componentWillUnmount() { this.log('Component will unmount'); }

    increment() { this.setState(s => ({ count: s.count + s.step })); }
    decrement() { this.setState(s => ({ count: s.count - s.step })); }
    reset() { this.setState({ count: 0 }); this.log('Counter reset'); }

    render() {
        const { count, step, history } = this.state;
        return (
            <div className="demo-box">
                <div className="demo-title">🔴 Live Demo — Stateful Class Component</div>
                <div className="demo-counter">{count}</div>
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                    <label style={{ fontSize: 13, color: 'var(--text-muted)', marginRight: 10 }}>Step size:</label>
                    <input
                        type="number"
                        value={step}
                        min={1}
                        onChange={e => this.setState({ step: parseInt(e.target.value) || 1 })}
                        style={{ width: 64, background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)', padding: '4px 8px', borderRadius: 6, fontFamily: 'inherit', fontSize: 14 }}
                    />
                </div>
                <div className="demo-btns">
                    <button className="demo-btn" onClick={() => this.decrement()}>- Decrement</button>
                    <button className="demo-btn primary" onClick={() => this.increment()}>+ Increment</button>
                    <button className="demo-btn" onClick={() => this.reset()}>↺ Reset</button>
                </div>
                <div className="demo-log" style={{ marginTop: 16 }}>
                    {history.map((h, i) => <p key={i}>{h}</p>)}
                    {history.length === 0 && <p style={{ color: 'var(--text-dim)' }}>Lifecycle events will appear here...</p>}
                </div>
            </div>
        );
    }
}

const code = `class CounterApp extends Component {
  constructor(props) {
    super(props);
    this.state = { count: 0, step: 1 };
  }

  componentDidMount() {
    console.log('Component mounted');
  }

  componentDidUpdate(_, prevState) {
    if (prevState.count !== this.state.count)
      console.log(\`Count changed: \${prevState.count} → \${this.state.count}\`);
  }

  componentWillUnmount() {
    console.log('Component will unmount');
  }

  increment() { this.setState(s => ({ count: s.count + s.step })); }
  decrement() { this.setState(s => ({ count: s.count - s.step })); }
  reset()     { this.setState({ count: 0 }); }

  render() {
    const { count, step } = this.state;
    return (
      <div>
        <h1>{count}</h1>
        <button onClick={() => this.decrement()}>- Decrement</button>
        <button onClick={() => this.increment()}>+ Increment</button>
        <button onClick={() => this.reset()}>↺ Reset</button>
      </div>
    );
  }
}`;

export default function Ex2a_Stateful() {
    return (
        <div className="exp-page">
            <div className="exp-page-header">
                <Link to="/experiments" className="btn-outline back-link">← Experiments</Link>
                <div className="exp-page-meta">
                    <span className="exp-tag-sm">Ex No: 2a</span>
                    <span className="exp-date-sm">Date: 27-1-2026</span>
                </div>
            </div>

            <h1 className="exp-page-title">Stateful Class Component</h1>
            <p className="exp-page-subtitle">
                A React <strong>stateful class component</strong> manages its own state using <code>this.state</code>
                and <code>this.setState()</code>. It has lifecycle methods like <code>componentDidMount</code>,
                <code>componentDidUpdate</code>, and <code>componentWillUnmount</code>.
            </p>

            {/* Live Demo */}
            <CounterApp />

            <section className="exp-section">
                <h2 className="exp-section-title">📝 Program Code</h2>
                <div className="code-block"><pre>{code}</pre></div>
            </section>

            <section className="exp-section">
                <h2 className="exp-section-title">📋 Key Concepts</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    {[
                        { name: 'this.state', desc: 'Object holding component-local reactive data' },
                        { name: 'this.setState()', desc: 'Schedules re-render with updated state values' },
                        { name: 'constructor(props)', desc: 'Called once; initialize state and bind methods here' },
                        { name: 'componentDidMount()', desc: 'Runs after first render — ideal for API calls' },
                        { name: 'componentDidUpdate()', desc: 'Runs after every update; compare prev vs new state' },
                        { name: 'render()', desc: 'Must return JSX; called on every state/prop change' },
                    ].map((c, i) => (
                        <div key={i} className="card" style={{ padding: '14px 18px' }}>
                            <code style={{ color: 'var(--accent)', fontFamily: 'monospace', fontSize: 13 }}>{c.name}</code>
                            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>{c.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            <div className="exp-result">
                <h3>✅ Output</h3>
                <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 12 }}>The counter displays the current count. Clicking Increment adds the step value; Decrement subtracts it. Reset brings it back to 0. Lifecycle events are logged in the console and the live log panel above.</p>
                <div className="code-block result-block">
                    <pre>{`// Console output:
Component mounted
Count changed: 0 → 1
Count changed: 1 → 2
Count changed: 2 → 0  (after reset)`}</pre>
                </div>
            </div>
        </div>
    );
}
