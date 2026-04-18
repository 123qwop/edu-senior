import { getMe, getUserRole } from "@/api/authApi";
import { getDashboardStats, type DashboardStats } from "@/api/studySetsApi";
import AntDesign from "@expo/vector-icons/AntDesign";
import { router, Stack } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function HomePage() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState("there");
  const [role, setRole] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>({});

  const load = useCallback(async () => {
    setLoading(true);
    let resolvedRole: string | null = null;
    try {
      const user = await getMe();
      const parts = user.full_name?.trim().split(/\s+/) ?? [];
      setFirstName(parts[0] || "there");
      resolvedRole =
        String(user.role ?? "")
          .toLowerCase()
          .trim() || null;
    } catch {
      const cached = await getUserRole();
      resolvedRole = cached?.toLowerCase().trim() ?? null;
    }
    if (!resolvedRole) {
      const cached = await getUserRole();
      resolvedRole = cached?.toLowerCase().trim() ?? null;
    }
    setRole(resolvedRole);

    if (resolvedRole === "teacher" || resolvedRole === "student") {
      try {
        const s = await getDashboardStats();
        setStats(s);
      } catch {
        setStats({});
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const classesActive = stats.classes_active ?? 0;
  const activeStudents = stats.active_students ?? 0;
  const assignmentsSubmitted = stats.assignments_submitted ?? 0;

  const goToLearning = () => {
    router.push("/(tabs)/learning");
  };

  if (loading) {
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
        <View style={[styles.centered, { paddingBottom: insets.bottom }]}>
          <ActivityIndicator size="large" color="#2593BE" />
          <Text style={styles.muted}>Loading…</Text>
        </View>
      </>
    );
  }

  if (role === "teacher") {
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
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: 24 + insets.bottom },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.welcomeCard}>
            <Text style={styles.welcomeTitle}>
              Welcome back, {firstName}!
            </Text>
            <Text style={styles.welcomeSubtitle}>
              Manage your classes and track student progress
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.primaryBtn,
                pressed && styles.pressed,
              ]}
              onPress={goToLearning}
            >
              <AntDesign name="play-circle" size={20} color="#fff" />
              <Text style={styles.primaryBtnText}>View My Classes</Text>
            </Pressable>
            <Text style={styles.welcomeMeta}>
              {classesActive} active {classesActive === 1 ? "class" : "classes"}{" "}
              · {activeStudents} students active today
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Class Activity Today</Text>
            <View style={styles.statsRow}>
              <View style={styles.statCell}>
                <Text style={styles.statLabel}>Active students</Text>
                <Text style={[styles.statValue, styles.statValueBlue]}>
                  {activeStudents}
                </Text>
              </View>
              <View style={styles.statCell}>
                <Text style={styles.statLabel}>Assignments submitted</Text>
                <Text style={[styles.statValue, styles.statValueGreen]}>
                  {assignmentsSubmitted}
                </Text>
              </View>
              <View style={styles.statCell}>
                <Text style={styles.statLabel}>Classes active</Text>
                <Text style={[styles.statValue, styles.statValueDark]}>
                  {classesActive}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>My Classes</Text>
            <View style={styles.myClassesBody}>
              <Text style={styles.mutedCenter}>
                {classesActive} active{" "}
                {classesActive === 1 ? "class" : "classes"}
              </Text>
              <Pressable
                style={({ pressed }) => [
                  styles.outlineBtn,
                  pressed && styles.pressed,
                ]}
                onPress={goToLearning}
              >
                <Text style={styles.outlineBtnText}>View all classes</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.recentHeader}>
              <AntDesign name="bell" size={18} color="#2593BE" />
              <Text style={styles.cardTitle}>Recent activity</Text>
            </View>
            <Text style={styles.mutedCenter}>No recent activity</Text>
          </View>
        </ScrollView>
      </>
    );
  }

  if (role === "admin") {
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
        <View style={[styles.adminWrap, { paddingBottom: insets.bottom }]}>
          <Text style={styles.welcomeTitle}>Welcome, {firstName}</Text>
          <Text style={styles.welcomeSubtitle}>
            Use the web admin portal for administration.
          </Text>
        </View>
      </>
    );
  }

  // Student or unknown role: mobile-friendly home
  const qToday = stats.questions_answered ?? 0;
  const accuracy = Math.round(stats.accuracy ?? 0);
  const minutes = stats.time_spent ?? 0;

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
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 24 + insets.bottom },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeTitle}>Welcome back, {firstName}!</Text>
          <Text style={styles.welcomeSubtitle}>
            Personalized AI-powered study to help you master topics and stay
            motivated.
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed && styles.pressed,
            ]}
            onPress={goToLearning}
          >
            <AntDesign name="play-circle" size={20} color="#fff" />
            <Text style={styles.primaryBtnText}>Get Started</Text>
          </Pressable>
        </View>

        {role === "student" ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Today</Text>
            <View style={styles.statsRow}>
              <View style={styles.statCell}>
                <Text style={styles.statLabel}>Questions answered</Text>
                <Text style={[styles.statValue, styles.statValueBlue]}>
                  {qToday}
                </Text>
              </View>
              <View style={styles.statCell}>
                <Text style={styles.statLabel}>Accuracy</Text>
                <Text style={[styles.statValue, styles.statValueGreen]}>
                  {accuracy}%
                </Text>
              </View>
              <View style={styles.statCell}>
                <Text style={styles.statLabel}>Time spent</Text>
                <Text style={[styles.statValue, styles.statValueDark]}>
                  {minutes}m
                </Text>
              </View>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: "#F1F5F9",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
    gap: 12,
  },
  muted: {
    fontSize: 15,
    color: "#64748B",
  },
  welcomeCard: {
    backgroundColor: "#E0F2FE",
    borderRadius: 14,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#BAE6FD",
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 15,
    color: "#64748B",
    lineHeight: 22,
    marginBottom: 16,
  },
  welcomeMeta: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 12,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#2593BE",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignSelf: "stretch",
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.85,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
  },
  statCell: {
    flex: 1,
    minWidth: 0,
  },
  statLabel: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 6,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "700",
  },
  statValueBlue: {
    color: "#2593BE",
  },
  statValueGreen: {
    color: "#16A34A",
  },
  statValueDark: {
    color: "#334155",
  },
  myClassesBody: {
    alignItems: "center",
    paddingVertical: 8,
    gap: 14,
  },
  mutedCenter: {
    fontSize: 15,
    color: "#64748B",
    textAlign: "center",
  },
  outlineBtn: {
    borderWidth: 1,
    borderColor: "#2593BE",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignSelf: "stretch",
    alignItems: "center",
  },
  outlineBtnText: {
    color: "#2593BE",
    fontWeight: "600",
    fontSize: 15,
  },
  recentHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  adminWrap: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 20,
    paddingTop: 24,
  },
});
