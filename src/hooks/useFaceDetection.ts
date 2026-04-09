import { useEffect, useRef, useState, useCallback } from "react";
import * as faceapi from "face-api.js";

const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/model";

export type ChallengeType = "blink" | "turn" | "smile";

interface FaceDetectionState {
  modelsLoaded: boolean;
  loading: boolean;
  error: string | null;
  detected: Record<ChallengeType, boolean>;
  confidence: Record<ChallengeType, number>;
}

// Eye Aspect Ratio for blink detection
function getEAR(eye: faceapi.Point[]): number {
  const vertical1 = Math.hypot(eye[1].x - eye[5].x, eye[1].y - eye[5].y);
  const vertical2 = Math.hypot(eye[2].x - eye[4].x, eye[2].y - eye[4].y);
  const horizontal = Math.hypot(eye[0].x - eye[3].x, eye[0].y - eye[3].y);
  return (vertical1 + vertical2) / (2 * horizontal);
}

export function useFaceDetection(
  videoRef: React.RefObject<HTMLVideoElement>,
  activeChallenge: ChallengeType | null,
  isRunning: boolean
) {
  const [state, setState] = useState<FaceDetectionState>({
    modelsLoaded: false,
    loading: true,
    error: null,
    detected: { blink: false, turn: false, smile: false },
    confidence: { blink: 0, turn: 0, smile: 0 },
  });

  const blinkStateRef = useRef<{ closed: boolean; count: number }>({ closed: false, count: 0 });
  const animFrameRef = useRef<number>(0);
  const detectedRef = useRef<Record<ChallengeType, boolean>>({ blink: false, turn: false, smile: false });

  // Load models once
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
        ]);
        if (!cancelled) {
          setState((s) => ({ ...s, modelsLoaded: true, loading: false }));
        }
      } catch (err) {
        if (!cancelled) {
          setState((s) => ({
            ...s,
            loading: false,
            error: err instanceof Error ? err.message : "Failed to load face detection models",
          }));
        }
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const resetDetection = useCallback(() => {
    blinkStateRef.current = { closed: false, count: 0 };
    detectedRef.current = { blink: false, turn: false, smile: false };
    setState((s) => ({
      ...s,
      detected: { blink: false, turn: false, smile: false },
      confidence: { blink: 0, turn: 0, smile: 0 },
    }));
  }, []);

  // Detection loop
  useEffect(() => {
    if (!state.modelsLoaded || !isRunning || !activeChallenge) return;

    const video = videoRef.current;
    if (!video) return;

    const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 });

    const detect = async () => {
      if (!video || video.paused || video.ended || video.readyState < 2) {
        animFrameRef.current = requestAnimationFrame(detect);
        return;
      }

      try {
        const result = await faceapi
          .detectSingleFace(video, options)
          .withFaceLandmarks(true) // true = use tiny model
          .withFaceExpressions();

        if (result) {
          const landmarks = result.landmarks;
          const expressions = result.expressions;
          const positions = landmarks.positions;

          // --- Blink detection ---
          if (activeChallenge === "blink") {
            const leftEye = positions.slice(36, 42);
            const rightEye = positions.slice(42, 48);
            const ear = (getEAR(leftEye) + getEAR(rightEye)) / 2;

            if (ear < 0.21) {
              if (!blinkStateRef.current.closed) {
                blinkStateRef.current.closed = true;
              }
            } else {
              if (blinkStateRef.current.closed) {
                blinkStateRef.current.count += 1;
                blinkStateRef.current.closed = false;
              }
            }

            const blinkConf = Math.min(blinkStateRef.current.count / 2, 1);
            const blinkDetected = blinkStateRef.current.count >= 2;

            if (blinkDetected && !detectedRef.current.blink) {
              detectedRef.current.blink = true;
            }

            setState((s) => ({
              ...s,
              confidence: { ...s.confidence, blink: blinkConf },
              detected: { ...s.detected, blink: detectedRef.current.blink },
            }));
          }

          // --- Head turn left detection ---
          if (activeChallenge === "turn") {
            const box = result.detection.box;
            const nose = positions[30]; // nose tip
            const faceCenterX = box.x + box.width / 2;
            // When head turns left, nose moves to the right of center (mirrored video)
            // In non-mirrored coordinates: nose moves left of center
            const offset = (faceCenterX - nose.x) / box.width;
            const turnConf = Math.min(Math.max(offset / 0.15, 0), 1);
            const turnDetected = offset > 0.12;

            if (turnDetected && !detectedRef.current.turn) {
              detectedRef.current.turn = true;
            }

            setState((s) => ({
              ...s,
              confidence: { ...s.confidence, turn: turnConf },
              detected: { ...s.detected, turn: detectedRef.current.turn },
            }));
          }

          // --- Smile detection ---
          if (activeChallenge === "smile") {
            const smileConf = expressions.happy || 0;
            const smileDetected = smileConf > 0.6;

            if (smileDetected && !detectedRef.current.smile) {
              detectedRef.current.smile = true;
            }

            setState((s) => ({
              ...s,
              confidence: { ...s.confidence, smile: smileConf },
              detected: { ...s.detected, smile: detectedRef.current.smile },
            }));
          }
        }
      } catch {
        // Detection frame failed, continue
      }

      animFrameRef.current = requestAnimationFrame(detect);
    };

    animFrameRef.current = requestAnimationFrame(detect);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [state.modelsLoaded, isRunning, activeChallenge, videoRef]);

  return { ...state, resetDetection };
}
