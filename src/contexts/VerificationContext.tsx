import { createContext, useContext, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type VerificationStatus = "not_verified" | "pending" | "verified" | "failed";

interface VerificationRecord {
  walletAddress: string;
  status: VerificationStatus;
  timestamp: string | null;
  txSignature?: string;
}

interface ApiKey {
  id: string;
  api_key: string;
  label: string | null;
  created_at: string;
  last_used_at: string | null;
  is_active: boolean;
}

interface VerificationContextType {
  records: Record<string, VerificationRecord>;
  getStatus: (wallet: string) => VerificationStatus;
  setStatus: (wallet: string, status: VerificationStatus, txSignature?: string) => void;
  fetchStatus: (wallet: string) => Promise<VerificationStatus>;
  persistVerification: (wallet: string, txSignature: string, hash: string, nonce: string, challengeProof: string) => Promise<void>;
  apiKeys: ApiKey[];
  fetchApiKeys: (wallet: string) => Promise<void>;
  generateApiKey: (wallet: string) => Promise<string | null>;
}

const VerificationContext = createContext<VerificationContextType | null>(null);

export const useVerification = () => {
  const ctx = useContext(VerificationContext);
  if (!ctx) throw new Error("useVerification must be inside VerificationProvider");
  return ctx;
};

export const VerificationProvider = ({ children }: { children: ReactNode }) => {
  const [records, setRecords] = useState<Record<string, VerificationRecord>>({});
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);

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

  const fetchStatus = useCallback(async (wallet: string): Promise<VerificationStatus> => {
    try {
      const { data } = await supabase.functions.invoke("verify-status", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        body: null,
      });
      // Edge function uses query params, but supabase.functions.invoke doesn't support them easily
      // Use direct fetch instead
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-status?wallet=${encodeURIComponent(wallet)}`,
        {
          headers: {
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );
      if (!resp.ok) return "not_verified";
      const result = await resp.json();
      const status = result.status as VerificationStatus;
      setRecords((prev) => ({
        ...prev,
        [wallet]: {
          walletAddress: wallet,
          status,
          timestamp: result.verified_at || null,
          txSignature: result.tx_signature,
        },
      }));
      return status;
    } catch {
      return "not_verified";
    }
  }, []);

  const persistVerification = useCallback(async (
    wallet: string,
    txSignature: string,
    hash: string,
    nonce: string,
    challengeProof: string
  ) => {
    const resp = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-complete`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          wallet_address: wallet,
          tx_signature: txSignature,
          hash,
          nonce,
          challenge_proof: challengeProof,
        }),
      }
    );
    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err.error || "Failed to persist verification");
    }
  }, []);

  const fetchApiKeys = useCallback(async (wallet: string) => {
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-api-keys?wallet=${encodeURIComponent(wallet)}&action=list`,
        {
          headers: { "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        }
      );
      if (!resp.ok) return;
      const result = await resp.json();
      setApiKeys(result.keys || []);
    } catch {
      // silent
    }
  }, []);

  const generateApiKey = useCallback(async (wallet: string): Promise<string | null> => {
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-api-keys?wallet=${encodeURIComponent(wallet)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );
      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || "Failed to generate key");
      }
      const result = await resp.json();
      await fetchApiKeys(wallet);
      return result.api_key;
    } catch {
      return null;
    }
  }, [fetchApiKeys]);

  return (
    <VerificationContext.Provider value={{
      records, getStatus, setStatus, fetchStatus, persistVerification,
      apiKeys, fetchApiKeys, generateApiKey,
    }}>
      {children}
    </VerificationContext.Provider>
  );
};
