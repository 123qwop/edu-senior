import AsyncStorage from "@react-native-async-storage/async-storage";

import { API_URL } from "./apiConfig";

/** FastAPI may return `detail` as a string or a list of validation errors. */
function formatFastApiDetail(detail: unknown): string {
  if (detail == null) {
    return "Request failed";
  }
  if (typeof detail === "string") {
    return detail;
  }
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (item && typeof item === "object" && "msg" in item) {
          const loc = Array.isArray((item as { loc?: unknown }).loc)
            ? `${(item as { loc: (string | number)[] }).loc.join(".")}: `
            : "";
          return `${loc}${(item as { msg: string }).msg}`;
        }
        try {
          return JSON.stringify(item);
        } catch {
          return String(item);
        }
      })
      .join("\n");
  }
  return String(detail);
}

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
      throw new Error(
        formatFastApiDetail(errorData.detail) || "Registration failed",
      );
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
      throw new Error(
        formatFastApiDetail(errorData.detail) || "Invalid credentials",
      );
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
