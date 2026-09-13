"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, TriangleAlert } from "lucide-react";
import { store } from "@/lib/store";
import { isSupabaseConfigured } from "@/lib/supabaseClient";

export default function AuthBox() {
  const router = useRouter();
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setMsg("");
    if (!email.includes("@")) { setMsg("Enter a valid email address, like you@college.edu."); return; }
    if (password.length < 6) { setMsg("Password needs at least 6 characters."); return; }
    setLoading(true);
    try {
      const fn = mode === "signup" ? store.signUp : store.signIn;
      const { error } = await fn(email.trim(), password);
      if (error) setMsg(error.message || "Sign-in failed. Check your credentials and try again.");
      else router.push("/dashboard");
    } catch (err) {
      setMsg(err.message || "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 style={{ margin: "0 0 6px", fontSize: 19 }}>{mode === "signup" ? "Create your account" : "Welcome back"}</h2>
      <p className="muted small" style={{ margin: "0 0 16px" }}>
        {mode === "signup" ? "Start at level 1 with 50 coins." : "Pick up right where you left off."}
      </p>
      {!isSupabaseConfigured && (
        <div className="banner warn" role="alert" style={{ marginBottom: 14 }}>
          <TriangleAlert aria-hidden="true" />
          <p><strong>Demo mode.</strong> Connect Supabase before submitting — local-only data is disqualified.</p>
        </div>
      )}
      <form onSubmit={submit} aria-label={mode === "signup" ? "Create account" : "Sign in"}>
        <div className="field">
          <label htmlFor="auth-email">Email</label>
          <input id="auth-email" name="email" type="email" inputMode="email" spellCheck={false} autoComplete="email" placeholder="you@college.edu…" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="auth-password">Password</label>
          <input id="auth-password" name="password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} placeholder="6+ characters…" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
        </div>
        {msg && <p className="field-error" role="alert" style={{ marginBottom: 12 }}>{msg}</p>}
        <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
          {loading ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
          {!loading && <ArrowRight aria-hidden="true" />}
        </button>
      </form>
      <p className="small muted" style={{ margin: "14px 0 0", textAlign: "center" }}>
        {mode === "signup" ? "Already have an account?" : "New to Aetherbloom?"}{" "}
        <button type="button" onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setMsg(""); }} style={{ background: "none", border: "none", padding: 0, color: "var(--accent)", font: "inherit", fontWeight: 600, cursor: "pointer" }}>
          {mode === "signup" ? "Sign in" : "Create one"}
        </button>
      </p>
    </div>
  );
}
