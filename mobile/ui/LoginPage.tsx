import { login } from "@/api/authApi";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password) {
      alert("Please enter email and password");
      return false;
    }

    if (!trimmedEmail.includes("@")) {
      alert("Please enter a valid email address");
      return false;
    }

    return true;
  };

  const handleLogin = async () => {
    if (isSubmitting || !validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);
      await login(email.trim(), password);
      router.replace("/(tabs)");
    } catch (error: any) {
      alert(error?.message || "Login failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 20,
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
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
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
            minWidth: 140,
            opacity: isSubmitting ? 0.7 : 1,
          }}
          disabled={isSubmitting}
          onPress={() => handleLogin()}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: "#fff", textAlign: "center" }}>Login</Text>
          )}
        </Pressable>
      </View>
      <View
        style={{
          paddingBottom: 24,
          paddingHorizontal: 20,
          alignItems: "center",
        }}
      >
        <Text
          onPress={() => router.push("/register")}
          style={{ color: "#2593BE", fontWeight: "600" }}
        >
          Register
        </Text>
      </View>
    </>
  );
}
