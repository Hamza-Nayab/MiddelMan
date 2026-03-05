import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";

interface UsernameCheckResult {
  available: boolean;
  suggestions: string[];
}

/**
 * Hook to check username availability with debouncing and caching
 * Returns: { status, available, suggestions, isChecking }
 * status: "idle" | "checking" | "available" | "taken" | "invalid"
 */
export function useUsernameAvailability(username: string) {
  const [status, setStatus] = useState<
    "idle" | "checking" | "available" | "taken" | "invalid"
  >("idle");
  const [debouncedUsername, setDebouncedUsername] = useState("");

  // Validate username format
  const isValidFormat =
    username.length >= 5 &&
    username.length <= 20 &&
    /^[a-z0-9._-]+$/.test(username) &&
    username === username.toLowerCase();

  // Debounce username input
  useEffect(() => {
    if (!isValidFormat) {
      setStatus("idle");
      setDebouncedUsername("");
      return;
    }

    setStatus("checking");
    const timer = setTimeout(() => {
      setDebouncedUsername(username);
    }, 350);

    return () => clearTimeout(timer);
  }, [username, isValidFormat]);

  // Check availability after debounce
  const { data, isLoading, error } = useQuery({
    queryKey: ["username-check", debouncedUsername],
    queryFn: async (): Promise<UsernameCheckResult> => {
      if (!debouncedUsername) return { available: false, suggestions: [] };
      const result = await api.checkUsername(debouncedUsername);
      return result;
    },
    enabled: !!debouncedUsername && isValidFormat,
    staleTime: 60 * 1000, // Cache for 60s
    gcTime: 5 * 60 * 1000, // 5 min cache time
  });

  // Update status based on query state
  useEffect(() => {
    if (!isValidFormat && username.length > 0) {
      setStatus("invalid");
      return;
    }

    if (isLoading && debouncedUsername) {
      setStatus("checking");
      return;
    }

    if (data) {
      setStatus(data.available ? "available" : "taken");
      return;
    }

    if (error) {
      setStatus("idle");
      return;
    }

    if (!debouncedUsername) {
      setStatus("idle");
    }
  }, [
    isLoading,
    data,
    error,
    isValidFormat,
    username.length,
    debouncedUsername,
  ]);

  return {
    status,
    available: status === "available",
    suggestions: data?.suggestions ?? [],
    isChecking: status === "checking",
    isValidFormat,
  };
}
