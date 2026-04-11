import Constants from "expo-constants";
import { NativeModules, Platform } from "react-native";

const DEFAULT_API_PORT = 8000;

function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, "");
}

function isTunnelOrRelayHost(host: string): boolean {
  const h = host.toLowerCase();
  return (
    h.includes("exp.direct") ||
    h.includes("ngrok") ||
    h.includes("tunnel") ||
    h.endsWith(".expo.dev")
  );
}

/**
 * Metro serves the bundle from your dev machine. The bundle URL usually contains
 * that machine's LAN hostname/IP (e.g. http://192.168.1.5:8081/...), which is
 * the same host that should run uvicorn. This is more reliable than hostUri on
 * some Expo Go builds.
 */
function inferHostFromScriptUrl(): string | null {
  if (Platform.OS === "web") {
    return null;
  }
  try {
    const scriptURL = NativeModules.SourceCode?.scriptURL as string | undefined;
    if (!scriptURL || typeof scriptURL !== "string") {
      return null;
    }
    const m = scriptURL.match(/^https?:\/\/([^/:?]+)/);
    const host = m?.[1]?.trim();
    if (!host || host === "localhost" || host === "127.0.0.1") {
      return null;
    }
    if (isTunnelOrRelayHost(host)) {
      return null;
    }
    return host;
  } catch {
    return null;
  }
}

/**
 * In dev, Expo Go / dev client exposes the packager host in several places.
 * Prefer the first usable LAN-style host.
 */
function inferLanHostFromExpo(): string | null {
  const rawCandidates: (string | undefined)[] = [
    (Constants.expoConfig as { hostUri?: string } | null | undefined)?.hostUri,
    (Constants.manifest as { debuggerHost?: string } | null | undefined)
      ?.debuggerHost,
    (Constants.expoGoConfig as { debuggerHost?: string } | null | undefined)
      ?.debuggerHost,
    (
      Constants.manifest2 as
        | { extra?: { expoClient?: { hostUri?: string } } }
        | null
        | undefined
    )?.extra?.expoClient?.hostUri,
  ];

  for (const raw of rawCandidates) {
    if (!raw || typeof raw !== "string") {
      continue;
    }
    const host = raw.split(":")[0]?.trim();
    if (!host || host === "localhost" || host === "127.0.0.1") {
      continue;
    }
    if (isTunnelOrRelayHost(host)) {
      continue;
    }
    return host;
  }

  return inferHostFromScriptUrl();
}

export function resolveApiUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (fromEnv) {
    return stripTrailingSlash(fromEnv);
  }

  const fromExtra = (
    Constants.expoConfig?.extra as { apiUrl?: string } | undefined
  )?.apiUrl?.trim();
  if (fromExtra) {
    return stripTrailingSlash(fromExtra);
  }

  if (__DEV__) {
    if (Platform.OS === "web") {
      return `http://127.0.0.1:${DEFAULT_API_PORT}`;
    }

    /**
     * IMPORTANT: Try Metro-derived host BEFORE any `10.0.2.2` shortcut.
     * `10.0.2.2` only works inside the Android emulator. Some real phones
     * incorrectly report `Constants.isDevice === false`; if we returned
     * `10.0.2.2` first, the app would never reach your PC on the LAN.
     */
    const inferred = inferLanHostFromExpo();
    if (inferred) {
      return `http://${inferred}:${DEFAULT_API_PORT}`;
    }

    // Simulators / emulators when Metro did not expose a host (rare)
    if (Platform.OS === "android" && !Constants.isDevice) {
      return `http://10.0.2.2:${DEFAULT_API_PORT}`;
    }
    if (Platform.OS === "ios" && !Constants.isDevice) {
      return `http://127.0.0.1:${DEFAULT_API_PORT}`;
    }

    console.warn(
      "[apiConfig] Could not infer API host from Expo/Metro. Set EXPO_PUBLIC_API_URL in mobile/.env to the same origin you use for /docs (e.g. http://192.168.x.x:8000). Required for Expo tunnel or if the packager URL is missing.",
    );
  }

  return `http://127.0.0.1:${DEFAULT_API_PORT}`;
}

export const API_URL = resolveApiUrl();

if (__DEV__) {
  console.log("[apiConfig] API_URL =", API_URL);
}
