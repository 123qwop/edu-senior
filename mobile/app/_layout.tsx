import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="login"
        options={{
          title: "Login",
          headerStyle: { backgroundColor: "#2593BE" },
          headerTintColor: "#fff",
        }}
      />
      <Stack.Screen
        name="register"
        options={{
          title: "Register",
          headerStyle: { backgroundColor: "#2593BE" },
          headerTintColor: "#fff",
        }}
      />
      <Stack.Screen
        name="index"
        options={{
          title: "Home",
          headerStyle: { backgroundColor: "#2593BE" },
          headerTintColor: "#fff",
        }}
      />
    </Stack>
  );
}
