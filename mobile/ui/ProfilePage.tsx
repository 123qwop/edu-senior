import { getMe } from "@/api/authApi";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, Stack } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ProfilePage() {
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const loadUser = useCallback(async (opts?: { showInitialSpinner?: boolean }) => {
    const showSpinner = opts?.showInitialSpinner !== false;
    if (showSpinner) setLoading(true);
    try {
      const userData = await getMe();
      setUser(userData);
    } catch (error) {
      console.error(error);
      setUser(null);
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser({ showInitialSpinner: true });
  }, [loadUser]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadUser({ showInitialSpinner: false });
    } finally {
      setRefreshing(false);
    }
  }, [loadUser]);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await AsyncStorage.multiRemove(["token", "refresh_token", "user_role"]);
      setUser(null);
      router.replace("/login");
    } catch (error) {
      console.error("Failed to log out:", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const refreshCtl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor="#2593BE"
      colors={["#2593BE"]}
    />
  );

  if (loading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: "Profile",
            headerShown: true,
            headerTintColor: "#fff",
            headerStyle: { backgroundColor: "#2593BE" },
          }}
        />
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            flexGrow: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingBottom: insets.bottom + 24,
          }}
          refreshControl={refreshCtl}
        >
          <ActivityIndicator size="large" color="#2593BE" />
          <Text style={{ marginTop: 12 }}>Loading profile...</Text>
        </ScrollView>
      </>
    );
  }
  if (!user) {
    return (
      <>
        <Stack.Screen
          options={{
            title: "Profile",
            headerShown: true,
            headerTintColor: "#fff",
            headerStyle: { backgroundColor: "#2593BE" },
          }}
        />
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            flexGrow: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 16,
            paddingBottom: insets.bottom + 24,
          }}
          refreshControl={refreshCtl}
        >
          <Text
            style={{
              fontSize: 18,
              marginTop: 16,
              textAlign: "center",
              padding: 10,
            }}
          >
            You are logged out. Please log in.
          </Text>
          <Pressable
            style={{
              backgroundColor: "#2593BE",
              paddingVertical: 12,
              paddingHorizontal: 24,
              borderRadius: 12,
              marginTop: 20,
            }}
            onPress={() => {
              router.navigate("/login");
            }}
          >
            <Text
              style={{
                color: "#fff",
                fontSize: 16,
                fontWeight: "600",
                textAlign: "center",
              }}
            >
              Log In
            </Text>
          </Pressable>
        </ScrollView>
      </>
    );
  }
  return (
    <>
      <Stack.Screen
        options={{
          title: "Profile",
          headerShown: true,
          headerTintColor: "#fff",
          headerStyle: { backgroundColor: "#2593BE" },
        }}
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          alignItems: "center",
          justifyContent: "flex-start",
          paddingTop: 40,
          paddingHorizontal: 20,
          paddingBottom: 24 + insets.bottom,
        }}
        refreshControl={refreshCtl}
      >
        <Text style={{ fontSize: 24, fontWeight: "bold" }}>
          {user.full_name}
        </Text>

        <Text style={{ marginTop: 12 }}>Email: {user.email}</Text>
        <Text style={{ marginTop: 4 }}>Role: {user.role}</Text>

        <Pressable
          style={{
            backgroundColor: "#E03B3B",
            paddingVertical: 12,
            paddingHorizontal: 24,
            borderRadius: 12,
            marginTop: 24,
            opacity: isLoggingOut ? 0.7 : 1,
          }}
          onPress={handleLogout}
          disabled={isLoggingOut}
        >
          <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
            {isLoggingOut ? "Logging out..." : "Log Out"}
          </Text>
        </Pressable>
      </ScrollView>
    </>
  );
}
