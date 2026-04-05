import { createContext, useContext, useState, ReactNode, useCallback } from "react";

export type VerificationStatus = "not_verified" | "pending" | "verified" | "failed";

interface VerificationRecord {
  walletAddress: string;
  status: VerificationStatus;
  timestamp: string | null;
}

interface VerificationContextType {
  records: Record<string, VerificationRecord>;
  getStatus: (wallet: string) => VerificationStatus;
  setStatus: (wallet: string, status: VerificationStatus) => void;
  apiKeys: string[];
  generateApiKey: () => string;
}

const VerificationContext = createContext<VerificationContextType | null>(null);

export const useVerification = () => {
  const ctx = useContext(VerificationContext);
  if (!ctx) throw new Error("useVerification must be inside VerificationProvider");
  return ctx;
};

export const VerificationProvider = ({ children }: { children: ReactNode }) => {
  const [records, setRecords] = useState<Record<string, VerificationRecord>>({});
  const [apiKeys, setApiKeys] = useState<string[]>([]);

  const getStatus = useCallback(
    (wallet: string): VerificationStatus => records[wallet]?.status || "not_verified",
    [records]
  );

  const setStatus = useCallback((wallet: string, status: VerificationStatus) => {
    setRecords((prev) => ({
      ...prev,
      [wallet]: {
        walletAddress: wallet,
        status,
        timestamp: status === "verified" ? new Date().toISOString() : prev[wallet]?.timestamp || null,
      },
    }));
  }, []);

  const generateApiKey = useCallback(() => {
    const key = `vdi_${Array.from(crypto.getRandomValues(new Uint8Array(24)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")}`;
    setApiKeys((prev) => [...prev, key]);
    return key;
  }, []);

  return (
    <VerificationContext.Provider value={{ records, getStatus, setStatus, apiKeys, generateApiKey }}>
      {children}
    </VerificationContext.Provider>
  );
};
