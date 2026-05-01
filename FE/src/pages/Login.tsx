import { motion } from "framer-motion";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import type { FormEvent } from "react";
import { useAuth } from "../lib/use-auth";
import { loginRequest } from "../lib/api/auth";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/";

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    try {
      const auth = await loginRequest({ email, password });
      login(auth);
      navigate(from, { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="authPage">
      <div className="authBackdrop" aria-hidden="true" />

      <motion.div
        className="authCard"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="authBrand">Taskora</div>
        <h1 className="authTitle">Welcome back</h1>
        <p className="authSubtitle">Sign in to pick up where you left off.</p>

        <form className="authForm" onSubmit={onSubmit}>
          <label className="authField">
            <span className="authLabel">Email</span>
            <input className="authInput" type="email" name="email" placeholder="example@gmail.com" required />
          </label>

          <label className="authField">
            <span className="authLabel">Password</span>
            <input className="authInput" type="password" name="password" placeholder="password" required />
          </label>

          <button className="authButton" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        {error ? <p className="muted" style={{ margin: "12px 0 0" }}>{error}</p> : null}

        <p className="authAlt">
          No account yet? <Link to="/signup">Create one</Link>
        </p>
      </motion.div>
    </div>
  );
}
