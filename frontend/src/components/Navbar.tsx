import { useNavigate, useLocation } from "react-router-dom";

interface NavbarProps {
  accountId?: string | null;
  walletReady?: boolean;
  onSignIn?: () => void;
  onSignOut?: () => void;
}

export default function Navbar({ accountId, walletReady, onSignIn, onSignOut }: NavbarProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const links = [
    { label: "Home", path: "/" },
    { label: "Dashboard", path: "/dashboard" },
    { label: "Portfolio", path: "/portfolio" },
  ];

  return (
    <nav style={{
      position: "sticky",
      top: 0,
      zIndex: 200,
      background: "rgba(250, 250, 248, 0.92)",
      backdropFilter: "blur(14px)",
      WebkitBackdropFilter: "blur(14px)",
      borderBottom: "1px solid var(--border)",
      padding: "0 32px",
      height: 64,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
    }}>
      {/* Logo */}
      <button
        onClick={() => navigate("/")}
        style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
      >
        <span style={{
          fontFamily: "var(--mono)",
          fontSize: 22,
          fontWeight: 700,
          color: "var(--accent)",
          letterSpacing: "-0.02em",
        }}>
          $HYPE
        </span>
      </button>

      {/* Nav links */}
      <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
        {links.map(link => {
          const active = pathname === link.path;
          return (
            <button
              key={link.path}
              onClick={() => navigate(link.path)}
              style={{
                background: active ? "rgba(245,158,11,0.09)" : "none",
                border: "none",
                borderRadius: 8,
                padding: "7px 16px",
                fontFamily: "var(--sans)",
                fontSize: 14,
                fontWeight: active ? 600 : 400,
                color: active ? "var(--accent)" : "var(--muted)",
                cursor: "pointer",
                transition: "color 0.15s, background 0.15s",
              }}
              onMouseEnter={e => {
                if (!active) (e.currentTarget as HTMLButtonElement).style.color = "var(--text)";
              }}
              onMouseLeave={e => {
                if (!active) (e.currentTarget as HTMLButtonElement).style.color = "var(--muted)";
              }}
            >
              {link.label}
            </button>
          );
        })}
      </div>

      {/* Wallet — only rendered when walletReady prop is passed */}
      <div style={{ minWidth: 160, display: "flex", justifyContent: "flex-end" }}>
        {walletReady !== undefined && (
          accountId ? (
            <button
              onClick={onSignOut}
              title="Click to sign out"
              style={{
                background: "var(--surface2)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "8px 14px",
                fontSize: 13,
                fontFamily: "var(--mono)",
                color: "var(--text)",
                cursor: "pointer",
                maxWidth: 180,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {accountId.length > 16 ? accountId.slice(0, 14) + "…" : accountId}
            </button>
          ) : walletReady ? (
            <button
              onClick={onSignIn}
              style={{
                background: "linear-gradient(135deg, #f59e0b, #d97706)",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "8px 18px",
                fontSize: 13,
                fontFamily: "var(--sans)",
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 2px 12px rgba(245,158,11,0.3)",
              }}
            >
              Connect Wallet
            </button>
          ) : null
        )}
      </div>
    </nav>
  );
}
