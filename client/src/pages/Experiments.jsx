import { Link } from 'react-router-dom';
import './Experiments.css';

const experiments = [
    { path: '/experiments/ex1', num: '01', date: '24-2-2026', title: 'Setting up MERN Environment', desc: 'Installation, configuration and setup of MongoDB, Express, React and Node.js development environment.', tag: 'Ex No: 1' },
    { path: '/experiments/ex2a', num: '02A', date: '27-1-2026', title: 'Stateful Class Component', desc: 'React stateful class component with lifecycle methods, state management, and event handling.', tag: 'Ex No: 2a' },
    { path: '/experiments/ex2b', num: '02B', date: '27-1-2026', title: 'Stateless Class Component', desc: 'React stateless (functional) class component demonstrating props usage and pure rendering.', tag: 'Ex No: 2b' },
    { path: '/experiments/ex3a', num: '03A', date: '3-2-2026', title: 'React Hooks — useState & useEffect', desc: 'Live demo of useState for reactive state and useEffect for side effects and lifecycle simulation.', tag: 'Ex No: 3a' },
    { path: '/experiments/ex3b', num: '03B', date: '11-3-2026', title: 'Advanced Hooks — useContext, useReducer, useRef', desc: 'Live demos of useContext for global state, useReducer for complex state, and useRef for DOM access.', tag: 'Ex No: 3b' },
];

export default function Experiments() {
    return (
        <div className="experiments-page">
            <div className="experiments-hero">
                <div className="exp-badge">📚 Lab Experiments</div>
                <h1 className="exp-title">React & MERN Experiments</h1>
                <p className="exp-subtitle">Interactive demonstrations of React concepts and MERN stack fundamentals</p>
            </div>

            <div className="experiments-grid">
                {experiments.map((exp) => (
                    <Link key={exp.path} to={exp.path} className="exp-card card">
                        <div className="exp-num">{exp.num}</div>
                        <div className="exp-tag">{exp.tag}</div>
                        <h3 className="exp-card-title">{exp.title}</h3>
                        <p className="exp-card-desc">{exp.desc}</p>
                        <div className="exp-footer">
                            <span className="exp-date">📅 {exp.date}</span>
                            <span className="exp-arrow">→</span>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
