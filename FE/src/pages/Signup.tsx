import { motion } from "framer-motion";
import { MailCheck, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import type { FormEvent } from "react";
import { signupRequest } from "../lib/api/auth";
import type { ApiUser } from "../lib/api/types";

export default function Signup() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdUser, setCreatedUser] = useState<ApiUser | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");

    try {
      const user = await signupRequest({ name, email, password });
      setCreatedUser(user);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Signup failed";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeVerificationPrompt = () => {
    setCreatedUser(null);
    navigate("/login", { replace: true });
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

      {createdUser ? (
        <div role="dialog" aria-modal="true" className="modalOverlay verifyEmailOverlay" onClick={closeVerificationPrompt}>
          <motion.div
            className="verifyEmailDialog"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.24 }}
            onClick={(event) => event.stopPropagation()}
          >
            <button className="verifyEmailClose" type="button" aria-label="Close verification prompt" onClick={closeVerificationPrompt}>
              <X size={18} />
            </button>
            <div className="verifyEmailIcon" aria-hidden="true">
              <MailCheck size={26} />
            </div>
            <p className="verifyEmailKicker">Verification email sent</p>
            <h2 className="verifyEmailTitle">Check your inbox to continue</h2>
            <p className="verifyEmailText">
              Taskora sent a verification link to <strong>{createdUser.email}</strong>. Press the link in that email to verify your account.
            </p>
            <button className="verifyEmailAction" type="button" onClick={closeVerificationPrompt}>
              Go to sign in
            </button>
            <p className="verifyEmailStatus">
              You will be able to sign in after the email has been verified.
            </p>
          </motion.div>
        </div>
      ) : null}
    </div>
  );
}
