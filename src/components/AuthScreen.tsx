"use client";

import { FormEvent, useState } from "react";
import { AnimatePresence, motion, MotionConfig } from "motion/react";

export type AuthViewer = { id: string; name: string; email: string };
type Mode = "login" | "register";

export function AuthScreen({ checking = false, onAuthenticated, onGuest }: {
  checking?: boolean;
  onAuthenticated: (user: AuthViewer) => void;
  onGuest: () => void;
}) {
  const [mode, setMode] = useState<Mode>("login");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const data = new FormData(event.currentTarget);
    const payload = Object.fromEntries(data.entries());
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json() as { user?: AuthViewer; error?: string };
      if (!response.ok || !body.user) throw new Error(body.error ?? "Authentication failed.");
      onAuthenticated(body.user);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <MotionConfig reducedMotion="user">
      <main className="authPage">
        <motion.section className="authStory" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .42 }}>
          <div className="authBrand"><span>☎</span><strong>DealDAB</strong></div>
          <p className="authEyebrow">Voice-first procurement intelligence</p>
          <h1>Three calls.<br /><em>One defensible deal.</em></h1>
          <p className="authLead">Give one brief. DealDAB negotiates with multiple vendors, validates every offer, and recommends the best eligible option with transcript-backed evidence.</p>
          <ol className="authFlow" aria-label="DealDAB workflow">
            <li><b>01</b><span>Define the brief<small>Budget, quantity and hard constraints</small></span></li>
            <li><b>02</b><span>Hear the negotiation<small>Bounded, multilingual voice playback</small></span></li>
            <li><b>03</b><span>Defend the decision<small>Scored offers linked to exact quotes</small></span></li>
          </ol>
          <div className="authTrust"><span>✓ MongoDB Atlas</span><span>✓ Evidence linked</span><span>✓ No purchase commitment</span></div>
        </motion.section>

        <motion.section className="authPanel" initial={{ opacity: 0, scale: .98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: .34, delay: .08 }}>
          <div className="authTabs" role="tablist" aria-label="Account access">
            {(["login", "register"] as Mode[]).map((item) => (
              <button key={item} type="button" role="tab" aria-selected={mode === item} onClick={() => { setMode(item); setError(null); }}>
                {item === "login" ? "Sign in" : "Create account"}
                {mode === item && <motion.i layoutId="auth-tab" />}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={checking ? "checking" : mode} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: .2 }}>
              {checking ? (
                <div className="authChecking"><span /><p>Checking your secure session…</p></div>
              ) : (
                <form className="authForm" onSubmit={submit}>
                  <header><span>{mode === "login" ? "Welcome back" : "Start negotiating"}</span><h2>{mode === "login" ? "Sign in to your workspace" : "Create your DealDAB account"}</h2></header>
                  {mode === "register" && <label>Full name<input name="name" autoComplete="name" minLength={2} maxLength={60} required placeholder="Anish Pes" /></label>}
                  <label>Email address<input name="email" type="email" autoComplete="email" required placeholder="team@college.edu" /></label>
                  <label>Password<input name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={mode === "register" ? 8 : 1} required placeholder={mode === "register" ? "At least 8 characters" : "Your password"} /></label>
                  {error && <p className="authError" role="alert">{error}</p>}
                  <motion.button className="authPrimary" type="submit" disabled={busy} whileHover={{ y: -1 }} whileTap={{ scale: .985 }}>
                    {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}<span>→</span>
                  </motion.button>
                </form>
              )}
            </motion.div>
          </AnimatePresence>

          {!checking && <><div className="authDivider"><span>or</span></div><button className="judgeDemo" type="button" onClick={onGuest}><b>Launch judge demo</b><small>No account required · uses clearly labelled simulated vendors</small></button></>}
          <p className="authSafety">Passwords are salted and hashed. Signing in never authorizes DealDAB to place an order or make a payment.</p>
        </motion.section>
      </main>
    </MotionConfig>
  );
}
