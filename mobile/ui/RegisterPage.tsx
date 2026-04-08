import { register } from "@/api/authApi";
import { router } from "expo-router";
import { useState } from "react";
import { Picker } from "@react-native-picker/picker";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName || !trimmedEmail || !password || !confirmPassword) {
      alert("Please fill in all fields");
      return false;
    }

    if (!trimmedEmail.includes("@")) {
      alert("Please enter a valid email address");
      return false;
    }

    if (password.length < 6) {
      alert("Password must be at least 6 characters");
      return false;
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return false;
    }

    return true;
  };

  const handleRegister = async () => {
    if (isSubmitting || !validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);
      await register({
        email: email.trim(),
        password,
        full_name: fullName.trim(),
        role,
      });
      alert("Registration successful. Please login.");
      router.replace("/login");
    } catch (error: any) {
      alert(error?.message || "Registration failed");
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
          Register
        </Text>
        <TextInput
          placeholder="Full Name"
          value={fullName}
          onChangeText={setFullName}
          autoCapitalize="words"
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
        <Picker
          selectedValue={role}
          onValueChange={(itemValue) => setRole(itemValue)}
          style={{ width: "80%", marginTop: 12 }}
        >
          <Picker.Item label="Student" value="student" />
          <Picker.Item label="Teacher" value="teacher" />
        </Picker>
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
            minWidth: 150,
            opacity: isSubmitting ? 0.7 : 1,
          }}
          disabled={isSubmitting}
          onPress={() => handleRegister()}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: "#fff", textAlign: "center" }}>Register</Text>
          )}
        </Pressable>
      </View>
      <View style={{ paddingBottom: 16, alignItems: "center" }}>
        <Text>
          Already registered?{" "}
          <Text
            style={{ color: "#2593BE" }}
            onPress={() => router.push("/login")}
          >
            Login
          </Text>
        </Text>
      </View>
    </>
  );
}
