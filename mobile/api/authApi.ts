import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";

/**
 * Backend base URL (no trailing slash).
 * - Set `EXPO_PUBLIC_API_URL` in `.env` (recommended), or
 * - Set `expo.extra.apiUrl` in `app.json`, or
 * - In __DEV__, simulators/emulators use sensible defaults (see below).
 */
function resolveApiUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }

  const fromExtra = (
    Constants.expoConfig?.extra as { apiUrl?: string } | undefined
  )?.apiUrl?.trim();
  if (fromExtra) {
    return fromExtra.replace(/\/$/, "");
  }

  if (__DEV__) {
    if (Platform.OS === "web") {
      return "http://127.0.0.1:8000";
    }
    if (Platform.OS === "android" && !Constants.isDevice) {
      return "http://10.0.2.2:8000";
    }
    if (Platform.OS === "ios" && !Constants.isDevice) {
      return "http://127.0.0.1:8000";
    }
    // Real phone/tablet: you must set EXPO_PUBLIC_API_URL (or expo.extra.apiUrl) to your Mac/PC LAN IP.
    if (Constants.isDevice) {
      return "http://192.168.0.18:8000";
    }
  }

  return "http://127.0.0.1:8000";
}

export const API_URL = resolveApiUrl();

function isNetworkError(err: unknown): boolean {
  if (!(err instanceof TypeError)) {
    return false;
  }
  return ["Failed to fetch", "Network request failed", "Load failed"].includes(
    err.message,
  );
}

export async function register(data: {
  email: string;
  password: string;
  full_name: string;
  role: string;
}) {
  try {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      let errorData;
      try {
        errorData = await res.json();
      } catch {
        errorData = {
          detail: `Registration failed: ${res.status} ${res.statusText}`,
        };
      }
      throw new Error(errorData.detail || "Registration failed");
    }

    return res.json();
  } catch (err) {
    if (isNetworkError(err)) {
      throw new Error(
        `Cannot connect to server at ${API_URL}. Start backend with host 0.0.0.0 (e.g. uvicorn ... --host 0.0.0.0 --port 8000). On a phone, set EXPO_PUBLIC_API_URL to http://<your-computer-LAN-ip>:8000 and use the same Wi‑Fi. Android needs a dev rebuild after cleartext settings.`,
      );
    }
    throw err;
  }
}

export async function login(email: string, password: string) {
  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      let errorData;
      try {
        errorData = await res.json();
      } catch {
        errorData = { detail: `Login failed: ${res.status} ${res.statusText}` };
      }
      throw new Error(errorData.detail || "Invalid credentials");
    }

    const data = await res.json();
    if (data.access_token) {
      await AsyncStorage.setItem("token", data.access_token);
      if (data.refresh_token) {
        await AsyncStorage.setItem("refresh_token", data.refresh_token);
      }
      // Fetch and store user role after login
      try {
        const userData = await getMe();
        if (userData.role) {
          await AsyncStorage.setItem("user_role", userData.role);
        }
      } catch (err) {
        console.error("Failed to fetch user role:", err);
      }
    }
    return data;
  } catch (err) {
    if (isNetworkError(err)) {
      throw new Error(
        `Cannot connect to server at ${API_URL}. Start backend with host 0.0.0.0 (e.g. uvicorn ... --host 0.0.0.0 --port 8000). On a phone, set EXPO_PUBLIC_API_URL to http://<your-computer-LAN-ip>:8000 and use the same Wi‑Fi. Android needs a dev rebuild after cleartext settings.`,
      );
    }
    throw err;
  }
}

export async function getMe() {
  const token = await AsyncStorage.getItem("token");
  if (!token) {
    throw new Error("No token found");
  }

  const res = await fetch(`${API_URL}/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch user data");
  }

  const userData = await res.json();
  // Store role in AsyncStorage
  if (userData.role) {
    await AsyncStorage.setItem("user_role", userData.role);
  }
  return userData;
}

// Utility function to get user role from AsyncStorage
export async function getUserRole(): Promise<string | null> {
  return await AsyncStorage.getItem("user_role");
}

// Utility function to check if user is a teacher
export async function isTeacher(): Promise<boolean> {
  return (await getUserRole()) === "teacher";
}

// Utility function to check if user is a student
export async function isStudent(): Promise<boolean> {
  return (await getUserRole()) === "student";
}

export interface UserUpdate {
  full_name?: string;
  email?: string;
  password?: string;
}

export async function updateProfile(data: UserUpdate) {
  const token = await AsyncStorage.getItem("token");
  if (!token) {
    throw new Error("No token found");
  }

  const res = await fetch(`${API_URL}/auth/me`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    let errorData;
    try {
      errorData = await res.json();
    } catch {
      errorData = { detail: `Update failed: ${res.status} ${res.statusText}` };
    }
    throw new Error(errorData.detail || "Failed to update profile");
  }

  const userData = await res.json();
  // Update role in AsyncStorage if it changed
  if (userData.role) {
    await AsyncStorage.setItem("user_role", userData.role);
  }
  return userData;
}
