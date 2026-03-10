import './MetricCard.css';

export default function MetricCard({ title, value, subtitle, icon }) {
    return (
        <div className="metric-card card">
            <div className="mc-header">
                <span className="mc-title">{title}</span>
                <button className="mc-menu">•••</button>
            </div>
            <div className="mc-value">{value ?? '—'}</div>
            <div className="mc-subtitle">{subtitle}</div>
        </div>
    );
}
