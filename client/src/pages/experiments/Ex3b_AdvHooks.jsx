import { createContext, useContext, useReducer, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import './ExpPage.css';

// ─── useContext: Theme Context ─────────────────────────────────────
const ThemeContext = createContext('dark');

function ThemedCard() {
    const theme = useContext(ThemeContext);
    const styles = {
        dark: { background: '#181c28', color: '#e6eaf4', border: '1px solid #252a3a' },
        light: { background: '#f0f4f8', color: '#1a202c', border: '1px solid #e2e8f0' },
        green: { background: '#0d2b1a', color: '#b5f23d', border: '1px solid #1a5c2a' },
    };
    return (
        <div className="theme-preview" style={styles[theme] || styles.dark}>
            🎨 Current theme: <strong>{theme}</strong><br />
            <small style={{ opacity: 0.6, fontSize: 12 }}>This component consumes ThemeContext via useContext()</small>
        </div>
    );
}

// ─── useReducer: Todo list ─────────────────────────────────────────
function todoReducer(state, action) {
    switch (action.type) {
        case 'ADD': return [...state, { id: Date.now(), text: action.text, done: false }];
        case 'TOGGLE': return state.map(t => t.id === action.id ? { ...t, done: !t.done } : t);
        case 'DELETE': return state.filter(t => t.id !== action.id);
        default: return state;
    }
}

function TodoApp() {
    const [todos, dispatch] = useReducer(todoReducer, [
        { id: 1, text: 'Review code analyzer output', done: true },
        { id: 2, text: 'Fix high severity issues', done: false },
        { id: 3, text: 'Deploy to production', done: false },
    ]);
    const [input, setInput] = useState('');

    const addTodo = () => {
        if (!input.trim()) return;
        dispatch({ type: 'ADD', text: input });
        setInput('');
    };

    return (
        <div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                <input
                    className="demo-input"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="Add a todo..."
                    onKeyDown={e => e.key === 'Enter' && addTodo()}
                    style={{ flex: 1 }}
                />
                <button className="demo-btn primary" onClick={addTodo}>+ Add</button>
            </div>
            <ul className="todo-list">
                {todos.map(t => (
                    <li key={t.id} className="todo-item">
                        <input type="checkbox" checked={t.done} onChange={() => dispatch({ type: 'TOGGLE', id: t.id })} />
                        <span style={{ flex: 1 }} className={t.done ? 'todo-done' : ''}>{t.text}</span>
                        <button onClick={() => dispatch({ type: 'DELETE', id: t.id })}
                            style={{ background: 'none', color: '#ff4d6d', fontSize: 16, padding: '0 4px', border: 'none', cursor: 'pointer' }}>✕</button>
                    </li>
                ))}
            </ul>
            <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 8 }}>{todos.filter(t => t.done).length}/{todos.length} completed</p>
        </div>
    );
}

// ─── useRef: DOM + interval ref ────────────────────────────────────
function RefDemo() {
    const inputRef = useRef(null);
    const counterRef = useRef(0);
    const [display, setDisplay] = useState(0);

    const focusInput = () => inputRef.current?.focus();
    const increment = () => {
        counterRef.current += 1;
        setDisplay(counterRef.current);
    };

    return (
        <div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                <input ref={inputRef} className="demo-input" placeholder="This input has a DOM ref..." style={{ flex: 1 }} />
                <button className="demo-btn primary" onClick={focusInput}>Focus Input</button>
            </div>
            <div className="ref-display">
                inputRef.current = {`<input type="text" />`}<br />
                counterRef.current = <strong>{display}</strong> (no re-render on change!)
            </div>
            <div className="demo-btns" style={{ marginTop: 14 }}>
                <button className="demo-btn" onClick={increment}>Increment Ref Counter ({display})</button>
                <button className="demo-btn" onClick={() => { counterRef.current = 0; setDisplay(0); }}>Reset</button>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10 }}>
                useRef doesn't cause re-renders — it's a mutable container that persists across renders.
            </p>
        </div>
    );
}

const code = `// ─── useContext ───────────────────────────────────
const ThemeContext = createContext('dark');

function App() {
  const [theme, setTheme] = useState('dark');
  return (
    <ThemeContext.Provider value={theme}>
      <ThemedCard />   {/* Can access theme without props */}
    </ThemeContext.Provider>
  );
}

function ThemedCard() {
  const theme = useContext(ThemeContext);  // Read from context
  return <div style={styles[theme]}>Theme: {theme}</div>;
}

// ─── useReducer ───────────────────────────────────
function reducer(state, action) {
  switch (action.type) {
    case 'ADD':    return [...state, { id: Date.now(), text: action.text }];
    case 'DELETE': return state.filter(t => t.id !== action.id);
    default:       return state;
  }
}
const [todos, dispatch] = useReducer(reducer, []);
dispatch({ type: 'ADD', text: 'New todo' });

// ─── useRef ───────────────────────────────────────
const inputRef = useRef(null);
inputRef.current.focus();   // Direct DOM access

const count = useRef(0);    // Mutable value, no re-render
count.current++;`;

export default function Ex3b_AdvHooks() {
    const [theme, setTheme] = useState('dark');

    return (
        <div className="exp-page">
            <div className="exp-page-header">
                <Link to="/experiments" className="btn-outline back-link">← Experiments</Link>
                <div className="exp-page-meta">
                    <span className="exp-tag-sm">Ex No: 3b</span>
                    <span className="exp-date-sm">Date: 11-3-2026</span>
                </div>
            </div>

            <h1 className="exp-page-title">Advanced Hooks — useContext, useReducer & useRef</h1>
            <p className="exp-page-subtitle">
                <code>useContext</code> eliminates prop drilling for global state. <code>useReducer</code> handles
                complex state with a predictable reducer pattern. <code>useRef</code> gives direct DOM access or
                holds mutable values without triggering re-renders.
            </p>

            {/* useContext Demo */}
            <div className="demo-box" style={{ marginBottom: 20 }}>
                <div className="demo-title">🎨 useContext — Theme Provider</div>
                <div className="demo-btns" style={{ marginBottom: 16 }}>
                    {['dark', 'light', 'green'].map(t => (
                        <button key={t} className={`demo-btn ${theme === t ? 'primary' : ''}`} onClick={() => setTheme(t)}>
                            {t}
                        </button>
                    ))}
                </div>
                <ThemeContext.Provider value={theme}>
                    <ThemedCard />
                </ThemeContext.Provider>
            </div>

            {/* useReducer Demo */}
            <div className="demo-box" style={{ marginBottom: 20 }}>
                <div className="demo-title">📋 useReducer — Todo List</div>
                <TodoApp />
            </div>

            {/* useRef Demo */}
            <div className="demo-box" style={{ marginBottom: 20 }}>
                <div className="demo-title">🔗 useRef — DOM Reference & Mutable Values</div>
                <RefDemo />
            </div>

            <section className="exp-section">
                <h2 className="exp-section-title">📝 Program Code</h2>
                <div className="code-block"><pre>{code}</pre></div>
            </section>

            <section className="exp-section">
                <h2 className="exp-section-title">📋 Hook Comparison</h2>
                <div className="card lib-table">
                    <div className="lib-header"><span>Hook</span><span>Triggers Re-render?</span><span>Use Case</span></div>
                    {[
                        { hook: 'useContext', re: 'Yes', use: 'Share global state (auth, theme, locale) without prop drilling' },
                        { hook: 'useReducer', re: 'Yes', use: 'Complex state logic — alternative to useState + multiple setters' },
                        { hook: 'useRef', re: 'No', use: 'DOM access, persisting mutable values, storing interval/timer IDs' },
                    ].map((r, i) => (
                        <div key={i} className="lib-row">
                            <span className="lib-name">{r.hook}</span>
                            <span className={r.re === 'Yes' ? 'lib-ver' : ''} style={{ color: r.re === 'Yes' ? '#06d6a0' : '#ff4d6d', fontWeight: 600, fontSize: 12 }}>{r.re}</span>
                            <span className="lib-desc">{r.use}</span>
                        </div>
                    ))}
                </div>
            </section>

            <div className="exp-result">
                <h3>✅ Output</h3>
                <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 12 }}>
                    Clicking theme buttons re-renders ThemedCard with the new background/colors via ThemeContext.
                    The todo list handles add/toggle/delete via dispatch actions. The ref demo shows direct DOM focus
                    and a mutable counter that persists without causing extra re-renders.
                </p>
            </div>
        </div>
    );
}
