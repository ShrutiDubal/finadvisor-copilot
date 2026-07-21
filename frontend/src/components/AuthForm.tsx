"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { api } from "@/lib/api";
import { setToken } from "@/lib/auth";

type Mode = "login" | "register";

export default function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isLogin = mode === "login";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      if (isLogin) {
        const data = await api.request<{ access_token: string }>("/auth/login", {
          method: "POST",
          body: { email, password },
        });
        setToken(data.access_token);
        router.push("/chat");
        router.refresh();
      } else {
        await api.request("/auth/register", {
          method: "POST",
          body: { email, password },
        });
        setSuccess("Account created. You can now sign in.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-shell">
      <div className="auth-card">
        <div className="auth-card-header">
          <h1>{isLogin ? "Welcome back" : "Create account"}</h1>
          <p>
            {isLogin
              ? "Sign in to access advisor chat and audit logs."
              : "Set up credentials to get started with FinAdvisor Copilot."}
          </p>
        </div>

        <form className="auth-card-body stack" onSubmit={handleSubmit}>
          <div className="stack" style={{ gap: 6 }}>
            <label className="field-label" htmlFor="email">
              Email address
            </label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="stack" style={{ gap: 6 }}>
            <label className="field-label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder={isLogin ? "Your password" : "Minimum 8 characters"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={isLogin ? "current-password" : "new-password"}
            />
          </div>

          {error ? <p className="error">{error}</p> : null}
          {success ? <p className="success">{success}</p> : null}

          <button
            type="submit"
            disabled={loading || !email || !password}
            style={{ marginTop: 4 }}
          >
            {loading ? "Please wait…" : isLogin ? "Sign in" : "Create account"}
          </button>
        </form>

        <div className="auth-footer">
          {isLogin ? "New here?" : "Already have an account?"}{" "}
          <Link href={isLogin ? "/register" : "/login"}>
            {isLogin ? "Create an account" : "Sign in"}
          </Link>
        </div>
      </div>
    </main>
  );
}
