import { Link } from 'react-router-dom';
import './ExpPage.css';

const steps = [
    { title: 'Install Node.js & npm', cmd: 'node -v && npm -v', desc: 'Download and install Node.js LTS (v18+) from nodejs.org. npm is bundled automatically.' },
    { title: 'Install MongoDB Community', cmd: 'mongod --version', desc: 'Download MongoDB Community Server from mongodb.com/try/download/community. Start mongod service.' },
    { title: 'Install VS Code & Extensions', cmd: '', desc: 'Install Visual Studio Code + extensions: ESLint, Prettier, MongoDB for VS Code, Thunder Client.' },
    { title: 'Initialize Backend (Express)', cmd: 'mkdir server && cd server && npm init -y\nnpm install express mongoose cors dotenv jsonwebtoken bcryptjs\nnpm install -D nodemon', desc: 'Set up the Express server with MongoDB connection via Mongoose.' },
    { title: 'Initialize Frontend (React)', cmd: 'npm create vite@latest client -- --template react\ncd client && npm install\nnpm install react-router-dom axios', desc: 'Create a React app with Vite for fast HMR, add routing and HTTP client.' },
    { title: 'Configure Environment Variables', cmd: 'MONGO_URI=mongodb://localhost:27017/myapp\nJWT_SECRET=mysecret\nPORT=5000', desc: 'Create .env in server/ root. Never commit this file to git.' },
    { title: 'Run Both Servers', cmd: '# Terminal 1 (server)\ncd server && npm run dev\n\n# Terminal 2 (client)\ncd client && npm run dev', desc: 'Use concurrently or two terminals. Server runs on port 5000, client on 5173.' },
];

const libraries = [
    { name: 'express', version: '^4.18', desc: 'Web framework for Node.js' },
    { name: 'mongoose', version: '^8.2', desc: 'MongoDB ODM for Node.js' },
    { name: 'cors', version: '^2.8', desc: 'Cross-Origin Resource Sharing middleware' },
    { name: 'dotenv', version: '^16.4', desc: 'Load environment variables from .env file' },
    { name: 'jsonwebtoken', version: '^9.0', desc: 'JWT authentication tokens' },
    { name: 'bcryptjs', version: '^2.4', desc: 'Password hashing library' },
    { name: 'nodemon', version: '^3.1', desc: 'Auto-restart server on changes (dev)' },
    { name: 'react', version: '^18', desc: 'JavaScript UI library' },
    { name: 'react-router-dom', version: '^6', desc: 'Client-side routing for React' },
    { name: 'axios', version: '^1.6', desc: 'Promise-based HTTP client' },
    { name: 'vite', version: '^5', desc: 'Next-generation frontend build tool' },
];

export default function Ex1_MERNSetup() {
    return (
        <div className="exp-page">
            <div className="exp-page-header">
                <Link to="/experiments" className="btn-outline back-link">← Experiments</Link>
                <div className="exp-page-meta">
                    <span className="exp-tag-sm">Ex No: 1</span>
                    <span className="exp-date-sm">Date: 24-2-2026</span>
                </div>
            </div>

            <h1 className="exp-page-title">Setting up MERN Environment</h1>
            <p className="exp-page-subtitle">Complete guide to installing and configuring MongoDB, Express, React, and Node.js for full-stack development.</p>

            <section className="exp-section">
                <h2 className="exp-section-title">📦 Software Requirements</h2>
                <div className="req-grid">
                    {[
                        { name: 'Node.js', version: 'v18 LTS or higher', url: 'https://nodejs.org' },
                        { name: 'MongoDB', version: 'v6 Community Server', url: 'https://mongodb.com' },
                        { name: 'VS Code', version: 'Latest', url: 'https://code.visualstudio.com' },
                        { name: 'npm', version: 'v9+ (bundled with Node)', url: '' },
                    ].map((r, i) => (
                        <div key={i} className="req-card card">
                            <div className="req-name">{r.name}</div>
                            <div className="req-ver">{r.version}</div>
                            {r.url && <a href={r.url} target="_blank" rel="noreferrer" className="req-link">↗ Download</a>}
                        </div>
                    ))}
                </div>
            </section>

            <section className="exp-section">
                <h2 className="exp-section-title">🪜 Installation Steps</h2>
                {steps.map((step, i) => (
                    <div key={i} className="step-card card">
                        <div className="step-num">Step {i + 1}</div>
                        <h3 className="step-title">{step.title}</h3>
                        <p className="step-desc">{step.desc}</p>
                        {step.cmd && (
                            <div className="code-block">
                                <pre>{step.cmd}</pre>
                            </div>
                        )}
                    </div>
                ))}
            </section>

            <section className="exp-section">
                <h2 className="exp-section-title">📚 Libraries & Dependencies</h2>
                <div className="lib-table card">
                    <div className="lib-header">
                        <span>Package</span><span>Version</span><span>Description</span>
                    </div>
                    {libraries.map((lib, i) => (
                        <div key={i} className="lib-row">
                            <span className="lib-name">{lib.name}</span>
                            <span className="lib-ver">{lib.version}</span>
                            <span className="lib-desc">{lib.desc}</span>
                        </div>
                    ))}
                </div>
            </section>

            <section className="exp-section">
                <h2 className="exp-section-title">🗂️ Project Structure</h2>
                <div className="code-block">
                    <pre>{`nlp-bug-finder/
├── server/               # Express + MongoDB backend
│   ├── config/
│   │   └── db.js         # Mongoose connection
│   ├── models/           # Mongoose schemas
│   ├── routes/           # API route handlers
│   ├── middleware/        # Auth middleware
│   ├── analyzer/         # Code analysis engine
│   ├── .env              # Environment variables
│   └── server.js         # Express entry point
├── client/               # React + Vite frontend
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── context/      # React Context (Auth)
│   │   ├── pages/        # Route page components
│   │   └── App.jsx       # Router + App entry
│   └── vite.config.js
└── package.json          # Root scripts (monorepo)`}</pre>
                </div>
            </section>

            <div className="exp-result">
                <h3>✅ Expected Output</h3>
                <div className="code-block result-block">
                    <pre>{`🚀 NLP Bug Finder server running on port 5000
✅ MongoDB Connected: localhost

VITE v5.x ready in 432 ms
➜  Local:   http://localhost:5173/`}</pre>
                </div>
            </div>
        </div>
    );
}
