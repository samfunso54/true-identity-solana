import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Key, Copy, BarChart3, Shield } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useVerification } from "@/contexts/VerificationContext";
import { toast } from "sonner";
import { Link } from "react-router-dom";

const Developer = () => {
  const { publicKey } = useWallet();
  const { apiKeys, fetchApiKeys, generateApiKey } = useVerification();
  const [showKey, setShowKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const walletAddr = publicKey?.toBase58() || "";

  useEffect(() => {
    if (walletAddr) {
      fetchApiKeys(walletAddr);
    }
  }, [walletAddr, fetchApiKeys]);

  const handleGenerate = async () => {
    if (!walletAddr) {
      toast.error("Connect your wallet first");
      return;
    }
    setLoading(true);
    const key = await generateApiKey(walletAddr);
    setLoading(false);
    if (!key) {
      toast.error("Max keys (5) reached or generation failed.");
      return;
    }
    setShowKey(key);
    toast.success("API key generated!");
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success("API key copied!");
  };

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="container max-w-4xl space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Developer Dashboard</h1>
            <p className="text-muted-foreground mt-1">Manage API keys and monitor usage.</p>
          </div>
          <Button asChild variant="outline">
            <Link to="/docs">API Docs</Link>
          </Button>
        </div>

        {/* API Keys */}
        <GlassCard className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">API Keys</h3>
            </div>
            <Button onClick={handleGenerate} size="sm" disabled={loading}>
              {loading ? "Generating…" : "Generate Key"}
            </Button>
          </div>

          {apiKeys.length === 0 ? (
            <p className="text-sm text-muted-foreground">No API keys yet. Generate one to get started.</p>
          ) : (
            <div className="space-y-2">
              {apiKeys.map((keyObj) => (
                <div key={keyObj.id} className="flex items-center gap-2 bg-secondary/50 rounded-lg p-3">
                  <code className="text-xs text-primary flex-1 truncate">
                    {showKey === keyObj.api_key ? keyObj.api_key : `${keyObj.api_key.slice(0, 12)}${"•".repeat(20)}`}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowKey(showKey === keyObj.api_key ? null : keyObj.api_key)}
                    className="text-xs"
                  >
                    {showKey === keyObj.api_key ? "Hide" : "Show"}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => copyKey(keyObj.api_key)} className="h-8 w-8">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="h-3 w-3" />
            <span>Keys are stored securely. Max 5 active keys per wallet.</span>
          </div>
        </GlassCard>

        {/* Quick endpoints */}
        <GlassCard className="space-y-4">
          <h3 className="font-semibold">Endpoints</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Badge className="bg-primary/20 text-primary border-primary/30 font-mono text-xs">GET</Badge>
              <code className="text-sm text-muted-foreground">/api/verify/{"{wallet_address}"}</code>
            </div>
            <div className="flex items-center gap-3">
              <Badge className="bg-warning/20 text-warning border-warning/30 font-mono text-xs">POST</Badge>
              <code className="text-sm text-muted-foreground">/api/verify/complete</code>
            </div>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/docs">View Full Documentation →</Link>
          </Button>
        </GlassCard>
      </div>
    </div>
  );
};

export default Developer;
