import { Component } from 'react';
import './ErrorBoundary.css';

/**
 * ErrorBoundary — Stateful Class Component (Ex 2a)
 * Catches runtime errors in child components and renders a graceful fallback.
 * Class components are the ONLY way to implement error boundaries in React.
 */
class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        // State initialized in constructor — class-component style
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
        this.handleReset = this.handleReset.bind(this);
    }

    // Lifecycle: called when a child throws — updates state before next render
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    // Lifecycle: called after error is caught — good for logging
    componentDidCatch(error, errorInfo) {
        this.setState({ errorInfo });
        console.error('[ErrorBoundary] Caught:', error, errorInfo);
    }

    handleReset() {
        this.setState({ hasError: false, error: null, errorInfo: null });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="error-boundary">
                    <div className="eb-icon">⚠️</div>
                    <h2 className="eb-title">Something went wrong</h2>
                    <p className="eb-msg">
                        {this.state.error?.message || 'An unexpected error occurred in this component.'}
                    </p>
                    <button className="btn-primary" onClick={this.handleReset}>
                        ↺ Try Again
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

export default ErrorBoundary;
