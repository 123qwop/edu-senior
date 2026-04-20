import { getMe, getUserRole } from "@/api/authApi";
import {
  getDashboardAssignments,
  getDashboardStats,
  getLeaderboard,
  getNextRecommendation,
  getRecommendations,
  getStreaks,
  type DashboardAssignment,
  type DashboardStats,
  type LeaderboardResponse,
  type NextRecommendation,
  type Recommendation,
  type StreaksResponse,
} from "@/api/studySetsApi";
import AntDesign from "@expo/vector-icons/AntDesign";
import { router, Stack } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import StudySetPracticeModal from "./StudySetPracticeModal";

export default function HomePage() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState("there");
  const [role, setRole] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>({});
  const [assignments, setAssignments] = useState<DashboardAssignment[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [nextRecommendation, setNextRecommendation] =
    useState<NextRecommendation | null>(null);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardResponse>({
    leaderboard: [],
    current_user_rank: null,
  });
  const [streaksData, setStreaksData] = useState<StreaksResponse>({
    streak: 0,
    badges: [],
    next_badge: null,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [practiceOpen, setPracticeOpen] = useState(false);
  const [practiceSetId, setPracticeSetId] = useState<number | null>(null);
  const [practiceTitle, setPracticeTitle] = useState("");

  const load = useCallback(async (opts?: { showInitialSpinner?: boolean }) => {
    const showSpinner = opts?.showInitialSpinner !== false;
    if (showSpinner) setLoading(true);
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
        if (resolvedRole === "student") {
          const settled = await Promise.allSettled([
            getDashboardStats(),
            getDashboardAssignments(),
            getRecommendations(),
            getNextRecommendation(),
            getLeaderboard(),
            getStreaks(),
          ]);
          setStats(
            settled[0].status === "fulfilled" ? settled[0].value : {},
          );
          setAssignments(
            settled[1].status === "fulfilled" ? settled[1].value : [],
          );
          setRecommendations(
            settled[2].status === "fulfilled" ? settled[2].value : [],
          );
          setNextRecommendation(
            settled[3].status === "fulfilled" ? settled[3].value : null,
          );
          setLeaderboardData(
            settled[4].status === "fulfilled"
              ? settled[4].value
              : { leaderboard: [], current_user_rank: null },
          );
          setStreaksData(
            settled[5].status === "fulfilled"
              ? settled[5].value
              : { streak: 0, badges: [], next_badge: null },
          );
        } else {
          const s = await getDashboardStats();
          setStats(s);
          setAssignments([]);
          setRecommendations([]);
          setNextRecommendation(null);
          setLeaderboardData({ leaderboard: [], current_user_rank: null });
          setStreaksData({ streak: 0, badges: [], next_badge: null });
        }
      } catch {
        setStats({});
        setAssignments([]);
        setRecommendations([]);
        setNextRecommendation(null);
        setLeaderboardData({ leaderboard: [], current_user_rank: null });
        setStreaksData({ streak: 0, badges: [], next_badge: null });
      }
    } else {
      setStats({});
      setAssignments([]);
      setRecommendations([]);
      setNextRecommendation(null);
      setLeaderboardData({ leaderboard: [], current_user_rank: null });
      setStreaksData({ streak: 0, badges: [], next_badge: null });
    }
    if (showSpinner) setLoading(false);
  }, []);

  useEffect(() => {
    load({ showInitialSpinner: true });
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load({ showInitialSpinner: false });
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const classesActive = stats.classes_active ?? 0;
  const activeStudents = stats.active_students ?? 0;
  const assignmentsSubmitted = stats.assignments_submitted ?? 0;

  const goToLearning = () => {
    router.push("/(tabs)/learning");
  };

  const openPractice = (setId: number, title: string) => {
    setPracticeSetId(setId);
    setPracticeTitle(title);
    setPracticeOpen(true);
  };

  const closePractice = () => {
    setPracticeOpen(false);
    setPracticeSetId(null);
    setPracticeTitle("");
  };

  const handleContinue = () => {
    const inProgress = assignments.find((a) => a.status === "In progress");
    if (inProgress) {
      openPractice(inProgress.set_id, inProgress.title);
      return;
    }
    if (assignments.length > 0) {
      openPractice(assignments[0].set_id, assignments[0].title);
      return;
    }
    if (nextRecommendation?.studySetId && nextRecommendation.title) {
      openPractice(nextRecommendation.studySetId, nextRecommendation.title);
      return;
    }
    if (recommendations.length > 0) {
      openPractice(recommendations[0].set_id, recommendations[0].topic);
      return;
    }
    goToLearning();
  };

  const formatDue = (value: string | null) => {
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString();
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
        <ScrollView
          style={{ flex: 1, backgroundColor: "#F1F5F9" }}
          contentContainerStyle={[
            styles.centered,
            { flexGrow: 1, paddingBottom: insets.bottom + 24 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#2593BE"
              colors={["#2593BE"]}
            />
          }
        >
          <ActivityIndicator size="large" color="#2593BE" />
          <Text style={styles.muted}>Loading…</Text>
        </ScrollView>
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
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#2593BE"
              colors={["#2593BE"]}
            />
          }
        >
          <View style={styles.welcomeCard}>
            <Text style={styles.welcomeTitle}>Welcome back, {firstName}!</Text>
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
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.adminWrap,
            { paddingBottom: 24 + insets.bottom, flexGrow: 1 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#2593BE"
              colors={["#2593BE"]}
            />
          }
        >
          <Text style={styles.welcomeTitle}>Welcome, {firstName}</Text>
          <Text style={styles.welcomeSubtitle}>
            Use the web admin portal for administration.
          </Text>
        </ScrollView>
      </>
    );
  }

  // Student or unknown role: web-like dashboard sections
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#2593BE"
            colors={["#2593BE"]}
          />
        }
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
            onPress={handleContinue}
          >
            <AntDesign name="play-circle" size={20} color="#fff" />
            <Text style={styles.primaryBtnText}>Continue where you left off</Text>
          </Pressable>
          {recommendations.length > 0 ? (
            <Text style={styles.welcomeMeta}>
              Next up: {recommendations[0].topic} ({recommendations[0].difficulty})
            </Text>
          ) : null}
        </View>

        {role === "student" ? (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Streaks and badges</Text>
              <Text style={styles.streakValue}>{streaksData.streak} day streak</Text>
              {streaksData.badges.length > 0 ? (
                <Text style={styles.cardMetaText}>
                  Recent badges:{" "}
                  {streaksData.badges
                    .slice(0, 3)
                    .map((b) => `${b.icon} ${b.name}`)
                    .join(" · ")}
                </Text>
              ) : (
                <Text style={styles.mutedCenter}>No badges yet.</Text>
              )}
              {streaksData.next_badge ? (
                <Text style={styles.cardMetaText}>
                  Next: {streaksData.next_badge.name} (
                  {streaksData.next_badge.progress}/{streaksData.next_badge.target})
                </Text>
              ) : null}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Assigned to you</Text>
              {assignments.length > 0 ? (
                assignments.slice(0, 5).map((a) => (
                  <View key={a.id} style={styles.listRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowMainText}>{a.title}</Text>
                      {formatDue(a.due) ? (
                        <Text style={styles.rowSubText}>Due {formatDue(a.due)}</Text>
                      ) : null}
                      <Text style={styles.rowSubText}>Status: {a.status}</Text>
                    </View>
                    <Pressable
                      style={({ pressed }) => [
                        styles.smallBtn,
                        pressed && styles.pressed,
                      ]}
                      onPress={() => openPractice(a.set_id, a.title)}
                    >
                      <Text style={styles.smallBtnText}>
                        {a.status === "Completed"
                          ? "Review"
                          : a.status === "In progress"
                            ? "Continue"
                            : "Start"}
                      </Text>
                    </Pressable>
                  </View>
                ))
              ) : (
                <Text style={styles.mutedCenter}>No assignments right now.</Text>
              )}
            </View>

            <View style={[styles.card, styles.recommendationCard]}>
              <Text style={[styles.cardTitle, styles.recommendationTitle]}>
                Recommended next
              </Text>
              {nextRecommendation?.studySetId ? (
                <>
                  <Text style={styles.recommendationMain}>
                    {nextRecommendation.title ?? "Study set"}
                  </Text>
                  <Text style={styles.recommendationSub}>
                    {nextRecommendation.reason}
                  </Text>
                  <Pressable
                    style={({ pressed }) => [
                      styles.recommendationBtn,
                      pressed && styles.pressed,
                    ]}
                    onPress={() =>
                      openPractice(
                        nextRecommendation.studySetId!,
                        nextRecommendation.title ?? "Study set",
                      )
                    }
                  >
                    <Text style={styles.recommendationBtnText}>Start studying</Text>
                  </Pressable>
                </>
              ) : (
                <Text style={styles.mutedCenter}>No recommendation yet.</Text>
              )}
            </View>

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
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Class leaderboard</Text>
              {leaderboardData.leaderboard.length > 0 ? (
                leaderboardData.leaderboard.slice(0, 3).map((entry) => (
                  <Text key={`${entry.rank}-${entry.name}`} style={styles.rowSubText}>
                    #{entry.rank} {entry.name} - {entry.points} pts
                  </Text>
                ))
              ) : (
                <Text style={styles.mutedCenter}>No leaderboard data yet.</Text>
              )}
            </View>
            <View style={styles.card}>
              <View style={styles.recentHeader}>
                <AntDesign name="bell" size={18} color="#2593BE" />
                <Text style={styles.cardTitle}>Recent activity</Text>
              </View>
              {assignments.length > 0 ? (
                <Text style={styles.rowSubText}>
                  {assignments.length} assignment
                  {assignments.length === 1 ? "" : "s"} active
                </Text>
              ) : streaksData.badges.length > 0 ? (
                <Text style={styles.rowSubText}>
                  {streaksData.badges.length} badge
                  {streaksData.badges.length === 1 ? "" : "s"} earned recently
                </Text>
              ) : (
                <Text style={styles.mutedCenter}>No recent activity.</Text>
              )}
            </View>
          </>
        ) : null}
      </ScrollView>
      <StudySetPracticeModal
        visible={practiceOpen}
        setId={practiceSetId}
        title={practiceTitle}
        onClose={closePractice}
        onSubmitted={() => load({ showInitialSpinner: false })}
      />
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
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  rowMainText: {
    fontSize: 14,
    color: "#0F172A",
    fontWeight: "600",
  },
  rowSubText: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },
  smallBtn: {
    borderWidth: 1,
    borderColor: "#2593BE",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  smallBtnText: {
    color: "#2593BE",
    fontWeight: "600",
    fontSize: 12,
  },
  streakValue: {
    fontSize: 24,
    color: "#EA580C",
    fontWeight: "700",
    marginBottom: 8,
  },
  cardMetaText: {
    fontSize: 13,
    color: "#475569",
    marginTop: 6,
  },
  recommendationCard: {
    backgroundColor: "#1D4ED8",
    borderColor: "#1D4ED8",
  },
  recommendationTitle: {
    color: "#DBEAFE",
  },
  recommendationMain: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 6,
  },
  recommendationSub: {
    fontSize: 14,
    color: "#DBEAFE",
    marginBottom: 12,
    lineHeight: 20,
  },
  recommendationBtn: {
    backgroundColor: "#fff",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  recommendationBtnText: {
    color: "#1D4ED8",
    fontWeight: "700",
  },
  adminWrap: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 20,
    paddingTop: 24,
  },
});
