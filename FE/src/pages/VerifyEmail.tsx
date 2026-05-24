import { motion } from "framer-motion";
import { CheckCircle, MailWarning } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { verifyEmailRequest } from "../lib/api/auth";

type VerifyState = "loading" | "success" | "error";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [state, setState] = useState<VerifyState>("loading");
  const [message, setMessage] = useState("Verifying your email...");

  useEffect(() => {
    let isActive = true;

    const verify = async () => {
      if (!token) {
        setState("error");
        setMessage("Verification token is missing.");
        return;
      }

      try {
        await verifyEmailRequest(token);
        if (!isActive) return;
        setState("success");
        setMessage("Your email is verified. You can sign in now.");
      } catch (err) {
        if (!isActive) return;
        const nextMessage = err instanceof Error ? err.message : "Email verification failed.";
        setState("error");
        setMessage(nextMessage);
      }
    };

    verify();
    return () => {
      isActive = false;
    };
  }, [token]);

  const isSuccess = state === "success";

  return (
    <div className="authPage">
      <div className="authBackdrop" aria-hidden="true" />
      <motion.div
        className="authCard verifyResultCard"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div className={isSuccess ? "verifyEmailIcon verifyEmailIconSuccess" : "verifyEmailIcon verifyEmailIconWarning"} aria-hidden="true">
          {isSuccess ? <CheckCircle size={26} /> : <MailWarning size={26} />}
        </div>
        <div className="authBrand">Taskora</div>
        <h1 className="authTitle">{state === "loading" ? "Checking your link" : isSuccess ? "Email verified" : "Verification issue"}</h1>
        <p className="authSubtitle">{message}</p>
        <Link className="authButton verifyResultButton" to="/login">
          Go to sign in
        </Link>
      </motion.div>
    </div>
  );
}
