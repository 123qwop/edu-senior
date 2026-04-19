import { getUserRole } from "@/api/authApi";
import {
  getAnalytics,
  getProgress,
  type AnalyticsResponse,
  type ProgressResponse,
  type StudentAnalyticsDetail,
  type StudySetAnalytics,
} from "@/api/studySetsApi";
import AntDesign from "@expo/vector-icons/AntDesign";
import { Stack } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const SUMMARY = {
  students: "#2593BE",
  mastery: "#48C78E",
  assignments: "#7B61FF",
} as const;

function barColor(value: number): string {
  if (value >= 80) return "#22C55E";
  if (value >= 60) return "#EAB308";
  return "#EF4444";
}

function MiniBar({ value }: { value: number }) {
  const v = Math.min(100, Math.max(0, value));
  return (
    <View style={styles.barTrack}>
      <View
        style={[
          styles.barFill,
          { width: `${v}%`, backgroundColor: barColor(v) },
        ]}
      />
    </View>
  );
}

function formatActivity(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

function StudentRows({ students }: { students: StudentAnalyticsDetail[] }) {
  if (students.length === 0) {
    return (
      <Text style={styles.subTableEmpty}>No students on this set yet.</Text>
    );
  }
  return (
    <View style={styles.subTable}>
      {students.map((st) => (
        <View key={st.student_id} style={styles.studentRow}>
          <Text style={styles.studentName}>{st.student_name}</Text>
          <Text style={styles.studentEmail}>{st.student_email}</Text>
          <View style={styles.studentMetaRow}>
            <Text style={styles.studentBadge}>
              {st.is_completed
                ? "Completed"
                : st.items_completed > 0
                  ? "In progress"
                  : "Not started"}
            </Text>
          </View>
          <View style={styles.studentMasteryRow}>
            <MiniBar value={st.mastery} />
            <Text style={styles.studentMasteryPct}>{Math.round(st.mastery)}%</Text>
          </View>
          <Text style={styles.studentProgressText}>
            Items: {st.items_completed} / {st.total_items}
          </Text>
          <Text style={styles.studentLast}>
            Last activity: {formatActivity(st.last_activity)}
          </Text>
        </View>
      ))}
    </View>
  );
}

function StudySetPerformanceCard({
  set: studySet,
  expanded,
  onToggle,
}: {
  set: StudySetAnalytics;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <View style={styles.perfCard}>
      <Pressable
        style={styles.perfHeader}
        onPress={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          onToggle();
        }}
      >
        <AntDesign
          name={expanded ? "caret-down" : "caret-right"}
          size={16}
          color="#475569"
        />
        <Text style={styles.perfTitle} numberOfLines={2}>
          {studySet.title}
        </Text>
      </Pressable>
      <View style={styles.perfMetrics}>
        <View style={styles.perfMetric}>
          <Text style={styles.perfLabel}>Students</Text>
          <Text style={styles.perfValue}>{studySet.total_students}</Text>
        </View>
        <View style={styles.perfMetric}>
          <Text style={styles.perfLabel}>Avg mastery</Text>
          <View style={styles.perfBarRow}>
            <MiniBar value={studySet.average_mastery} />
            <Text style={styles.perfPct}>
              {Math.round(studySet.average_mastery)}%
            </Text>
          </View>
        </View>
        <View style={styles.perfMetric}>
          <Text style={styles.perfLabel}>Completion</Text>
          <View style={styles.perfBarRow}>
            <MiniBar value={studySet.completion_rate} />
            <Text style={styles.perfPct}>
              {Math.round(studySet.completion_rate)}%
            </Text>
          </View>
        </View>
        <View style={styles.perfMetric}>
          <Text style={styles.perfLabel}>Total attempts</Text>
          <Text style={styles.perfValue}>{studySet.total_attempts}</Text>
        </View>
      </View>
      {expanded ? (
        <View style={styles.perfExpand}>
          <Text style={styles.subTableTitle}>Student progress</Text>
          <StudentRows students={studySet.students ?? []} />
        </View>
      ) : null}
    </View>
  );
}

export default function ProgressPage() {
  const insets = useSafeAreaInsets();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teacherAnalytics, setTeacherAnalytics] =
    useState<AnalyticsResponse | null>(null);
  const [studentProgress, setStudentProgress] =
    useState<ProgressResponse | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (opts?: { showInitialSpinner?: boolean }) => {
    const showSpinner = opts?.showInitialSpinner !== false;
    if (showSpinner) setLoading(true);
    setError(null);
    try {
      const r = (await getUserRole())?.toLowerCase().trim() ?? null;
      setRole(r);
      if (r === "teacher") {
        const data = await getAnalytics();
        setTeacherAnalytics(data);
        setStudentProgress(null);
      } else if (r === "student") {
        const data = await getProgress();
        setStudentProgress(data);
        setTeacherAnalytics(null);
      } else {
        setTeacherAnalytics(null);
        setStudentProgress(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setTeacherAnalytics(null);
      setStudentProgress(null);
    } finally {
      if (showSpinner) setLoading(false);
    }
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

  const toggleSet = (setId: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(setId)) next.delete(setId);
      else next.add(setId);
      return next;
    });
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: "Progress",
          headerShown: true,
          headerTintColor: "#fff",
          headerStyle: { backgroundColor: "#2593BE" },
        }}
      />
      <ScrollView
        style={styles.screen}
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
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#2593BE" />
            <Text style={styles.muted}>Loading…</Text>
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable
              style={styles.retryBtn}
              onPress={() => load({ showInitialSpinner: true })}
            >
              <Text style={styles.retryBtnText}>Retry</Text>
            </Pressable>
          </View>
        ) : role === "teacher" && teacherAnalytics ? (
          <>
            <Text style={styles.pageTitle}>Analytics</Text>
            <View style={styles.summaryColumn}>
              <View style={[styles.summaryCard, { backgroundColor: SUMMARY.students }]}>
                <Text style={styles.summaryLabel}>Total Students</Text>
                <Text style={styles.summaryNumber}>
                  {teacherAnalytics.total_students}
                </Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: SUMMARY.mastery }]}>
                <Text style={styles.summaryLabel}>Average Mastery</Text>
                <Text style={styles.summaryNumber}>
                  {Math.round(teacherAnalytics.average_mastery)}%
                </Text>
              </View>
              <View
                style={[styles.summaryCard, { backgroundColor: SUMMARY.assignments }]}
              >
                <Text style={styles.summaryLabel}>Total Assignments</Text>
                <Text style={styles.summaryNumber}>
                  {teacherAnalytics.total_assignments}
                </Text>
              </View>
            </View>

            <View style={styles.paper}>
              <Text style={styles.paperTitle}>Study Set Performance</Text>
              <View style={styles.paperDivider} />
              {teacherAnalytics.study_sets.length === 0 ? (
                <Text style={styles.emptyPaper}>
                  No study sets with analytics data yet
                </Text>
              ) : (
                teacherAnalytics.study_sets.map((s) => (
                  <StudySetPerformanceCard
                    key={s.set_id}
                    set={s}
                    expanded={expanded.has(s.set_id)}
                    onToggle={() => toggleSet(s.set_id)}
                  />
                ))
              )}
            </View>
          </>
        ) : role === "student" && studentProgress ? (
          <>
            <Text style={styles.pageTitle}>My progress</Text>
            <View style={styles.summaryColumn}>
              <View style={[styles.summaryCard, { backgroundColor: SUMMARY.students }]}>
                <Text style={styles.summaryLabel}>Overall mastery</Text>
                <Text style={styles.summaryNumber}>
                  {Math.round(studentProgress.total_mastery)}%
                </Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: SUMMARY.mastery }]}>
                <Text style={styles.summaryLabel}>Items completed</Text>
                <Text style={styles.summaryNumber}>
                  {studentProgress.total_items_completed} /{" "}
                  {studentProgress.total_items || "—"}
                </Text>
              </View>
            </View>
            <View style={styles.paper}>
              <Text style={styles.paperTitle}>Study sets</Text>
              <View style={styles.paperDivider} />
              {studentProgress.study_sets.length === 0 ? (
                <Text style={styles.emptyPaper}>No progress data yet.</Text>
              ) : (
                studentProgress.study_sets.map((s) => (
                  <View key={s.set_id} style={styles.studentSetCard}>
                    <Text style={styles.perfTitle}>{s.title}</Text>
                    {s.subject ? (
                      <Text style={styles.studentEmail}>{s.subject}</Text>
                    ) : null}
                    <View style={styles.perfBarRow}>
                      <MiniBar value={s.mastery_percentage} />
                      <Text style={styles.perfPct}>
                        {Math.round(s.mastery_percentage)}%
                      </Text>
                    </View>
                    <Text style={styles.studentProgressText}>
                      Items: {s.items_completed} / {s.total_items}
                    </Text>
                    <Text style={styles.studentLast}>
                      Last: {formatActivity(s.last_activity ?? null)}
                    </Text>
                  </View>
                ))
              )}
            </View>
          </>
        ) : (
          <View style={styles.centered}>
            <Text style={styles.muted}>
              Sign in as a teacher to view class analytics, or as a student to
              see your progress.
            </Text>
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F1F5F9",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  centered: {
    paddingVertical: 40,
    alignItems: "center",
    gap: 12,
  },
  muted: {
    color: "#64748B",
    fontSize: 15,
    textAlign: "center",
  },
  errorText: {
    color: "#B91C1C",
    textAlign: "center",
    paddingHorizontal: 8,
  },
  retryBtn: {
    backgroundColor: "#2593BE",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  retryBtnText: {
    color: "#fff",
    fontWeight: "600",
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 16,
  },
  summaryColumn: {
    gap: 12,
    marginBottom: 20,
  },
  summaryCard: {
    borderRadius: 14,
    padding: 18,
  },
  summaryLabel: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 8,
  },
  summaryNumber: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "700",
  },
  paper: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 14,
    marginBottom: 16,
  },
  paperTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
  },
  paperDivider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 12,
  },
  emptyPaper: {
    textAlign: "center",
    color: "#64748B",
    paddingVertical: 28,
    fontSize: 15,
  },
  perfCard: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    marginBottom: 10,
    overflow: "hidden",
  },
  perfHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    backgroundColor: "#F8FAFC",
  },
  perfTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  perfMetrics: {
    padding: 12,
    gap: 10,
  },
  perfMetric: {
    gap: 4,
  },
  perfLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },
  perfValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  perfBarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  perfPct: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
    minWidth: 44,
  },
  barTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E2E8F0",
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 4,
  },
  perfExpand: {
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    padding: 12,
    backgroundColor: "#F8FAFC",
  },
  subTableTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 10,
  },
  subTable: {
    gap: 10,
  },
  subTableEmpty: {
    color: "#64748B",
    fontSize: 14,
    textAlign: "center",
    paddingVertical: 8,
  },
  studentRow: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  studentName: {
    fontWeight: "700",
    color: "#0F172A",
    fontSize: 14,
  },
  studentEmail: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 2,
  },
  studentMetaRow: {
    marginTop: 6,
  },
  studentBadge: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "600",
  },
  studentMasteryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  studentMasteryPct: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
    minWidth: 36,
  },
  studentProgressText: {
    fontSize: 13,
    color: "#475569",
    marginTop: 6,
  },
  studentLast: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 4,
  },
  studentSetCard: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
});
