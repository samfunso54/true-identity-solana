import { useState } from "react";
import { Key, Copy, BarChart3, Shield } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useVerification } from "@/contexts/VerificationContext";
import { toast } from "sonner";
import { Link } from "react-router-dom";

const mockUsage = [
  { date: "2025-04-01", calls: 124 },
  { date: "2025-04-02", calls: 210 },
  { date: "2025-04-03", calls: 187 },
  { date: "2025-04-04", calls: 302 },
  { date: "2025-04-05", calls: 256 },
];

const Developer = () => {
  const { apiKeys, generateApiKey } = useVerification();
  const [showKey, setShowKey] = useState<string | null>(null);

  const handleGenerate = () => {
    const key = generateApiKey();
    if (!key) {
      toast.error("Rate limit reached or max keys (5) exceeded. Wait a few seconds.");
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
            <Button onClick={handleGenerate} size="sm">
              Generate Key
            </Button>
          </div>

          {apiKeys.length === 0 ? (
            <p className="text-sm text-muted-foreground">No API keys yet. Generate one to get started.</p>
          ) : (
            <div className="space-y-2">
              {apiKeys.map((key, i) => (
                <div key={i} className="flex items-center gap-2 bg-secondary/50 rounded-lg p-3">
                  <code className="text-xs text-primary flex-1 truncate">
                    {showKey === key ? key : `${key.slice(0, 12)}${"•".repeat(20)}`}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowKey(showKey === key ? null : key)}
                    className="text-xs"
                  >
                    {showKey === key ? "Hide" : "Show"}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => copyKey(key)} className="h-8 w-8">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="h-3 w-3" />
            <span>Keys are shown once. Store them securely.</span>
          </div>
        </GlassCard>

        {/* Usage Stats */}
        <GlassCard className="space-y-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Usage (Last 5 Days)</h3>
          </div>
          <div className="space-y-2">
            {mockUsage.map((day) => (
              <div key={day.date} className="flex items-center gap-4">
                <span className="text-xs text-muted-foreground w-24">{day.date}</span>
                <div className="flex-1 bg-secondary rounded-full h-4 overflow-hidden">
                  <div
                    className="h-full bg-primary/60 rounded-full transition-all"
                    style={{ width: `${(day.calls / 400) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-medium w-12 text-right">{day.calls}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
            <span>Total: {mockUsage.reduce((a, b) => a + b.calls, 0)} calls</span>
            <Badge variant="outline" className="text-primary">Free Tier</Badge>
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
              <code className="text-sm text-muted-foreground">/api/verify/initiate</code>
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
