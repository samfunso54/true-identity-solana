import { useState } from "react";
import { Copy, CheckCircle } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

const copyCode = (text: string) => {
  navigator.clipboard.writeText(text);
  toast.success("Copied!");
};

const CodeBlock = ({ code, lang }: { code: string; lang: string }) => (
  <div className="relative">
    <Button
      variant="ghost"
      size="icon"
      className="absolute top-2 right-2 h-7 w-7"
      onClick={() => copyCode(code)}
    >
      <Copy className="h-3 w-3" />
    </Button>
    <pre className="bg-secondary/50 rounded-lg p-4 text-xs overflow-x-auto">
      <code>{code}</code>
    </pre>
  </div>
);

const endpoints = [
  {
    method: "GET",
    path: "/api/verify/{wallet_address}",
    desc: "Check the verification status of a wallet address.",
    methodColor: "bg-primary/20 text-primary border-primary/30",
    request: `curl -X GET "https://api.verifyid.app/api/verify/7xKX...3nPq" \\
  -H "Authorization: Bearer vdi_your_api_key"`,
    response: `{
  "wallet_address": "7xKX...3nPq",
  "status": "verified",
  "verified_at": "2025-04-05T12:00:00Z",
  "chain": "solana",
  "network": "devnet",
  "confidence_score": 0.97
}`,
    jsCode: `const response = await fetch(
  "https://api.verifyid.app/api/verify/7xKX...3nPq",
  {
    headers: {
      "Authorization": "Bearer vdi_your_api_key",
    },
  }
);
const data = await response.json();
console.log(data.status); // "verified"`,
    pyCode: `import requests

response = requests.get(
    "https://api.verifyid.app/api/verify/7xKX...3nPq",
    headers={"Authorization": "Bearer vdi_your_api_key"}
)
data = response.json()
print(data["status"])  # "verified"`,
  },
  {
    method: "POST",
    path: "/api/verify/initiate",
    desc: "Initiate a new verification session for a wallet.",
    methodColor: "bg-warning/20 text-warning border-warning/30",
    request: `curl -X POST "https://api.verifyid.app/api/verify/initiate" \\
  -H "Authorization: Bearer vdi_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"wallet_address": "7xKX...3nPq", "redirect_url": "https://yourapp.com/callback"}'`,
    response: `{
  "session_id": "sess_abc123",
  "verification_url": "https://verifyid.app/verify?session=sess_abc123",
  "expires_at": "2025-04-05T12:30:00Z",
  "status": "pending"
}`,
    jsCode: `const response = await fetch(
  "https://api.verifyid.app/api/verify/initiate",
  {
    method: "POST",
    headers: {
      "Authorization": "Bearer vdi_your_api_key",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      wallet_address: "7xKX...3nPq",
      redirect_url: "https://yourapp.com/callback",
    }),
  }
);
const { verification_url } = await response.json();
window.location.href = verification_url;`,
    pyCode: `import requests

response = requests.post(
    "https://api.verifyid.app/api/verify/initiate",
    headers={
        "Authorization": "Bearer vdi_your_api_key",
        "Content-Type": "application/json",
    },
    json={
        "wallet_address": "7xKX...3nPq",
        "redirect_url": "https://yourapp.com/callback",
    }
)
data = response.json()
print(data["verification_url"])`,
  },
];

const Docs = () => {
  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="container max-w-4xl space-y-10">
        <div className="space-y-3">
          <h1 className="text-3xl font-bold">API Documentation</h1>
          <p className="text-muted-foreground">
            Integrate identity verification into your app with our REST API.
          </p>
        </div>

        {/* Quick start */}
        <GlassCard className="space-y-4">
          <h2 className="text-xl font-semibold">Quick Start</h2>
          <ol className="space-y-3 text-sm text-muted-foreground list-decimal list-inside">
            <li>
              Generate an API key from the{" "}
              <a href="/developer" className="text-primary underline">
                Developer Dashboard
              </a>
            </li>
            <li>Use the API key in the Authorization header of your requests</li>
            <li>Call <code className="text-primary">/api/verify/initiate</code> to start a verification session</li>
            <li>Redirect users to the verification URL</li>
            <li>Poll <code className="text-primary">/api/verify/{"{wallet}"}</code> or use webhooks for the result</li>
          </ol>
        </GlassCard>

        {/* Auth */}
        <GlassCard className="space-y-4">
          <h2 className="text-xl font-semibold">Authentication</h2>
          <p className="text-sm text-muted-foreground">
            All API requests require a Bearer token in the Authorization header.
          </p>
          <CodeBlock
            lang="bash"
            code={`Authorization: Bearer vdi_your_api_key_here`}
          />
        </GlassCard>

        {/* Endpoints */}
        {endpoints.map((ep) => (
          <GlassCard key={ep.path} className="space-y-4">
            <div className="flex items-center gap-3">
              <Badge className={`font-mono text-xs ${ep.methodColor}`}>{ep.method}</Badge>
              <code className="text-sm font-semibold">{ep.path}</code>
            </div>
            <p className="text-sm text-muted-foreground">{ep.desc}</p>

            <Tabs defaultValue="curl" className="w-full">
              <TabsList className="bg-secondary/50">
                <TabsTrigger value="curl">cURL</TabsTrigger>
                <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                <TabsTrigger value="python">Python</TabsTrigger>
              </TabsList>
              <TabsContent value="curl">
                <CodeBlock lang="bash" code={ep.request} />
              </TabsContent>
              <TabsContent value="javascript">
                <CodeBlock lang="javascript" code={ep.jsCode} />
              </TabsContent>
              <TabsContent value="python">
                <CodeBlock lang="python" code={ep.pyCode} />
              </TabsContent>
            </Tabs>

            <div>
              <p className="text-xs text-muted-foreground mb-2">Response</p>
              <CodeBlock lang="json" code={ep.response} />
            </div>
          </GlassCard>
        ))}

        {/* Rate limits */}
        <GlassCard className="space-y-4">
          <h2 className="text-xl font-semibold">Rate Limits & Pricing</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { tier: "Free", limit: "100 req/day", price: "Free", highlight: true },
              { tier: "Pro", limit: "10,000 req/day", price: "$29/mo", highlight: false },
              { tier: "Enterprise", limit: "Unlimited", price: "Custom", highlight: false },
            ].map((t) => (
              <div
                key={t.tier}
                className={`rounded-lg border p-4 text-center space-y-2 ${
                  t.highlight ? "border-primary/40 bg-primary/5" : "border-border"
                }`}
              >
                <p className="font-semibold">{t.tier}</p>
                <p className="text-2xl font-bold text-primary">{t.price}</p>
                <p className="text-xs text-muted-foreground">{t.limit}</p>
                {t.highlight && (
                  <Badge className="bg-primary/20 text-primary border-primary/30">Current</Badge>
                )}
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Status codes */}
        <GlassCard className="space-y-4">
          <h2 className="text-xl font-semibold">Status Codes</h2>
          <div className="space-y-2 text-sm">
            {[
              { code: 200, desc: "Success" },
              { code: 400, desc: "Bad Request — invalid parameters" },
              { code: 401, desc: "Unauthorized — invalid or missing API key" },
              { code: 404, desc: "Not Found — wallet not registered" },
              { code: 429, desc: "Rate Limit Exceeded" },
            ].map((s) => (
              <div key={s.code} className="flex items-center gap-3">
                <Badge variant="outline" className="font-mono w-12 justify-center">
                  {s.code}
                </Badge>
                <span className="text-muted-foreground">{s.desc}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default Docs;
