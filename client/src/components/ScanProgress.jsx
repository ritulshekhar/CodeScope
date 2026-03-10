import { Component } from 'react';
import './ScanProgress.css';

/**
 * ScanProgress — Stateful Class Component
 * Manages its own step progression state using this.state and this.setState.
 * Uses componentDidMount / componentDidUpdate / componentWillUnmount lifecycle methods.
 */
class ScanProgress extends Component {
    constructor(props) {
        super(props);
        this.state = {
            currentStep: 0,
            elapsed: 0,
            steps: [
                { label: 'Cloning repository', icon: '📥', done: false },
                { label: 'Walking file tree', icon: '📂', done: false },
                { label: 'Calculating metrics', icon: '📊', done: false },
                { label: 'Detecting issues', icon: '🔍', done: false },
                { label: 'Scoring risk levels', icon: '⚠️', done: false },
                { label: 'Building report', icon: '📋', done: false },
            ],
        };
        this._stepTimer = null;
        this._elapsedTimer = null;
    }

    componentDidMount() {
        // Advance through steps every ~1.8s
        this._stepTimer = setInterval(() => {
            this.setState(prev => {
                const next = prev.currentStep + 1;
                if (next >= prev.steps.length) {
                    clearInterval(this._stepTimer);
                    return {
                        currentStep: prev.steps.length - 1,
                        steps: prev.steps.map(s => ({ ...s, done: true })),
                    };
                }
                return {
                    currentStep: next,
                    steps: prev.steps.map((s, i) => ({ ...s, done: i < next })),
                };
            });
        }, 1800);

        // Tick elapsed seconds
        this._elapsedTimer = setInterval(() => {
            this.setState(prev => ({ elapsed: prev.elapsed + 1 }));
        }, 1000);
    }

    componentDidUpdate(prevProps) {
        // If parent cancels scan, clean up
        if (!prevProps.active && this.props.active === false) {
            this.cleanup();
        }
    }

    componentWillUnmount() {
        this.cleanup();
    }

    cleanup() {
        clearInterval(this._stepTimer);
        clearInterval(this._elapsedTimer);
    }

    render() {
        const { steps, currentStep, elapsed } = this.state;
        const progress = Math.round(((currentStep + 1) / steps.length) * 100);

        return (
            <div className="scan-progress-card card">
                <div className="sp-header">
                    <div className="sp-pulse" />
                    <div>
                        <div className="sp-title">Analyzing Repository…</div>
                        <div className="sp-sub">Running code quality analysis on all files</div>
                    </div>
                    <div className="sp-elapsed">{elapsed}s</div>
                </div>

                {/* Progress bar */}
                <div className="sp-bar-track">
                    <div className="sp-bar-fill" style={{ width: `${progress}%` }} />
                </div>
                <div className="sp-pct">{progress}%</div>

                {/* Steps */}
                <div className="sp-steps">
                    {steps.map((step, i) => {
                        const isActive = i === currentStep;
                        const isDone = step.done;
                        return (
                            <div key={i} className={`sp-step ${isDone ? 'done' : ''} ${isActive ? 'active' : ''}`}>
                                <span className="sp-step-icon">
                                    {isDone ? '✓' : isActive ? <span className="spin">⟳</span> : '○'}
                                </span>
                                <span className="sp-step-label">{step.icon} {step.label}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }
}

export default ScanProgress;
