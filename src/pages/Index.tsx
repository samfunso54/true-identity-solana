import { Link } from "react-router-dom";
import { Shield, Camera, CheckCircle, Code, ArrowRight, Zap, Lock, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/GlassCard";

const steps = [
  { icon: Shield, title: "Connect Wallet", desc: "Link your Solana wallet (Phantom or Solflare) to get started." },
  { icon: Camera, title: "Liveness Check", desc: "Complete a quick webcam challenge to prove you're human." },
  { icon: CheckCircle, title: "Get Verified", desc: "Receive your verified status, usable across any app via API." },
];

const features = [
  { icon: Zap, title: "Real-Time Detection", desc: "Instant liveness verification with anti-deepfake technology." },
  { icon: Lock, title: "Privacy First", desc: "No biometric data stored. Verification is on-chain and trustless." },
  { icon: Globe, title: "Universal API", desc: "Integrate verification into any app with a simple REST API." },
  { icon: Code, title: "Developer Friendly", desc: "SDKs, docs, and code samples to get you live in minutes." },
];

const Index = () => (
  <div className="min-h-screen pt-16">
    {/* Hero */}
    <section className="relative overflow-hidden py-24 md:py-36">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
      <div className="container relative text-center space-y-8 max-w-3xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm text-primary">
          <Shield className="h-4 w-4" /> Anti-Deepfake Verification on Solana
        </div>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
          Prove you're human.{" "}
          <span className="text-primary">On-chain.</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          Verified Digital Identity combines webcam liveness detection with Solana wallet authentication
          to create a trustless, portable proof of humanity.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg" className="gap-2">
            <Link to="/verify">
              Get Verified <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/docs">Developer Docs</Link>
          </Button>
        </div>
      </div>
    </section>

    {/* How it works */}
    <section className="py-20 border-t border-border/30">
      <div className="container space-y-12">
        <h2 className="text-3xl font-bold text-center">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((s, i) => (
            <GlassCard key={i} className="text-center space-y-4">
              <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <s.icon className="h-7 w-7 text-primary" />
              </div>
              <div className="text-sm text-primary font-medium">Step {i + 1}</div>
              <h3 className="text-xl font-semibold">{s.title}</h3>
              <p className="text-muted-foreground text-sm">{s.desc}</p>
            </GlassCard>
          ))}
        </div>
      </div>
    </section>

    {/* Features */}
    <section className="py-20 border-t border-border/30">
      <div className="container space-y-12">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-bold">Built for Developers</h2>
          <p className="text-muted-foreground">
            One API to verify any user. Free tier included.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <GlassCard key={i} className="space-y-3">
              <f.icon className="h-8 w-8 text-primary" />
              <h3 className="font-semibold">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </GlassCard>
          ))}
        </div>
      </div>
    </section>

    {/* CTA */}
    <section className="py-20 border-t border-border/30">
      <div className="container">
        <GlassCard className="text-center space-y-6 max-w-2xl mx-auto border-primary/20 animate-pulse-glow">
          <h2 className="text-2xl font-bold">Ready to get verified?</h2>
          <p className="text-muted-foreground">
            Connect your wallet and complete a 30-second liveness check.
          </p>
          <Button asChild size="lg" className="gap-2">
            <Link to="/verify">
              Start Verification <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </GlassCard>
      </div>
    </section>

    {/* Footer */}
    <footer className="border-t border-border/30 py-8">
      <div className="container flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          <span>VerifyID — Anti-Deepfake on Solana</span>
        </div>
        <div className="flex gap-6">
          <Link to="/docs" className="hover:text-foreground transition-colors">API Docs</Link>
          <Link to="/developer" className="hover:text-foreground transition-colors">Developers</Link>
        </div>
      </div>
    </footer>
  </div>
);

export default Index;
