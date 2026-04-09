import { getMe } from "@/api/authApi";
import { router, Stack } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userData = await getMe();
        setUser(userData);
      } catch (error) {
        console.error(error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#2593BE" />
        <Text style={{ marginTop: 12 }}>Loading profile...</Text>
      </View>
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
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
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
        </View>
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
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: 24, fontWeight: "bold" }}>
          {user.full_name}
        </Text>

        <Text>Email: {user.email}</Text>
        <Text>Role: {user.role}</Text>
      </View>
    </>
  );
}
