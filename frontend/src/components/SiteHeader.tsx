"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearToken, getToken } from "@/lib/auth";

export default function SiteHeader() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(!!getToken());
  }, []);

  function handleLogout() {
    clearToken();
    setIsLoggedIn(false);
    router.push("/login");
  }

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" className="brand-mark">
          <span className="brand-dot" />
          FinAdvisor Copilot
        </Link>
        <nav className="header-nav">
          <Link href="/chat">Chat</Link>
          <Link href="/logs">Audit Logs</Link>
          {isLoggedIn ? (
            <button
              className="ghost"
              style={{ padding: "6px 12px", fontSize: "13.5px", fontWeight: 500 }}
              onClick={handleLogout}
            >
              Logout
            </button>
          ) : (
            <>
              <Link href="/login">Login</Link>
              <Link className="nav-cta" href="/register">
                Get Started
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
