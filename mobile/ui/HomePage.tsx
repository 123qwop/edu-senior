import { Stack } from "expo-router";
import { Pressable, Text, View } from "react-native";

export default function HomePage() {
  return (
    <>
      <Stack.Screen
        options={{
          title: "Nova Edu",
          headerShown: true,
          headerTintColor: "#fff",
          headerStyle: { backgroundColor: "#2593BE" },
        }}
      />
      <View
        style={{
          flex: 1,
          alignItems: "center",
          backgroundColor: "#F1F5F9",
        }}
      >
        <Text
          style={{
            fontSize: 32,
            fontWeight: "bold",
            paddingHorizontal: 20,
            textAlign: "center",
            paddingTop: 40,
          }}
        >
          Welcome to Nova Edu!
        </Text>
        <Text
          style={{
            fontSize: 18,
            marginTop: 16,
            textAlign: "center",
            padding: 10,
          }}
        >
          Personalized AI-powered study platform to help students master topics
          efficiently and stay motivated. With Nova Edu, you can save your time
          and efforts.
        </Text>
        <Pressable
          style={{
            backgroundColor: "#2593BE",
            paddingVertical: 12,
            paddingHorizontal: 24,
            borderRadius: 12,
            marginTop: 20,
          }}
          onPress={() => console.log("Pressed")}
        >
          <Text
            style={{
              color: "#fff",
              fontSize: 16,
              fontWeight: "600",
              textAlign: "center",
            }}
          >
            Get Started
          </Text>
        </Pressable>
      </View>
    </>
  );
}
