import { register } from "@/api/authApi";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const handleRegister = async () => {
    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }
    try {
      await register({
        email,
        password,
        full_name: fullName,
        role: "student",
      });
      router.replace("/(tabs)");
    } catch (error: any) {
      alert(error.message);
    }
  };
  return (
    <>
      <View>
        <Text
          style={{
            fontSize: 24,
            padding: 12,
            fontWeight: "bold",
            textAlign: "left",
          }}
        >
          Register
        </Text>
        <TextInput
          placeholder="Full Name"
          value={fullName}
          onChangeText={setFullName}
          style={{
            width: "80%",
            borderWidth: 1,
            borderRadius: 8,
            padding: 12,
            marginTop: 12,
          }}
        />
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
        <TextInput
          placeholder="Confirm Password"
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
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
          onPress={() => handleRegister()}
        >
          <Text style={{ color: "#fff", textAlign: "center" }}>Register</Text>
        </Pressable>
      </View>
      <View>
        <Text>
          Already registered?{" "}
          <Text
            style={{ color: "#2593BE" }}
            onPress={() => router.push("./login")}
          >
            Login
          </Text>
        </Text>
      </View>
    </>
  );
}
