import { Link } from 'react-router-dom';
import './Footer.css';

export default function Footer() {
    return (
        <footer className="footer">
            <div className="footer-container">
                <div className="footer-brand">
                    <div className="footer-logo">
                        <span className="logo-star">✳</span>
                        <span>Analyzer</span>
                    </div>
                    <div className="footer-social">
                        <a href="#" className="social-icon" aria-label="Facebook">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>
                        </a>
                        <a href="#" className="social-icon" aria-label="Instagram">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></svg>
                        </a>
                        <a href="#" className="social-icon" aria-label="Twitter">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                        </a>
                    </div>
                </div>

                <div className="footer-columns">
                    <div className="footer-col">
                        <h4>Company</h4>
                        <Link to="#">About Us</Link>
                        <Link to="#">Careers</Link>
                        <Link to="#">Contact Us</Link>
                        <Link to="#">System Status</Link>
                    </div>
                    <div className="footer-col">
                        <h4>Product</h4>
                        <Link to="#">Features</Link>
                        <Link to="#">Pricing</Link>
                        <Link to="#">Integrations</Link>
                    </div>
                    <div className="footer-col">
                        <h4>Resources</h4>
                        <Link to="#">Blog</Link>
                        <Link to="#">Support Center</Link>
                    </div>
                    <div className="footer-col">
                        <h4>Legal</h4>
                        <Link to="#">Privacy Policy</Link>
                        <Link to="#">Terms of Service</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
