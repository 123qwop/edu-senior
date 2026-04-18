import { getUserRole } from "@/api/authApi";
import {
  type ClassOut,
  createClass,
  deleteClass,
  getClasses,
} from "@/api/studySetsApi";
import AntDesign from "@expo/vector-icons/AntDesign";
import { Picker } from "@react-native-picker/picker";
import { Stack } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

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

export default function MyClassesPage() {
  const [classes, setClasses] = useState<ClassOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  /** Empty string until user picks a subject (required). */
  const [newClassSubject, setNewClassSubject] = useState("");
  /** "none" or "7"…"12"; stored as digit string for Picker values. */
  const [newClassGrade, setNewClassGrade] = useState(GRADE_NONE);
  const [newClassDescription, setNewClassDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const isTeacher = role === "teacher";

  const loadClasses = useCallback(async () => {
    try {
      setError(null);
      const [userRole, data] = await Promise.all([
        getUserRole(),
        getClasses(),
      ]);
      setRole(userRole);
      setClasses(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load classes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

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
          newClassGrade === GRADE_NONE
            ? undefined
            : `Grade ${newClassGrade}`,
        description: newClassDescription.trim() || undefined,
      });
      closeCreateModal();
      await loadClasses();
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
    Alert.alert(
      "Delete class",
      `Delete "${item.class_name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setDeletingId(item.id);
              await deleteClass(item.id);
              await loadClasses();
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
      ],
    );
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

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color="#2593BE" />
              <Text style={styles.muted}>Loading…</Text>
            </View>
          ) : error ? (
            <View style={styles.centered}>
              <Text style={styles.error}>{error}</Text>
              <Pressable style={styles.primaryBtn} onPress={loadClasses}>
                <Text style={styles.primaryBtnText}>Retry</Text>
              </Pressable>
            </View>
          ) : filtered.length === 0 ? (
            <Text style={styles.muted}>
              {classes.length === 0
                ? "No classes yet."
                : "No classes match your search."}
            </Text>
          ) : (
            filtered.map((item) => (
              <View key={item.id} style={styles.card}>
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
                {isTeacher ? (
                  <Pressable
                    style={styles.dangerBtn}
                    disabled={deletingId === item.id}
                    onPress={() => confirmDelete(item)}
                  >
                    <Text style={styles.dangerBtnText}>
                      {deletingId === item.id ? "Deleting…" : "Delete"}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ))
          )}
        </ScrollView>
      </View>

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
    paddingBottom: 24,
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
  dangerBtn: {
    marginTop: 10,
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 12,
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
});
