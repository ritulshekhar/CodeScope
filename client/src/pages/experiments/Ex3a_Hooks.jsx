import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import './ExpPage.css';

function TimerDemo() {
    const [seconds, setSeconds] = useState(0);
    const [running, setRunning] = useState(false);
    const [fetchData, setFetchData] = useState(null);
    const [fetchLoading, setFetchLoading] = useState(false);
    const [inputVal, setInputVal] = useState('');
    const [debouncedVal, setDebouncedVal] = useState('');
    const logs = useRef([]);
    const [logDisplay, setLogDisplay] = useState([]);

    const addLog = (msg) => {
        logs.current = [`[${new Date().toLocaleTimeString()}] ${msg}`, ...logs.current].slice(0, 8);
        setLogDisplay([...logs.current]);
    };

    // useEffect: timer
    useEffect(() => {
        if (!running) return;
        const interval = setInterval(() => {
            setSeconds(s => s + 1);
        }, 1000);
        addLog('⏱ Timer started (setInterval created)');
        return () => {
            clearInterval(interval);
            addLog('🧹 Cleanup: setInterval cleared');
        };
    }, [running]);

    // useEffect: debounce input
    useEffect(() => {
        if (!inputVal) return;
        const timeout = setTimeout(() => setDebouncedVal(inputVal), 500);
        return () => clearTimeout(timeout);
    }, [inputVal]);

    // useEffect: simulated data fetch
    const simulateFetch = () => {
        setFetchLoading(true);
        setFetchData(null);
        addLog('🌐 useEffect: fetching data...');
        setTimeout(() => {
            setFetchData({ repos: 42, issues: 567, score: 85 });
            setFetchLoading(false);
            addLog('✅ Data fetched successfully');
        }, 1500);
    };

    const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

    return (
        <div className="demo-box">
            <div className="demo-title">🔴 Live Demo — useState & useEffect</div>

            {/* Timer */}
            <div style={{ marginBottom: 28 }}>
                <h4 style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 12 }}>⏱ useState counter + useEffect interval</h4>
                <div className="demo-counter" style={{ fontSize: 52 }}>{fmt(seconds)}</div>
                <div className="demo-btns">
                    <button className="demo-btn primary" onClick={() => setRunning(r => !r)}>{running ? '⏸ Pause' : '▶ Start'}</button>
                    <button className="demo-btn" onClick={() => { setSeconds(0); setRunning(false); addLog('Reset timer'); }}>↺ Reset</button>
                </div>
            </div>

            {/* Simulated fetch */}
            <div style={{ marginBottom: 28 }}>
                <h4 style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 12 }}>🌐 useEffect data fetch simulation</h4>
                <button className="demo-btn primary" onClick={simulateFetch} disabled={fetchLoading}>
                    {fetchLoading ? <><span className="spin">⟳</span> Fetching…</> : '📡 Simulate API Fetch'}
                </button>
                {fetchData && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 12 }}>
                        {Object.entries(fetchData).map(([k, v]) => (
                            <div key={k} className="card" style={{ padding: '12px', textAlign: 'center' }}>
                                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent)' }}>{v}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{k}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Debounce */}
            <div style={{ marginBottom: 20 }}>
                <h4 style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 12 }}>⌨️ Debounced input with useEffect</h4>
                <input
                    className="demo-input"
                    placeholder="Type something (debounced 500ms)..."
                    value={inputVal}
                    onChange={e => setInputVal(e.target.value)}
                />
                {debouncedVal && <p style={{ fontSize: 13, color: 'var(--accent)', marginTop: 8 }}>Debounced: "{debouncedVal}"</p>}
            </div>

            {/* Logs */}
            <div className="demo-log">
                {logDisplay.map((l, i) => <p key={i}>{l}</p>)}
                {logDisplay.length === 0 && <p style={{ color: 'var(--text-dim)' }}>useEffect events will appear here...</p>}
            </div>
        </div>
    );
}

const code = `// useState — reactive counter
const [count, setCount] = useState(0);
const [running, setRunning] = useState(false);

// useEffect — runs side-effects when dependencies change
useEffect(() => {
  if (!running) return;               // skip if paused
  const interval = setInterval(() => {
    setCount(c => c + 1);
  }, 1000);
  
  // Cleanup: runs on unmount OR before next effect
  return () => clearInterval(interval);
}, [running]);   // ← dependency array

// useEffect — data fetching pattern
useEffect(() => {
  fetch('/api/data')
    .then(res => res.json())
    .then(data => setData(data));
}, []);  // ← empty array = run once on mount`;

export default function Ex3a_Hooks() {
    return (
        <div className="exp-page">
            <div className="exp-page-header">
                <Link to="/experiments" className="btn-outline back-link">← Experiments</Link>
                <div className="exp-page-meta">
                    <span className="exp-tag-sm">Ex No: 3a</span>
                    <span className="exp-date-sm">Date: 3-2-2026</span>
                </div>
            </div>

            <h1 className="exp-page-title">React Hooks — useState & useEffect</h1>
            <p className="exp-page-subtitle">
                Hooks let functional components use React features. <code>useState</code> adds reactive state; <code>useEffect</code>
                runs side effects (timers, fetch, subscriptions) and optionally returns a cleanup function.
            </p>

            <TimerDemo />

            <section className="exp-section">
                <h2 className="exp-section-title">📝 Program Code</h2>
                <div className="code-block"><pre>{code}</pre></div>
            </section>

            <section className="exp-section">
                <h2 className="exp-section-title">📋 Hook Reference</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    {[
                        { hook: 'useState(initial)', desc: 'Returns [value, setter]. Calling setter triggers re-render.' },
                        { hook: 'useEffect(fn, [])', desc: 'Runs fn once on mount. Empty array = no dependencies.' },
                        { hook: 'useEffect(fn, [dep])', desc: 'Runs fn whenever dep changes (after render).' },
                        { hook: 'useEffect(fn)', desc: 'Runs fn after every render (no dependency array).' },
                        { hook: 'return () => {...}', desc: 'Cleanup function: clears intervals, subscriptions, timers.' },
                        { hook: 'setState(prev => ...)', desc: 'Functional update: use prev value to compute next value.' },
                    ].map((c, i) => (
                        <div key={i} className="card" style={{ padding: '14px 18px' }}>
                            <code style={{ color: 'var(--accent)', fontFamily: 'monospace', fontSize: 12 }}>{c.hook}</code>
                            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>{c.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            <div className="exp-result">
                <h3>✅ Output</h3>
                <div className="code-block result-block">
                    <pre>{`// When Start is clicked:
// → useEffect fires, setInterval created, timer increments every second
// When Pause is clicked:
// → useEffect cleanup fires, clearInterval called, timer stops
// When fetch runs:
// → state: loading = true → data arrives → loading = false, data displayed`}</pre>
                </div>
            </div>
        </div>
    );
}
