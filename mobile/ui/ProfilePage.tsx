import { router, Stack } from "expo-router";
import { Pressable, Text, View } from "react-native";
export default function ProfilePage() {
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
