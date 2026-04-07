import { Link, useLocation } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Shield, Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";
import { useVerification } from "@/contexts/VerificationContext";
import { Badge } from "./ui/badge";

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/verify", label: "Verify" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/developer", label: "Developers" },
  { to: "/docs", label: "API Docs" },
];

export const Navbar = () => {
  const { publicKey } = useWallet();
  const { getStatus } = useVerification();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const status = publicKey ? getStatus(publicKey.toBase58()) : "not_verified";

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-primary font-bold text-lg">
          <Shield className="h-6 w-6" />
          <span>Deephuman</span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`px-3 py-2 rounded-md text-sm transition-colors ${
                location.pathname === link.to
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {publicKey && status === "verified" && (
            <Badge className="bg-primary/20 text-primary border-primary/30">Verified</Badge>
          )}
          <WalletMultiButton
            style={{
              backgroundColor: "hsl(168 70% 45%)",
              color: "hsl(222 47% 6%)",
              borderRadius: "0.5rem",
              fontSize: "0.875rem",
              height: "2.5rem",
            }}
          />
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-border/50 bg-background/95 backdrop-blur-xl">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMobileOpen(false)}
              className={`block px-6 py-3 text-sm transition-colors ${
                location.pathname === link.to
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
};
