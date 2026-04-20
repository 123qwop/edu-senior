import { getUserRole } from "@/api/authApi";
import {
  type Assignment,
  type ClassOut,
  createClass,
  deleteClass,
  getClassAssignments,
  getClassStudents,
  getClassStudentsProgress,
  getClasses,
  getLeaderboard,
  getStudySet,
  getStudySetQuestions,
  getStudySets,
  type LeaderboardResponse,
  type Question,
  type Student,
  type StudentProgressDetail,
  type StudySetOut,
} from "@/api/studySetsApi";
import AntDesign from "@expo/vector-icons/AntDesign";
import CreateStudySetModal from "@/ui/CreateStudySetModal";
import StudySetPracticeModal from "@/ui/StudySetPracticeModal";
import { Picker } from "@react-native-picker/picker";
import { Stack } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const SUBJECT_OPTIONS = [
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "English",
  "History",
  "Geography",
  "Computer Science",
] as const;

const GRADE_NONE = "none";

const CLASS_TABS = [
  "Students",
  "Assignments",
  "Leaderboard",
  "Analytics",
] as const;
type ClassTab = (typeof CLASS_TABS)[number];

export default function MyClassesPage() {
  const insets = useSafeAreaInsets();
  const [classes, setClasses] = useState<ClassOut[]>([]);
  const [studySets, setStudySets] = useState<StudySetOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studySetsError, setStudySetsError] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [studySetSearch, setStudySetSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  /** Empty string until user picks a subject (required). */
  const [newClassSubject, setNewClassSubject] = useState("");
  /** "none" or "7"…"12"; stored as digit string for Picker values. */
  const [newClassGrade, setNewClassGrade] = useState(GRADE_NONE);
  const [newClassDescription, setNewClassDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [createSetOpen, setCreateSetOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [classDetailOpen, setClassDetailOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassOut | null>(null);
  const [activeTab, setActiveTab] = useState<ClassTab>("Students");
  const [classStudents, setClassStudents] = useState<Student[]>([]);
  const [classAssignments, setClassAssignments] = useState<Assignment[]>([]);
  const [classProgress, setClassProgress] = useState<StudentProgressDetail[]>(
    [],
  );
  const [classLeaderboard, setClassLeaderboard] = useState<LeaderboardResponse>(
    {
      leaderboard: [],
      current_user_rank: null,
    },
  );
  const [tabLoading, setTabLoading] = useState(false);
  const [tabError, setTabError] = useState<string | null>(null);

  const [studySetDetailOpen, setStudySetDetailOpen] = useState(false);
  const [selectedStudySet, setSelectedStudySet] = useState<StudySetOut | null>(
    null,
  );
  const [studySetDetail, setStudySetDetail] = useState<StudySetOut | null>(
    null,
  );
  const [studySetQuestions, setStudySetQuestions] = useState<Question[]>([]);
  const [studySetDetailLoading, setStudySetDetailLoading] = useState(false);
  const [studySetDetailError, setStudySetDetailError] = useState<string | null>(
    null,
  );
  const [refreshing, setRefreshing] = useState(false);
  const [practiceOpen, setPracticeOpen] = useState(false);
  const [practiceSetId, setPracticeSetId] = useState<number | null>(null);
  const [practiceTitle, setPracticeTitle] = useState("");

  const isTeacher = role === "teacher";
  const isStudent = role?.toLowerCase().trim() === "student";

  const loadPage = useCallback(
    async (opts?: { showInitialSpinner?: boolean }) => {
      const showSpinner = opts?.showInitialSpinner !== false;
      if (showSpinner) setLoading(true);
      setError(null);
      setStudySetsError(null);
      let resolvedRole: string | null = null;
      try {
        resolvedRole = await getUserRole();
        setRole(resolvedRole);
      } catch {
        setRole(null);
      }

      const normalizedRole = resolvedRole?.toLowerCase().trim() ?? "";
      const ownSetsRole =
        normalizedRole === "teacher" || normalizedRole === "student";

      const [classesRes, setsRes] = await Promise.allSettled([
        getClasses(),
        ownSetsRole ? getStudySets({ ownership: "Mine" }) : getStudySets(),
      ]);

      if (classesRes.status === "fulfilled") {
        setClasses(classesRes.value);
      } else {
        const msg =
          classesRes.reason instanceof Error
            ? classesRes.reason.message
            : "Failed to load classes";
        setError(msg);
        setClasses([]);
      }

      if (setsRes.status === "fulfilled") {
        setStudySets(setsRes.value);
      } else {
        const msg =
          setsRes.reason instanceof Error
            ? setsRes.reason.message
            : "Failed to load study sets";
        setStudySetsError(msg);
        setStudySets([]);
      }

      if (showSpinner) setLoading(false);
    },
    [],
  );

  useEffect(() => {
    loadPage({ showInitialSpinner: true });
  }, [loadPage]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadPage({ showInitialSpinner: false });
    } finally {
      setRefreshing(false);
    }
  }, [loadPage]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return classes;
    return classes.filter(
      (c) =>
        c.class_name.toLowerCase().includes(q) ||
        (c.subject ?? "").toLowerCase().includes(q) ||
        (c.level ?? "").toLowerCase().includes(q),
    );
  }, [classes, search]);

  const filteredStudySets = useMemo(() => {
    const q = studySetSearch.trim().toLowerCase();
    if (!q) return studySets;
    return studySets.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        (s.subject ?? "").toLowerCase().includes(q) ||
        (s.type ?? "").toLowerCase().includes(q),
    );
  }, [studySets, studySetSearch]);

  const closeCreateModal = () => {
    setCreateOpen(false);
    setNewClassName("");
    setNewClassSubject("");
    setNewClassGrade(GRADE_NONE);
    setNewClassDescription("");
  };

  const submitCreate = async () => {
    if (creating) return;
    const name = newClassName.trim();
    if (!name) {
      Alert.alert("Validation", "Class name is required.");
      return;
    }
    if (!newClassSubject) {
      Alert.alert("Validation", "Subject is required.");
      return;
    }
    try {
      setCreating(true);
      await createClass({
        class_name: name,
        subject: newClassSubject,
        level:
          newClassGrade === GRADE_NONE ? undefined : `Grade ${newClassGrade}`,
        description: newClassDescription.trim() || undefined,
      });
      closeCreateModal();
      await loadPage();
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to create class",
      );
    } finally {
      setCreating(false);
    }
  };

  const confirmDelete = (item: ClassOut) => {
    Alert.alert("Delete class", `Delete "${item.class_name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            setDeletingId(item.id);
            await deleteClass(item.id);
            await loadPage();
          } catch (err) {
            Alert.alert(
              "Error",
              err instanceof Error ? err.message : "Failed to delete",
            );
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  };

  const openClassDetail = (item: ClassOut) => {
    setSelectedClass(item);
    setActiveTab("Students");
    setClassStudents([]);
    setClassAssignments([]);
    setClassProgress([]);
    setClassLeaderboard({ leaderboard: [], current_user_rank: null });
    setTabError(null);
    setClassDetailOpen(true);
  };

  const closeClassDetail = () => {
    setClassDetailOpen(false);
    setSelectedClass(null);
    setTabError(null);
  };

  useEffect(() => {
    const classId = selectedClass?.id;
    if (!classId || !classDetailOpen) return;

    const loadTabData = async () => {
      try {
        setTabLoading(true);
        setTabError(null);
        if (activeTab === "Students") {
          const students = await getClassStudents(classId);
          setClassStudents(students);
          return;
        }
        if (activeTab === "Assignments") {
          const assignments = await getClassAssignments(classId);
          setClassAssignments(assignments);
          return;
        }
        if (activeTab === "Leaderboard") {
          if (isTeacher) {
            const [students, progress] = await Promise.all([
              getClassStudents(classId),
              getClassStudentsProgress(classId),
            ]);
            setClassStudents(students);
            setClassProgress(progress);
            const mapped = progress
              .map((p) => ({
                rank: 0,
                name:
                  students.find((s) => s.id === p.student_id)?.name ??
                  "Unknown",
                points: Math.round(p.average_mastery * 10),
              }))
              .sort((a, b) => b.points - a.points)
              .map((entry, idx) => ({ ...entry, rank: idx + 1 }));
            setClassLeaderboard({
              leaderboard: mapped,
              current_user_rank: null,
            });
          } else {
            const data = await getLeaderboard(classId);
            setClassLeaderboard(data);
          }
          return;
        }
        if (activeTab === "Analytics") {
          const progress = await getClassStudentsProgress(classId);
          setClassProgress(progress);
        }
      } catch (err) {
        setTabError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setTabLoading(false);
      }
    };

    loadTabData();
  }, [activeTab, classDetailOpen, isTeacher, selectedClass?.id]);

  const formatDueDate = (value: string | null) => {
    if (!value) return "No due date";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString();
  };

  const openStudySetDetail = (item: StudySetOut) => {
    setSelectedStudySet(item);
    setStudySetDetail(null);
    setStudySetQuestions([]);
    setStudySetDetailError(null);
    setStudySetDetailOpen(true);
    setStudySetDetailLoading(true);
    (async () => {
      try {
        const [detail, questions] = await Promise.all([
          getStudySet(item.id),
          getStudySetQuestions(item.id),
        ]);
        setStudySetDetail(detail);
        setStudySetQuestions(questions);
      } catch (e) {
        setStudySetDetailError(
          e instanceof Error ? e.message : "Failed to load study set",
        );
        setStudySetDetail(null);
        setStudySetQuestions([]);
      } finally {
        setStudySetDetailLoading(false);
      }
    })();
  };

  const closeStudySetDetail = () => {
    setStudySetDetailOpen(false);
    setSelectedStudySet(null);
    setStudySetDetail(null);
    setStudySetQuestions([]);
    setStudySetDetailError(null);
  };

  const openPracticeFromDetail = () => {
    if (!selectedStudySet) return;
    const s = selectedStudySet;
    setPracticeSetId(s.id);
    setPracticeTitle(s.title);
    setPracticeOpen(true);
    closeStudySetDetail();
  };

  const closePractice = () => {
    setPracticeOpen(false);
    setPracticeSetId(null);
    setPracticeTitle("");
  };

  const displayStudySet = studySetDetail ?? selectedStudySet;

  const formatQuestionType = (t: string) =>
    t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const questionPreview = (q: Question) => {
    if (q.term != null || q.definition != null) {
      const parts = [
        q.term ? `Term: ${q.term}` : null,
        q.definition ? `Definition: ${q.definition}` : null,
      ].filter(Boolean);
      if (parts.length) return parts.join("\n");
    }
    const lines = [q.content?.trim() || ""];
    if (q.options && q.options.length > 0) {
      lines.push(q.options.map((o, i) => `${i + 1}. ${o}`).join("\n"));
    }
    const text = lines.filter(Boolean).join("\n\n");
    return text || "—";
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: "Learning",
          headerShown: true,
          headerTintColor: "#fff",
          headerStyle: { backgroundColor: "#2593BE" },
        }}
      />

      <View style={styles.screen}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
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
          <View style={styles.titleRow}>
            <Text style={styles.titleText}>My classes</Text>
            <Pressable
              accessibilityLabel={
                isTeacher ? "Create class" : "Create class unavailable"
              }
              onPress={() => {
                if (isTeacher) {
                  setCreateOpen(true);
                } else {
                  Alert.alert(
                    "Create class",
                    "Only teachers can create classes from the app.",
                  );
                }
              }}
              style={({ pressed }) => [
                styles.plusButton,
                pressed && styles.plusPressed,
              ]}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <AntDesign name="plus" size={26} color="#2593BE" />
            </Pressable>
          </View>

          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search classes"
            style={styles.search}
            placeholderTextColor="#64748B"
          />

          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color="#2593BE" />
              <Text style={styles.muted}>Loading…</Text>
            </View>
          ) : (
            <>
              {error ? (
                <View style={styles.centered}>
                  <Text style={styles.error}>{error}</Text>
                  <Pressable
                    style={styles.primaryBtn}
                    onPress={() => loadPage({ showInitialSpinner: true })}
                  >
                    <Text style={styles.primaryBtnText}>Retry</Text>
                  </Pressable>
                </View>
              ) : filtered.length === 0 ? (
                <Text style={styles.sectionMuted}>
                  {classes.length === 0
                    ? "No classes yet."
                    : "No classes match your search."}
                </Text>
              ) : (
                filtered.map((item) => (
                  <View key={item.id} style={styles.card}>
                    <View style={styles.cardRow}>
                      <Pressable
                        style={({ pressed }) => [
                          styles.cardTouchable,
                          pressed && styles.cardTouchablePressed,
                        ]}
                        onPress={() => openClassDetail(item)}
                        accessibilityRole="button"
                        accessibilityLabel={`Open class ${item.class_name}`}
                      >
                        <Text style={styles.cardTitle}>{item.class_name}</Text>
                        <Text style={styles.cardMeta}>
                          Subject: {item.subject ?? "—"}
                        </Text>
                        <Text style={styles.cardMeta}>
                          Level: {item.level ?? "—"}
                        </Text>
                        <Text style={styles.cardMeta}>
                          Students: {item.student_count ?? 0} · Assignments:{" "}
                          {item.assignment_count ?? 0}
                        </Text>
                        <Text style={styles.cardMeta}>
                          Avg mastery:{" "}
                          {item.average_mastery != null
                            ? `${Math.round(item.average_mastery)}%`
                            : "—"}
                        </Text>
                      </Pressable>
                      {isTeacher ? (
                        <Pressable
                          style={styles.dangerBtnSide}
                          disabled={deletingId === item.id}
                          onPress={() => confirmDelete(item)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          accessibilityRole="button"
                          accessibilityLabel={`Delete class ${item.class_name}`}
                        >
                          <Text style={styles.dangerBtnText}>
                            {deletingId === item.id ? "Deleting…" : "Delete"}
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                ))
              )}

              <View style={styles.sectionDivider} />

              <View style={styles.titleRow}>
                <Text style={styles.titleText}>My study sets</Text>
                <Pressable
                  accessibilityLabel="Create study set"
                  onPress={() => setCreateSetOpen(true)}
                  style={({ pressed }) => [
                    styles.plusButton,
                    pressed && styles.plusPressed,
                  ]}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <AntDesign name="plus" size={26} color="#2593BE" />
                </Pressable>
              </View>

              <TextInput
                value={studySetSearch}
                onChangeText={setStudySetSearch}
                placeholder="Search study sets"
                style={styles.search}
                placeholderTextColor="#64748B"
              />

              {studySetsError ? (
                <View style={styles.centered}>
                  <Text style={styles.error}>{studySetsError}</Text>
                  <Pressable
                    style={styles.primaryBtn}
                    onPress={() => loadPage({ showInitialSpinner: true })}
                  >
                    <Text style={styles.primaryBtnText}>Retry</Text>
                  </Pressable>
                </View>
              ) : filteredStudySets.length === 0 ? (
                <Text style={styles.sectionMuted}>
                  {studySets.length === 0
                    ? "No study sets yet."
                    : "No study sets match your search."}
                </Text>
              ) : (
                filteredStudySets.map((s) => (
                  <Pressable
                    key={s.id}
                    style={({ pressed }) => [
                      styles.card,
                      pressed && styles.cardTouchablePressed,
                    ]}
                    onPress={() => openStudySetDetail(s)}
                    accessibilityRole="button"
                    accessibilityLabel={`Open study set ${s.title}`}
                  >
                    <Text style={styles.cardTitle}>{s.title}</Text>
                    <Text style={styles.cardMeta}>
                      Subject: {s.subject ?? "—"}
                    </Text>
                    <Text style={styles.cardMeta}>Type: {s.type}</Text>
                    <Text style={styles.cardMeta}>
                      Items: {s.item_count ?? 0}
                      {s.mastery != null
                        ? ` · Mastery: ${Math.round(s.mastery)}%`
                        : ""}
                    </Text>
                  </Pressable>
                ))
              )}
            </>
          )}
        </ScrollView>
      </View>

      <Modal
        visible={classDetailOpen}
        animationType="slide"
        onRequestClose={closeClassDetail}
      >
        <View style={styles.classModalScreen}>
          <View
            style={[styles.classModalHeader, { paddingTop: insets.top + 8 }]}
          >
            <Pressable onPress={closeClassDetail} style={styles.backBtn}>
              <AntDesign name="arrow-left" size={18} color="#0F172A" />
              <Text style={styles.backBtnText}>Back</Text>
            </Pressable>
            <Text style={styles.classModalTitle}>
              {selectedClass?.class_name ?? "Class"}
            </Text>
            <Text style={styles.classModalSubtitle}>
              {(selectedClass?.subject ?? "—") +
                (selectedClass?.level ? ` • ${selectedClass.level}` : "")}
            </Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tabsScroll}
            contentContainerStyle={styles.tabsWrap}
          >
            {CLASS_TABS.map((tab) => (
              <Pressable
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[
                  styles.tabBtn,
                  activeTab === tab && styles.tabBtnActive,
                ]}
              >
                <Text
                  style={[
                    styles.tabBtnText,
                    activeTab === tab && styles.tabBtnTextActive,
                  ]}
                >
                  {tab}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <ScrollView
            style={styles.classTabScroll}
            contentContainerStyle={styles.classTabBody}
          >
            {tabLoading ? (
              <View style={styles.centered}>
                <ActivityIndicator size="small" color="#2593BE" />
              </View>
            ) : tabError ? (
              <Text style={styles.error}>{tabError}</Text>
            ) : activeTab === "Students" ? (
              classStudents.length > 0 ? (
                classStudents.map((s) => (
                  <View key={s.id} style={styles.rowCard}>
                    <Text style={styles.rowTitle}>{s.name}</Text>
                    <Text style={styles.rowMeta}>{s.email}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.muted}>No students yet.</Text>
              )
            ) : activeTab === "Assignments" ? (
              classAssignments.length > 0 ? (
                classAssignments.map((a) => (
                  <View key={a.assignment_id} style={styles.rowCard}>
                    <Text style={styles.rowTitle}>{a.title}</Text>
                    <Text style={styles.rowMeta}>
                      Subject: {a.subject ?? "—"} · Type: {a.type}
                    </Text>
                    <Text style={styles.rowMeta}>
                      Due: {formatDueDate(a.due_date)}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.muted}>No assignments yet.</Text>
              )
            ) : activeTab === "Leaderboard" ? (
              classLeaderboard.leaderboard.length > 0 ? (
                classLeaderboard.leaderboard.map((entry) => (
                  <View
                    key={`${entry.rank}-${entry.name}`}
                    style={styles.rowCard}
                  >
                    <Text style={styles.rowTitle}>
                      #{entry.rank} {entry.name}
                    </Text>
                    <Text style={styles.rowMeta}>{entry.points} pts</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.muted}>No leaderboard data yet.</Text>
              )
            ) : classProgress.length > 0 ? (
              <>
                <View style={styles.analyticsSummary}>
                  <Text style={styles.rowMeta}>
                    Students tracked: {classProgress.length}
                  </Text>
                  <Text style={styles.rowMeta}>
                    Avg mastery:{" "}
                    {Math.round(
                      classProgress.reduce(
                        (acc, p) => acc + p.average_mastery,
                        0,
                      ) / classProgress.length,
                    )}
                    %
                  </Text>
                </View>
                {classProgress.map((p) => (
                  <View key={p.student_id} style={styles.rowCard}>
                    <Text style={styles.rowTitle}>{p.student_name}</Text>
                    <Text style={styles.rowMeta}>
                      Mastery: {Math.round(p.average_mastery)}%
                    </Text>
                    <Text style={styles.rowMeta}>
                      Completed: {p.assignments_completed}/{p.assignments_total}
                    </Text>
                  </View>
                ))}
              </>
            ) : (
              <Text style={styles.muted}>No analytics data yet.</Text>
            )}
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={studySetDetailOpen}
        animationType="slide"
        onRequestClose={closeStudySetDetail}
      >
        <View style={styles.classModalScreen}>
          <View
            style={[styles.classModalHeader, { paddingTop: insets.top + 8 }]}
          >
            <Pressable onPress={closeStudySetDetail} style={styles.backBtn}>
              <AntDesign name="arrow-left" size={18} color="#0F172A" />
              <Text style={styles.backBtnText}>Back</Text>
            </Pressable>
            <Text style={styles.classModalTitle}>
              {displayStudySet?.title ?? "Study set"}
            </Text>
            <Text style={styles.classModalSubtitle}>
              {(displayStudySet?.subject ?? "—") +
                (displayStudySet?.type ? ` · ${displayStudySet.type}` : "") +
                (displayStudySet?.level ? ` · ${displayStudySet.level}` : "")}
            </Text>
          </View>

          <ScrollView
            style={styles.classTabScroll}
            contentContainerStyle={styles.classTabBody}
          >
            {studySetDetailLoading ? (
              <View style={styles.centered}>
                <ActivityIndicator size="small" color="#2593BE" />
                <Text style={styles.muted}>Loading study set…</Text>
              </View>
            ) : studySetDetailError ? (
              <Text style={styles.error}>{studySetDetailError}</Text>
            ) : (
              <>
                {displayStudySet?.description ? (
                  <Text style={styles.setDetailDescription}>
                    {displayStudySet.description}
                  </Text>
                ) : null}
                {displayStudySet?.tags && displayStudySet.tags.length > 0 ? (
                  <Text style={styles.setDetailTags}>
                    Tags: {displayStudySet.tags.join(", ")}
                  </Text>
                ) : null}
                <Text style={styles.setDetailSectionTitle}>Items</Text>
                {studySetQuestions.length === 0 ? (
                  <Text style={styles.muted}>No items in this set yet.</Text>
                ) : (
                  studySetQuestions.map((q) => (
                    <View key={q.id} style={styles.rowCard}>
                      <Text style={styles.rowTitle}>
                        {formatQuestionType(q.type)}
                      </Text>
                      <Text style={styles.rowMeta}>{questionPreview(q)}</Text>
                    </View>
                  ))
                )}
                {isStudent && studySetQuestions.length > 0 ? (
                  <Pressable
                    style={styles.practiceBtn}
                    onPress={openPracticeFromDetail}
                  >
                    <AntDesign name="play-circle" size={20} color="#fff" />
                    <Text style={styles.practiceBtnText}>Start practice</Text>
                  </Pressable>
                ) : null}
              </>
            )}
          </ScrollView>
        </View>
      </Modal>

      <StudySetPracticeModal
        visible={practiceOpen}
        setId={practiceSetId}
        title={practiceTitle}
        onClose={closePractice}
        onSubmitted={() => loadPage({ showInitialSpinner: false })}
      />

      <Modal
        visible={createOpen}
        animationType="fade"
        transparent
        onRequestClose={closeCreateModal}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New class</Text>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              style={styles.modalScroll}
            >
              <Text style={styles.fieldLabel}>
                Class name <Text style={styles.requiredMark}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Class name"
                value={newClassName}
                onChangeText={setNewClassName}
                placeholderTextColor="#64748B"
              />
              <Text style={styles.fieldLabel}>
                Subject <Text style={styles.requiredMark}>*</Text>
              </Text>
              <View style={styles.pickerWrap}>
                <Picker
                  selectedValue={newClassSubject}
                  onValueChange={(v) => setNewClassSubject(String(v))}
                  style={styles.picker}
                >
                  <Picker.Item label="Select subject" value="" />
                  {SUBJECT_OPTIONS.map((s) => (
                    <Picker.Item key={s} label={s} value={s} />
                  ))}
                </Picker>
              </View>
              <Text style={styles.fieldLabel}>Grade (optional)</Text>
              <View style={styles.pickerWrap}>
                <Picker
                  selectedValue={newClassGrade}
                  onValueChange={(v) => setNewClassGrade(String(v))}
                  style={styles.picker}
                >
                  <Picker.Item label="None" value={GRADE_NONE} />
                  {([7, 8, 9, 10, 11, 12] as const).map((g) => (
                    <Picker.Item
                      key={g}
                      label={`Grade ${g}`}
                      value={String(g)}
                    />
                  ))}
                </Picker>
              </View>
              <Text style={styles.fieldLabel}>Description (optional)</Text>
              <TextInput
                style={[styles.input, styles.descriptionInput]}
                placeholder="Description"
                value={newClassDescription}
                onChangeText={setNewClassDescription}
                placeholderTextColor="#64748B"
                multiline
                textAlignVertical="top"
              />
            </ScrollView>
            <View style={styles.modalActions}>
              <Pressable onPress={closeCreateModal} style={styles.secondaryBtn}>
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={submitCreate}
                disabled={creating}
                style={[styles.primaryBtn, creating && styles.disabled]}
              >
                {creating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>Create</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <CreateStudySetModal
        visible={createSetOpen}
        onClose={() => setCreateSetOpen(false)}
        onSuccess={loadPage}
        isTeacher={isTeacher}
      />
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  titleText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0F172A",
  },
  plusButton: {
    padding: 4,
    borderRadius: 8,
    backgroundColor: "#E0F2FE",
  },
  plusPressed: {
    opacity: 0.7,
  },
  search: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
    marginBottom: 12,
    fontSize: 16,
  },
  scrollContent: {
    paddingBottom: 28,
  },
  sectionDivider: {
    marginVertical: 20,
    height: 1,
    backgroundColor: "#E2E8F0",
  },
  sectionMuted: {
    color: "#64748B",
    fontSize: 15,
    textAlign: "left",
    marginBottom: 8,
  },
  centered: {
    paddingVertical: 32,
    alignItems: "center",
    gap: 12,
  },
  muted: {
    color: "#64748B",
    fontSize: 15,
    textAlign: "center",
  },
  error: {
    color: "#B91C1C",
    textAlign: "center",
    paddingHorizontal: 8,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  cardTouchable: {
    flex: 1,
    minWidth: 0,
  },
  cardTouchablePressed: {
    opacity: 0.85,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 6,
  },
  cardMeta: {
    fontSize: 14,
    color: "#475569",
    marginBottom: 2,
  },
  primaryBtn: {
    backgroundColor: "#2593BE",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: "center",
    minWidth: 100,
  },
  primaryBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
  secondaryBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  secondaryBtnText: {
    color: "#475569",
    fontWeight: "600",
    fontSize: 15,
  },
  dangerBtnSide: {
    paddingTop: 2,
    paddingLeft: 4,
    justifyContent: "flex-start",
  },
  dangerBtnText: {
    color: "#DC2626",
    fontWeight: "600",
  },
  disabled: {
    opacity: 0.6,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.45)",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 18,
    maxHeight: "90%",
  },
  modalScroll: {
    maxHeight: 420,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 10,
    color: "#0F172A",
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 4,
  },
  requiredMark: {
    color: "#DC2626",
  },
  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    fontSize: 16,
  },
  descriptionInput: {
    minHeight: 88,
    paddingTop: 10,
  },
  pickerWrap: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    marginBottom: 12,
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  picker: {
    width: "100%",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  classModalScreen: {
    flex: 1,
    backgroundColor: "#F1F5F9",
  },
  classModalHeader: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    marginBottom: 10,
  },
  backBtnText: {
    color: "#0F172A",
    fontWeight: "600",
  },
  classModalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
  },
  classModalSubtitle: {
    marginTop: 2,
    fontSize: 14,
    color: "#64748B",
  },
  /** Horizontal ScrollView must not grow to fill the screen; see tabsWrap alignItems. */
  tabsScroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  tabsWrap: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: "#F8FAFC",
    /** Default is stretch — tab chips were stretching to the ScrollView’s full height. */
    alignItems: "center",
  },
  tabBtn: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
    alignSelf: "center",
  },
  tabBtnActive: {
    backgroundColor: "#2593BE",
    borderColor: "#2593BE",
  },
  tabBtnText: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "600",
  },
  tabBtnTextActive: {
    color: "#fff",
  },
  classTabScroll: {
    flex: 1,
  },
  classTabBody: {
    padding: 14,
    paddingBottom: 28,
    flexGrow: 1,
  },
  rowCard: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 2,
  },
  rowMeta: {
    fontSize: 13,
    color: "#64748B",
  },
  analyticsSummary: {
    backgroundColor: "#E0F2FE",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#BAE6FD",
    padding: 12,
    marginBottom: 10,
    gap: 4,
  },
  setDetailDescription: {
    fontSize: 15,
    color: "#475569",
    lineHeight: 22,
    marginBottom: 12,
  },
  setDetailTags: {
    fontSize: 13,
    color: "#64748B",
    marginBottom: 16,
  },
  setDetailSectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 10,
  },
  practiceBtn: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#2593BE",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  practiceBtnText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
});
