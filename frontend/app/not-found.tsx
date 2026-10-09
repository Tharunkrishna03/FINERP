import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="login-shell">
      <div className="card empty-state" style={{ padding: "60px 40px", maxWidth: "480px", width: "100%", margin: "auto" }}>
        <img 
          src="/page_not_found.svg" 
          alt="Page Not Found" 
          style={{ width: "240px", maxWidth: "100%", height: "auto", margin: "0 auto 24px", display: "block" }} 
        />
        <h2 style={{ fontSize: "24px", color: "var(--color-text)", marginBottom: "8px" }}>Page Not Found</h2>
        
        <Link href="/dashboard" className="btn btn-primary" style={{ textDecoration: "none" }}>
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
