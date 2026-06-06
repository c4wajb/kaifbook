"use client";

import { useEffect, useState } from "react";
import { createVkMiniSession, getVkLaunchParams, initVkBridge, isVkMiniAppRuntime, type VkMiniSession } from "@/services/vkBridgeService";

type VkMiniState = {
  ready: boolean;
  bridgeAvailable: boolean;
  inVkRuntime: boolean;
  session: VkMiniSession | null;
  error: string | null;
};

export function useVkMiniApp() {
  const [state, setState] = useState<VkMiniState>({
    ready: false,
    bridgeAvailable: false,
    inVkRuntime: false,
    session: null,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      const launchParams = getVkLaunchParams();
      const bridgeState = await initVkBridge();

      try {
        const session = await createVkMiniSession(launchParams);
        if (!cancelled) {
          setState({
            ready: true,
            bridgeAvailable: bridgeState.available,
            inVkRuntime: isVkMiniAppRuntime(launchParams),
            session,
            error: null,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            ready: true,
            bridgeAvailable: bridgeState.available,
            inVkRuntime: isVkMiniAppRuntime(launchParams),
            session: null,
            error: error instanceof Error ? error.message : "VK Mini App открыто в режиме браузера.",
          });
        }
      }
    }

    boot();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
