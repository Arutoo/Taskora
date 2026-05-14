import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";

export default function NotFound() {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="centerPage">
      <div className="card cardPad6" style={{ textAlign: "center", maxWidth: 460 }}>
        <h1 className="pageTitle">404</h1>
        <p className="pageSubtitle" style={{ marginInline: "auto", marginBottom: 18 }}>
          We could not find that page. Head back to your dashboard to continue working.
        </p>
        <Link to="/" className="primaryBtn" style={{ textDecoration: "none" }}>
          Return home
        </Link>
      </div>
    </div>
  );
}
