import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";

export default function NotFound() {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="centerPage">
      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontSize: 48, margin: "0 0 12px", fontWeight: 900 }}>404</h1>
        <p className="muted" style={{ fontSize: 18, margin: "0 0 16px" }}>
          Oops! Page not found
        </p>
        <Link to="/" style={{ color: "var(--c-primary)", textDecoration: "underline" }}>
          Return to Home
        </Link>
      </div>
    </div>
  );
}