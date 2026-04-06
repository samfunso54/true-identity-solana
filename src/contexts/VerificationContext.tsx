import { createContext, useContext, useState, ReactNode, useCallback, useRef } from "react";

export type VerificationStatus = "not_verified" | "pending" | "verified" | "failed";

interface VerificationRecord {
  walletAddress: string;
  status: VerificationStatus;
  timestamp: string | null;
  txSignature?: string;
}

interface VerificationContextType {
  records: Record<string, VerificationRecord>;
  getStatus: (wallet: string) => VerificationStatus;
  setStatus: (wallet: string, status: VerificationStatus, txSignature?: string) => void;
  apiKeys: string[];
  generateApiKey: () => string | null;
}

const MAX_API_KEYS = 5;

const VerificationContext = createContext<VerificationContextType | null>(null);

export const useVerification = () => {
  const ctx = useContext(VerificationContext);
  if (!ctx) throw new Error("useVerification must be inside VerificationProvider");
  return ctx;
};

export const VerificationProvider = ({ children }: { children: ReactNode }) => {
  const [records, setRecords] = useState<Record<string, VerificationRecord>>({});
  const [apiKeys, setApiKeys] = useState<string[]>([]);
  // Rate limit: track last key generation time
  const lastKeyGenTime = useRef<number>(0);

  const getStatus = useCallback(
    (wallet: string): VerificationStatus => records[wallet]?.status || "not_verified",
    [records]
  );

  const setStatus = useCallback((wallet: string, status: VerificationStatus, txSignature?: string) => {
    setRecords((prev) => ({
      ...prev,
      [wallet]: {
        walletAddress: wallet,
        status,
        timestamp: status === "verified" ? new Date().toISOString() : prev[wallet]?.timestamp || null,
        ...(txSignature ? { txSignature } : {}),
      },
    }));
  }, []);

  const generateApiKey = useCallback(() => {
    // Rate limit: one key per 5 seconds
    const now = Date.now();
    if (now - lastKeyGenTime.current < 5000) {
      return null;
    }

    // Cap total keys
    if (apiKeys.length >= MAX_API_KEYS) {
      return null;
    }

    lastKeyGenTime.current = now;

    const key = `vdi_${Array.from(crypto.getRandomValues(new Uint8Array(24)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")}`;
    setApiKeys((prev) => [...prev, key]);
    return key;
  }, [apiKeys.length]);

  return (
    <VerificationContext.Provider value={{ records, getStatus, setStatus, apiKeys, generateApiKey }}>
      {children}
    </VerificationContext.Provider>
  );
};
