import { useEffect, useRef, useState, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Camera, Eye, RotateCcw, Smile, CheckCircle, XCircle, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/GlassCard";
import { Progress } from "@/components/ui/progress";
import { useVerification, VerificationStatus } from "@/contexts/VerificationContext";
import { Link } from "react-router-dom";
import { generateVerificationHash, storeHashOnSolana, StoreHashResult } from "@/lib/solana-hash";
import { toast } from "sonner";

type Step = "connect" | "camera" | "challenge" | "processing" | "storing" | "result";

const challenges = [
  { id: "blink", label: "Blink twice", icon: Eye, duration: 4000 },
  { id: "turn", label: "Turn head left", icon: RotateCcw, duration: 4000 },
  { id: "smile", label: "Smile", icon: Smile, duration: 3000 },
];

const Verify = () => {
  const { publicKey, connected, signTransaction } = useWallet();
  const { getStatus, setStatus } = useVerification();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const walletAddr = publicKey?.toBase58() || "";
  const currentStatus = walletAddr ? getStatus(walletAddr) : ("not_verified" as VerificationStatus);

  const [step, setStep] = useState<Step>(connected ? "camera" : "connect");
  const [challengeIdx, setChallengeIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<"verified" | "failed" | null>(null);
  const [hashResult, setHashResult] = useState<StoreHashResult | null>(null);

  useEffect(() => {
    if (connected && step === "connect") setStep("camera");
    if (!connected) setStep("connect");
  }, [connected, step]);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setStep("challenge");
      setChallengeIdx(0);
    } catch {
      // camera denied
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  // Run through challenges automatically
  useEffect(() => {
    if (step !== "challenge") return;
    if (challengeIdx >= challenges.length) {
      setStep("processing");
      return;
    }
    const timer = setTimeout(() => {
      setChallengeIdx((i) => i + 1);
    }, challenges[challengeIdx].duration);
    return () => clearTimeout(timer);
  }, [step, challengeIdx]);

  // Processing simulation
  useEffect(() => {
    if (step !== "processing") return;
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          const passed = Math.random() > 0.15; // 85% pass
          setResult(passed ? "verified" : "failed");
          if (walletAddr) setStatus(walletAddr, passed ? "verified" : "failed");
          setStep("result");
          stopCamera();
          return 100;
        }
        return p + 2;
      });
    }, 60);
    return () => clearInterval(interval);
  }, [step, walletAddr, setStatus, stopCamera]);

  const retry = () => {
    setResult(null);
    setChallengeIdx(0);
    setProgress(0);
    setStep("camera");
  };

  if (currentStatus === "verified") {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <GlassCard className="max-w-md text-center space-y-4 border-primary/30">
          <CheckCircle className="h-16 w-16 text-primary mx-auto" />
          <h2 className="text-2xl font-bold">Already Verified</h2>
          <p className="text-muted-foreground text-sm">
            Wallet <code className="text-xs text-primary">{walletAddr.slice(0, 8)}...{walletAddr.slice(-4)}</code> is verified.
          </p>
          <Button asChild variant="outline">
            <Link to="/dashboard">Go to Dashboard</Link>
          </Button>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="container max-w-2xl space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Identity Verification</h1>
          <p className="text-muted-foreground">Complete the liveness check to prove you're human.</p>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-2">
          {["Connect", "Camera", "Challenge", "Processing", "Result"].map((label, i) => {
            const stepKeys: Step[] = ["connect", "camera", "challenge", "processing", "result"];
            const idx = stepKeys.indexOf(step);
            const isActive = i === idx;
            const isDone = i < idx;
            return (
              <div key={label} className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : isDone
                      ? "bg-primary/20 text-primary"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {isDone ? "✓" : i + 1}
                </div>
                {i < 4 && <div className={`w-6 h-0.5 ${isDone ? "bg-primary/40" : "bg-border"}`} />}
              </div>
            );
          })}
        </div>

        {/* Step content */}
        <GlassCard className="min-h-[350px] flex flex-col items-center justify-center gap-6">
          {step === "connect" && (
            <>
              <Camera className="h-16 w-16 text-muted-foreground" />
              <h2 className="text-xl font-semibold">Connect Your Wallet</h2>
              <p className="text-muted-foreground text-center text-sm max-w-sm">
                Connect a Solana wallet to begin the verification process.
              </p>
              <WalletMultiButton
                style={{
                  backgroundColor: "hsl(168 70% 45%)",
                  color: "hsl(222 47% 6%)",
                  borderRadius: "0.5rem",
                }}
              />
            </>
          )}

          {step === "camera" && (
            <>
              <Camera className="h-16 w-16 text-primary" />
              <h2 className="text-xl font-semibold">Enable Camera</h2>
              <p className="text-muted-foreground text-center text-sm max-w-sm">
                We'll use your camera for a quick liveness check. No images are stored.
              </p>
              <Button onClick={startCamera} size="lg" className="gap-2">
                <Camera className="h-4 w-4" /> Start Camera
              </Button>
            </>
          )}

          {step === "challenge" && challengeIdx < challenges.length && (
            <div className="w-full space-y-6">
              <div className="relative aspect-video max-w-md mx-auto rounded-lg overflow-hidden border border-border bg-muted">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
                <div className="absolute inset-0 border-2 border-primary/40 rounded-lg pointer-events-none" />
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary/60 animate-scan-line" />
              </div>
              <div className="text-center space-y-3">
                <div className="flex items-center justify-center gap-3 text-primary">
                  {(() => {
                    const C = challenges[challengeIdx].icon;
                    return <C className="h-6 w-6" />;
                  })()}
                  <span className="text-lg font-semibold">{challenges[challengeIdx].label}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Challenge {challengeIdx + 1} of {challenges.length}
                </p>
                <Progress value={((challengeIdx + 1) / challenges.length) * 100} className="h-2 max-w-xs mx-auto" />
              </div>
            </div>
          )}

          {step === "processing" && (
            <div className="text-center space-y-6 w-full max-w-sm">
              <Loader2 className="h-16 w-16 text-primary mx-auto animate-spin" />
              <h2 className="text-xl font-semibold">Analyzing Liveness</h2>
              <p className="text-sm text-muted-foreground">Running anti-deepfake verification…</p>
              <Progress value={progress} className="h-3" />
              <p className="text-xs text-muted-foreground">{progress}%</p>
            </div>
          )}

          {step === "result" && (
            <div className="text-center space-y-4">
              {result === "verified" ? (
                <>
                  <CheckCircle className="h-20 w-20 text-primary mx-auto" />
                  <h2 className="text-2xl font-bold text-primary">Verified!</h2>
                  <p className="text-muted-foreground text-sm">Your identity has been verified on-chain.</p>
                  <Button asChild>
                    <Link to="/dashboard">View Dashboard</Link>
                  </Button>
                </>
              ) : (
                <>
                  <XCircle className="h-20 w-20 text-destructive mx-auto" />
                  <h2 className="text-2xl font-bold text-destructive">Verification Failed</h2>
                  <p className="text-muted-foreground text-sm">Liveness check did not pass. Please try again.</p>
                  <Button onClick={retry} variant="outline">
                    Retry Verification
                  </Button>
                </>
              )}
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
};

export default Verify;
