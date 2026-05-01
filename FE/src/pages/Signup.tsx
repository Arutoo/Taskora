import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import type { FormEvent } from "react";
import { useAuth } from "../lib/use-auth";
import { signupRequest } from "../lib/api/auth";

export default function Signup() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    try {
      const auth = await signupRequest({ name, email, password });
      login(auth);
      navigate("/", { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Signup failed";
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
        <h1 className="authTitle">Create your account</h1>
        <p className="authSubtitle">Join your team and start shipping.</p>

        <form className="authForm" onSubmit={onSubmit}>
          <label className="authField">
            <span className="authLabel">Full name</span>
            <input className="authInput" type="text" name="name" placeholder="Elbert Tany" required />
          </label>

          <label className="authField">
            <span className="authLabel">Email</span>
            <input className="authInput" type="email" name="email" placeholder="example@gmail.com" required />
          </label>

          <label className="authField">
            <span className="authLabel">Password</span>
            <input className="authInput" type="password" name="password" placeholder="Create a password" required />
          </label>

          <button className="authButton" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create account"}
          </button>
        </form>

        {error ? <p className="muted" style={{ margin: "12px 0 0" }}>{error}</p> : null}

        <p className="authAlt">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </motion.div>
    </div>
  );
}
