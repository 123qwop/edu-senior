import { login } from "@/api/authApi";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const handleLogin = async () => {
    try {
      await login(email, password);
      router.replace("/(tabs)");
    } catch (error: any) {
      alert(error.message);
    }
  };
  return (
    <>
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text
          style={{
            fontSize: 24,
            padding: 12,
            fontWeight: "bold",
            textAlign: "left",
          }}
        >
          Login
        </Text>
        <TextInput
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          style={{
            width: "80%",
            borderWidth: 1,
            borderRadius: 8,
            padding: 12,
            marginTop: 12,
          }}
        />
        <TextInput
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={{
            width: "80%",
            borderWidth: 1,
            borderRadius: 8,
            padding: 12,
            marginTop: 12,
          }}
        />
        <Pressable
          style={{
            backgroundColor: "#2593BE",
            padding: 14,
            borderRadius: 10,
            marginTop: 20,
          }}
          onPress={() => handleLogin()}
        >
          <Text style={{ color: "#fff", textAlign: "center" }}>Login</Text>
        </Pressable>
      </View>
      <View>
        <Text>
          Don’t have an account?{" "}
          <Text
            style={{ color: "#2593BE" }}
            onPress={() => router.push("./register")}
          >
            Register
          </Text>
        </Text>
      </View>
    </>
  );
}
