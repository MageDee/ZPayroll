import { useState, useEffect } from "react";
import LandingPage from "./LandingPage";
import AuthScreen  from "./AuthScreen";
import WalletSetup from "./WalletSetup";
import ZPayroll    from "./ZPayroll";

// ─── Session storage ──────────────────────────────────────────────────────────
// Persists: publicKey, sessionToken, unifiedAddress, viewingKey, birthdayHeight
// Never persists: privateKey, mnemonic (security-sensitive, memory only)
const SESSION_KEY = "zpayroll_session";

function saveSession(data) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({
    publicKey:      data.publicKey      ?? null,
    sessionToken:   data.sessionToken   ?? null,
    unifiedAddress: data.unifiedAddress ?? null,
    viewingKey:     data.viewingKey     ?? null,
    birthdayHeight: data.birthdayHeight ?? 0,
    ts:             Date.now(),
  }));
}

function loadSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

// ─── Fade transition ──────────────────────────────────────────────────────────
function Fade({ children }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30);
    return () => clearTimeout(t);
  }, []);
  return (
    <div style={{
      opacity:    visible ? 1 : 0,
      transform:  visible ? "translateY(0)" : "translateY(10px)",
      transition: "opacity .35s ease, transform .35s ease",
    }}>
      {children}
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
//
//  Full flow:
//
//  NEW USER:
//    landing → auth (generate Ed25519 keypair in browser)
//           → wallet (POST /wallet/create with privkey ONCE)
//                    backend derives ZIP-32 Orchard wallet
//                    returns: sessionToken + unifiedAddress (utest1...)
//                             + viewingKey (uviewtest1...) + mnemonic (24 words)
//                             + birthdayHeight
//                    privkey discarded on server after derivation
//           → dashboard (all calls use sessionToken only)
//
//  RETURNING USER (same tab, session in sessionStorage):
//    mount → restores session → straight to dashboard
//    sessionToken used for all API calls — no re-login needed
//
//  RETURNING USER (new tab):
//    landing → auth (login with saved keypair)
//           → wallet (POST /wallet/restore — same derivation → same wallet)
//           → dashboard
//
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen]       = useState("landing");
  const [session, setSession]     = useState(null);
  const [transitioning, setTrans] = useState(false);

  // On mount — restore session from sessionStorage if present
  useEffect(() => {
    const existing = loadSession();
    if (existing?.publicKey && existing?.sessionToken) {
      setSession(existing);
      setScreen("dashboard");
    }
  }, []);

  const go = (next) => {
    setTrans(true);
    setTimeout(() => { setScreen(next); setTrans(false); }, 220);
  };

  // ── Landing → Auth ──
  const handleEnter = () => go("auth");

  // ── Auth success ──
  // authData = { publicKey, privateKey, isNew }
  // privateKey kept in memory only — never written to storage
  const handleAuthSuccess = (authData) => {
    setSession(authData);
    go("wallet");
  };

  // ── Wallet setup complete ──
  // walletData = {
  //   sessionToken, unifiedAddress, viewingKey,
  //   mnemonic (string[]), birthdayHeight, expiresAt, network
  // }
  const handleWalletComplete = (walletData) => {
    const full = {
      ...session,
      sessionToken:   walletData.sessionToken,
      unifiedAddress: walletData.unifiedAddress,
      viewingKey:     walletData.viewingKey,
      birthdayHeight: walletData.birthdayHeight,
      // mnemonic stays in memory only (not persisted)
      mnemonic:       walletData.mnemonic,
    };
    setSession(full);
    saveSession(full); // persists everything except privateKey and mnemonic
    go("dashboard");
  };

  // ── Logout ──
  const handleLogout = async () => {
    // Revoke server-side session
    try {
      if (session?.sessionToken) {
        await fetch("http://localhost:3001/api/session/logout", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ sessionToken: session.sessionToken }),
        });
      }
    } catch { /* server may be unreachable — still clear locally */ }
    clearSession();
    setSession(null);
    go("landing");
  };

  return (
    <div style={{ opacity: transitioning ? 0 : 1, transition: "opacity .2s ease" }}>

      {screen === "landing" && (
        <Fade key="landing">
          <LandingPage onEnter={handleEnter} />
        </Fade>
      )}

      {screen === "auth" && (
        <Fade key="auth">
          <AuthScreen
            onSuccess={handleAuthSuccess}
            onBack={() => go("landing")}
          />
        </Fade>
      )}

      {screen === "wallet" && (
        <Fade key="wallet">
          <WalletSetup
            session={session}
            onComplete={handleWalletComplete}
          />
        </Fade>
      )}

      {screen === "dashboard" && (
        <Fade key="dashboard">
          <ZPayroll
            session={session}
            onLogout={handleLogout}
          />
        </Fade>
      )}

    </div>
  );
}
