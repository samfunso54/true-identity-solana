import { useEffect, useRef, useState, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Camera, Eye, RotateCcw, Smile, CheckCircle, XCircle, Loader2, ExternalLink, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/GlassCard";
import { Progress } from "@/components/ui/progress";
import { useVerification, VerificationStatus } from "@/contexts/VerificationContext";
import { Link } from "react-router-dom";
import { generateVerificationHash, storeHashOnSolana, StoreHashResult } from "@/lib/solana-hash";
import { toast } from "sonner";
import { useFaceDetection, ChallengeType } from "@/hooks/useFaceDetection";

type Step = "connect" | "camera" | "loading_models" | "challenge" | "processing" | "storing" | "result";

const challenges: { id: ChallengeType; label: string; icon: React.ComponentType<{ className?: string }>; instruction: string }[] = [
  { id: "blink", label: "Blink twice", icon: Eye, instruction: "Look at the camera and blink your eyes twice" },
  { id: "turn", label: "Turn head left", icon: RotateCcw, instruction: "Slowly turn your head to your left" },
  { id: "smile", label: "Smile", icon: Smile, instruction: "Give the camera a natural smile" },
];

function buildChallengeProof(completedChallenges: string[], wallet: string): string {
  return `${wallet}:${completedChallenges.join(",")}:${challenges.length}`;
}

const Verify = () => {
  const { publicKey, connected, signTransaction } = useWallet();
  const { getStatus, setStatus, fetchStatus, persistVerification } = useVerification();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const walletAddr = publicKey?.toBase58() || "";
  const currentStatus = walletAddr ? getStatus(walletAddr) : ("not_verified" as VerificationStatus);

  const [step, setStep] = useState<Step>(connected ? "camera" : "connect");
  const [challengeIdx, setChallengeIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<"verified" | "failed" | null>(null);
  const [hashResult, setHashResult] = useState<StoreHashResult | null>(null);
  const [completedChallenges, setCompletedChallenges] = useState<string[]>([]);
  const [snapshots, setSnapshots] = useState<string[]>([]);
  const [challengeTimeout, setChallengeTimeout] = useState(false);

  const activeChallenge = step === "challenge" && challengeIdx < challenges.length
    ? challenges[challengeIdx].id
    : null;

  const {
    modelsLoaded,
    loading: modelsLoading,
    error: modelsError,
    detected,
    confidence,
    resetDetection,
  } = useFaceDetection(videoRef, activeChallenge, step === "challenge");

  // Check backend status on mount
  useEffect(() => {
    if (walletAddr) fetchStatus(walletAddr);
  }, [walletAddr, fetchStatus]);

  useEffect(() => {
    if (connected && step === "connect") setStep("camera");
    if (!connected) setStep("connect");
  }, [connected, step]);

  // Attach stream to video element when challenge step mounts
  useEffect(() => {
    if (step === "challenge" && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [step, challengeIdx]);

  // When a challenge is detected, auto-advance after a short delay
  useEffect(() => {
    if (step !== "challenge" || !activeChallenge) return;
    if (!detected[activeChallenge]) return;

    const snap = captureSnapshot();
    if (snap) setSnapshots((prev) => [...prev, snap]);

    const timer = setTimeout(() => {
      setCompletedChallenges((prev) => [...prev, activeChallenge]);
      resetDetection();
      setChallengeTimeout(false);
      setChallengeIdx((i) => i + 1);
    }, 500); // brief pause so user sees the green check

    return () => clearTimeout(timer);
  }, [step, activeChallenge, detected, resetDetection]);

  // Challenge timeout — give user 15 seconds per challenge
  useEffect(() => {
    if (step !== "challenge" || !activeChallenge) return;
    if (detected[activeChallenge]) return;
    setChallengeTimeout(false);

    const timer = setTimeout(() => {
      setChallengeTimeout(true);
    }, 15000);

    return () => clearTimeout(timer);
  }, [step, challengeIdx, activeChallenge, detected]);

  // When all challenges done, move to processing
  useEffect(() => {
    if (step === "challenge" && challengeIdx >= challenges.length) {
      setStep("processing");
    }
  }, [step, challengeIdx]);

  const captureSnapshot = useCallback((): string | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.videoWidth === 0) return null;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.8);
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      streamRef.current = stream;

      if (!modelsLoaded) {
        setStep("loading_models");
      } else {
        setStep("challenge");
        setChallengeIdx(0);
        setSnapshots([]);
        resetDetection();
      }
    } catch {
      toast.error("Camera access denied. Please allow camera access to verify.");
    }
  }, [modelsLoaded, resetDetection]);

  // Move from loading_models to challenge once loaded
  useEffect(() => {
    if (step === "loading_models" && modelsLoaded) {
      setStep("challenge");
      setChallengeIdx(0);
      setSnapshots([]);
      resetDetection();
    }
  }, [step, modelsLoaded, resetDetection]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  // Processing animation
  useEffect(() => {
    if (step !== "processing") return;
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          setStep("storing");
          stopCamera();
          return 100;
        }
        return p + 2;
      });
    }, 60);
    return () => clearInterval(interval);
  }, [step, stopCamera]);

  // Store hash on Solana + persist to backend
  useEffect(() => {
    if (step !== "storing" || !walletAddr || !publicKey || !signTransaction) return;
    let cancelled = false;

    const store = async () => {
      try {
        const challengeProof = buildChallengeProof(completedChallenges, walletAddr);
        toast.info("Generating verification hash…");
        const { hash, nonce } = await generateVerificationHash(walletAddr, challengeProof);
        toast.info("Please approve the transaction in your wallet");
        const res = await storeHashOnSolana(hash, nonce, publicKey, signTransaction);
        if (cancelled) return;

        await persistVerification(walletAddr, res.signature, res.hash, res.nonce, challengeProof);

        setHashResult(res);
        setResult("verified");
        setStatus(walletAddr, "verified", res.signature);
        toast.success("Verification hash stored on Solana!");
      } catch (err: unknown) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("Failed to store hash on Solana:", message);
        toast.error(message || "Failed to store hash on-chain. You can retry.");
        setResult("failed");
        setStatus(walletAddr, "failed");
      } finally {
        if (!cancelled) setStep("result");
      }
    };

    store();
    return () => { cancelled = true; };
  }, [step, walletAddr, publicKey, signTransaction, setStatus, completedChallenges, persistVerification]);

  const retry = () => {
    setResult(null);
    setHashResult(null);
    setChallengeIdx(0);
    setCompletedChallenges([]);
    setSnapshots([]);
    setProgress(0);
    setChallengeTimeout(false);
    resetDetection();
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

  const stepKeys: Step[] = ["connect", "camera", "challenge", "processing", "storing", "result"];
  const stepLabels = ["Connect", "Camera", "Challenge", "Processing", "On-Chain", "Result"];

  return (
    <div className="min-h-screen pt-24 pb-12">
      <canvas ref={canvasRef} className="hidden" />

      <div className="container max-w-2xl space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Identity Verification</h1>
          <p className="text-muted-foreground">Complete the liveness check to prove you're human.</p>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-2">
          {stepLabels.map((label, i) => {
            const currentStepForIndicator = step === "loading_models" ? "camera" : step;
            const idx = stepKeys.indexOf(currentStepForIndicator);
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
                {i < 5 && <div className={`w-6 h-0.5 ${isDone ? "bg-primary/40" : "bg-border"}`} />}
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
                We'll use your camera for a real-time liveness check using face detection AI. No images are stored.
              </p>
              {modelsError && (
                <p className="text-destructive text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" /> {modelsError}
                </p>
              )}
              <Button onClick={startCamera} size="lg" className="gap-2" disabled={!!modelsError}>
                <Camera className="h-4 w-4" /> Start Camera
              </Button>
            </>
          )}

          {step === "loading_models" && (
            <div className="text-center space-y-4">
              <Loader2 className="h-16 w-16 text-primary mx-auto animate-spin" />
              <h2 className="text-xl font-semibold">Loading Face Detection</h2>
              <p className="text-sm text-muted-foreground">Downloading AI models for liveness detection…</p>
              {modelsLoading && <Progress value={50} className="h-2 max-w-xs mx-auto animate-pulse" />}
            </div>
          )}

          {step === "challenge" && challengeIdx < challenges.length && (
            <div className="w-full space-y-5">
              <div className="relative aspect-video max-w-md mx-auto rounded-lg overflow-hidden border border-border bg-muted">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
                <div className="absolute inset-0 border-2 border-primary/40 rounded-lg pointer-events-none" />
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary/60 animate-scan-line" />

                {/* Detection confidence indicator */}
                {activeChallenge && (
                  <div className="absolute bottom-2 left-2 right-2">
                    <div className="bg-background/80 backdrop-blur-sm rounded-md p-2">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Detection confidence</span>
                        <span className={`font-semibold ${detected[activeChallenge] ? "text-primary" : "text-foreground"}`}>
                          {detected[activeChallenge] ? "✓ Detected!" : `${Math.round(confidence[activeChallenge] * 100)}%`}
                        </span>
                      </div>
                      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            detected[activeChallenge] ? "bg-primary" : "bg-primary/60"
                          }`}
                          style={{ width: `${detected[activeChallenge] ? 100 : confidence[activeChallenge] * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Completed challenge snapshots */}
              {snapshots.length > 0 && (
                <div className="flex justify-center gap-3">
                  {snapshots.map((snap, i) => (
                    <div key={i} className="relative">
                      <img
                        src={snap}
                        alt={`Challenge ${challenges[i]?.label} snapshot`}
                        className="w-16 h-16 rounded-md object-cover border border-primary/30"
                      />
                      <CheckCircle className="absolute -top-1 -right-1 h-4 w-4 text-primary bg-background rounded-full" />
                    </div>
                  ))}
                </div>
              )}

              <div className="text-center space-y-3">
                <div className="flex items-center justify-center gap-3 text-primary">
                  {(() => {
                    const C = challenges[challengeIdx].icon;
                    return <C className="h-6 w-6" />;
                  })()}
                  <span className="text-lg font-semibold">{challenges[challengeIdx].label}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {challenges[challengeIdx].instruction}
                </p>
                <p className="text-xs text-muted-foreground">
                  Challenge {challengeIdx + 1} of {challenges.length}
                </p>
                {challengeTimeout && !detected[activeChallenge!] && (
                  <p className="text-xs text-yellow-400 flex items-center justify-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Taking a while? Make sure your face is well-lit and centered.
                  </p>
                )}
                <Progress value={((challengeIdx + 1) / challenges.length) * 100} className="h-2 max-w-xs mx-auto" />
              </div>
            </div>
          )}

          {step === "processing" && (
            <div className="text-center space-y-6 w-full max-w-sm">
              <Loader2 className="h-16 w-16 text-primary mx-auto animate-spin" />
              <h2 className="text-xl font-semibold">Analyzing Liveness</h2>
              <p className="text-sm text-muted-foreground">All challenges passed. Finalizing verification…</p>

              {snapshots.length > 0 && (
                <div className="flex justify-center gap-3">
                  {snapshots.map((snap, i) => (
                    <div key={i} className="relative">
                      <img
                        src={snap}
                        alt={`${challenges[i]?.label} captured`}
                        className="w-20 h-20 rounded-md object-cover border border-primary/30"
                      />
                      <p className="text-[10px] text-muted-foreground mt-1 text-center">{challenges[i]?.label}</p>
                    </div>
                  ))}
                </div>
              )}

              <Progress value={progress} className="h-3" />
              <p className="text-xs text-muted-foreground">{progress}%</p>
            </div>
          )}

          {step === "storing" && (
            <div className="text-center space-y-6 w-full max-w-sm">
              <Loader2 className="h-16 w-16 text-primary mx-auto animate-spin" />
              <h2 className="text-xl font-semibold">Storing On-Chain</h2>
              <p className="text-sm text-muted-foreground">
                Approve the transaction in your wallet to store your verification hash on Solana.
              </p>
            </div>
          )}

          {step === "result" && (
            <div className="text-center space-y-4">
              {result === "verified" ? (
                <>
                  <CheckCircle className="h-20 w-20 text-primary mx-auto" />
                  <h2 className="text-2xl font-bold text-primary">Verified!</h2>
                  <p className="text-muted-foreground text-sm">Your identity has been verified on-chain.</p>
                  {hashResult && (
                    <div className="bg-muted/50 rounded-lg p-4 text-left space-y-2 text-xs max-w-sm mx-auto">
                      <p className="text-muted-foreground">
                        <span className="font-semibold text-foreground">TX Signature:</span>{" "}
                        <code className="text-primary break-all">{hashResult.signature.slice(0, 20)}…</code>
                      </p>
                      <p className="text-muted-foreground">
                        <span className="font-semibold text-foreground">Hash:</span>{" "}
                        <code className="text-primary break-all">{hashResult.hash.slice(0, 24)}…</code>
                      </p>
                      <a
                        href={hashResult.explorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        View on Solana Explorer <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                  <Button asChild>
                    <Link to="/dashboard">View Dashboard</Link>
                  </Button>
                </>
              ) : (
                <>
                  <XCircle className="h-20 w-20 text-destructive mx-auto" />
                  <h2 className="text-2xl font-bold text-destructive">Verification Failed</h2>
                  <p className="text-muted-foreground text-sm">Something went wrong. Please try again.</p>
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
