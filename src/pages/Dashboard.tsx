import { useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Shield, CheckCircle, XCircle, Clock, Copy, ExternalLink } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useVerification } from "@/contexts/VerificationContext";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const Dashboard = () => {
  const { publicKey, connected } = useWallet();
  const { getStatus, records, fetchStatus } = useVerification();
  const walletAddr = publicKey?.toBase58() || "";
  const status = walletAddr ? getStatus(walletAddr) : "not_verified";
  const record = records[walletAddr];

  // Fetch from backend on mount
  useEffect(() => {
    if (walletAddr) {
      fetchStatus(walletAddr);
    }
  }, [walletAddr, fetchStatus]);

  if (!connected) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <GlassCard className="max-w-md text-center space-y-4">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto" />
          <h2 className="text-xl font-semibold">Connect Wallet</h2>
          <p className="text-muted-foreground text-sm">Connect your Solana wallet to view your dashboard.</p>
          <WalletMultiButton
            style={{
              backgroundColor: "hsl(168 70% 45%)",
              color: "hsl(222 47% 6%)",
              borderRadius: "0.5rem",
            }}
          />
        </GlassCard>
      </div>
    );
  }

  const statusConfig = {
    verified: { icon: CheckCircle, color: "text-primary", bgColor: "bg-primary/10 border-primary/30", label: "Verified" },
    pending: { icon: Clock, color: "text-warning", bgColor: "bg-warning/10 border-warning/30", label: "Pending" },
    failed: { icon: XCircle, color: "text-destructive", bgColor: "bg-destructive/10 border-destructive/30", label: "Failed" },
    not_verified: { icon: Shield, color: "text-muted-foreground", bgColor: "bg-muted border-border", label: "Not Verified" },
  }[status];

  const StatusIcon = statusConfig.icon;

  const copyAddress = () => {
    navigator.clipboard.writeText(walletAddr);
    toast.success("Wallet address copied!");
  };

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="container max-w-4xl space-y-8">
        <h1 className="text-3xl font-bold">Your Dashboard</h1>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Status card */}
          <GlassCard className={`space-y-4 border ${statusConfig.bgColor}`}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Verification Status</h3>
              <Badge variant="outline" className={statusConfig.color}>
                {statusConfig.label}
              </Badge>
            </div>
            <StatusIcon className={`h-16 w-16 mx-auto ${statusConfig.color}`} />
            {status === "not_verified" && (
              <Button asChild className="w-full">
                <Link to="/verify">Start Verification</Link>
              </Button>
            )}
            {status === "failed" && (
              <Button asChild variant="outline" className="w-full">
                <Link to="/verify">Retry Verification</Link>
              </Button>
            )}
          </GlassCard>

          {/* Wallet info */}
          <GlassCard className="space-y-4">
            <h3 className="font-semibold">Wallet</h3>
            <div className="flex items-center gap-2 bg-secondary/50 rounded-lg p-3">
              <code className="text-xs text-primary flex-1 truncate">{walletAddr}</code>
              <Button variant="ghost" size="icon" onClick={copyAddress} className="shrink-0 h-8 w-8">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            {record?.timestamp && (
              <p className="text-xs text-muted-foreground">
                Verified at: {new Date(record.timestamp).toLocaleString()}
              </p>
            )}
            {status === "verified" && record?.txSignature && (
              <div className="space-y-2">
                <p className="text-sm font-medium">On-Chain Proof</p>
                <a
                  href={`https://explorer.solana.com/tx/${record.txSignature}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  View on Solana Explorer <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </GlassCard>
        </div>

        {/* API status card */}
        <GlassCard className="space-y-3">
          <h3 className="font-semibold">API Verification Status</h3>
          <pre className="bg-secondary/50 rounded-lg p-4 text-xs overflow-x-auto">
{JSON.stringify(
  {
    wallet_address: walletAddr,
    status,
    verified_at: record?.timestamp || null,
    tx_signature: record?.txSignature || null,
    chain: "solana",
    network: "devnet",
  },
  null,
  2
)}
          </pre>
        </GlassCard>
      </div>
    </div>
  );
};

export default Dashboard;
