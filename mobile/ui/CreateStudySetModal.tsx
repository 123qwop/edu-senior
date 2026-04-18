import {
  createStudySet,
  getClasses,
  type ClassOut,
  type StudySetCreate,
} from "@/api/studySetsApi";
import { Picker } from "@react-native-picker/picker";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

const STUDY_SET_TYPES = ["Flashcards", "Quiz", "Problem set"] as const;
type StudySetType = (typeof STUDY_SET_TYPES)[number];

const QUESTION_TYPES = [
  "Multiple choice",
  "True/False",
  "Short answer",
] as const;
type QuestionType = (typeof QUESTION_TYPES)[number];

/** Matches web `CreateStudySetDialog` subject list. */
const CREATE_SUBJECTS = [
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "English",
  "History",
] as const;

const LEVEL_OPTIONS = [
  "Grade 7",
  "Grade 8",
  "Grade 9",
  "Grade 10",
  "Grade 11",
  "Grade 12",
  "University",
] as const;

const LEVEL_NONE = "";

type Props = {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  isTeacher: boolean;
};

export default function CreateStudySetModal({
  visible,
  onClose,
  onSuccess,
  isTeacher,
}: Props) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<StudySetType>("Flashcards");
  const [subject, setSubject] = useState("");
  const [level, setLevel] = useState(LEVEL_NONE);
  const [description, setDescription] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  const [flashcardTerm, setFlashcardTerm] = useState("");
  const [flashcardDefinition, setFlashcardDefinition] = useState("");

  const [questionText, setQuestionText] = useState("");
  const [questionType, setQuestionType] = useState<QuestionType>(
    "Multiple choice",
  );
  const [option1, setOption1] = useState("");
  const [option2, setOption2] = useState("");
  const [option3, setOption3] = useState("");
  const [option4, setOption4] = useState("");
  const [correctOption, setCorrectOption] = useState("1");
  const [trueFalseAnswer, setTrueFalseAnswer] = useState("true");
  const [shortAnswer, setShortAnswer] = useState("");

  const [problemStatement, setProblemStatement] = useState("");
  const [solution, setSolution] = useState("");

  const [classes, setClasses] = useState<ClassOut[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [assignToAll, setAssignToAll] = useState(true);
  const [dueDate, setDueDate] = useState("");
  const [timeLimitMinutes, setTimeLimitMinutes] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const resetForm = useCallback(() => {
    setTitle("");
    setType("Flashcards");
    setSubject("");
    setLevel(LEVEL_NONE);
    setDescription("");
    setTagsInput("");
    setIsPublic(false);
    setFlashcardTerm("");
    setFlashcardDefinition("");
    setQuestionText("");
    setQuestionType("Multiple choice");
    setOption1("");
    setOption2("");
    setOption3("");
    setOption4("");
    setCorrectOption("1");
    setTrueFalseAnswer("true");
    setShortAnswer("");
    setProblemStatement("");
    setSolution("");
    setSelectedClassId("");
    setAssignToAll(true);
    setDueDate("");
    setTimeLimitMinutes("");
    setErrors({});
  }, []);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  useEffect(() => {
    if (!visible || !isTeacher) return;
    getClasses()
      .then(setClasses)
      .catch(() => setClasses([]));
  }, [visible, isTeacher]);

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!title.trim()) next.title = "Title is required.";
    if (!subject) next.subject = "Subject is required.";

    if (type === "Quiz" && questionText.trim()) {
      if (questionType === "Multiple choice") {
        if (
          !option1.trim() ||
          !option2.trim() ||
          !option3.trim() ||
          !option4.trim()
        ) {
          next.quizOptions = "All four options are required.";
        }
      }
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const parseTags = (): string[] | undefined => {
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    return tags.length ? tags : undefined;
  };

  const parseTimeLimit = (): number | undefined => {
    const raw = timeLimitMinutes.trim();
    if (!raw) return undefined;
    const n = parseInt(raw, 10);
    if (Number.isNaN(n) || n < 1 || n > 1440) return undefined;
    return n;
  };

  const buildInitialItem = (): StudySetCreate["initialItem"] | undefined => {
    if (type === "Flashcards") {
      if (!flashcardTerm.trim() && !flashcardDefinition.trim()) return undefined;
      return {
        term: flashcardTerm.trim(),
        definition: flashcardDefinition.trim(),
      };
    }
    if (type === "Quiz") {
      if (!questionText.trim()) return undefined;
      if (questionType === "Multiple choice") {
        return {
          question: questionText.trim(),
          questionType,
          options: [
            option1.trim(),
            option2.trim(),
            option3.trim(),
            option4.trim(),
          ],
          correctAnswer: parseInt(correctOption, 10),
        };
      }
      if (questionType === "True/False") {
        return {
          question: questionText.trim(),
          questionType,
          correctAnswer: trueFalseAnswer === "true",
        };
      }
      return {
        question: questionText.trim(),
        questionType,
        correctAnswer: shortAnswer.trim(),
      };
    }
    if (type === "Problem set") {
      if (!problemStatement.trim()) return undefined;
      return {
        problem: problemStatement.trim(),
        solution: solution.trim() || undefined,
      };
    }
    return undefined;
  };

  const buildAssignment = (): StudySetCreate["assignment"] | undefined => {
    if (!isTeacher || !selectedClassId) return undefined;
    const classId = parseInt(selectedClassId, 10);
    if (Number.isNaN(classId)) return undefined;
    return {
      classId,
      assignToAll,
      dueDate: dueDate.trim() || undefined,
      timeLimitMinutes: parseTimeLimit(),
    };
  };

  const handleCreate = async () => {
    if (submitting) return;
    if (!validate()) return;

    const payload: StudySetCreate = {
      title: title.trim(),
      subject,
      type,
      level: level === LEVEL_NONE ? undefined : level,
      description: description.trim() || undefined,
      tags: parseTags(),
      is_public: isPublic,
      initialItem: buildInitialItem(),
      assignment: buildAssignment(),
    };

    try {
      setSubmitting(true);
      await createStudySet(payload);
      Alert.alert("Success", `Created “${payload.title}”.`);
      resetForm();
      onClose();
      onSuccess();
    } catch (e) {
      Alert.alert(
        "Error",
        e instanceof Error ? e.message : "Failed to create study set",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.modalTitle}>Create study set</Text>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={styles.scroll}
          >
            <Text style={styles.sectionTitle}>Basic information</Text>
            <Text style={styles.label}>
              Title <Text style={styles.req}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Title"
              value={title}
              onChangeText={setTitle}
              placeholderTextColor="#64748B"
            />
            {errors.title ? (
              <Text style={styles.errText}>{errors.title}</Text>
            ) : null}

            <Text style={styles.label}>Type</Text>
            <View style={styles.pickerWrap}>
              <Picker
                selectedValue={type}
                onValueChange={(v) => setType(v as StudySetType)}
                style={styles.picker}
              >
                {STUDY_SET_TYPES.map((t) => (
                  <Picker.Item key={t} label={t} value={t} />
                ))}
              </Picker>
            </View>

            <Text style={styles.label}>
              Subject <Text style={styles.req}>*</Text>
            </Text>
            <View style={styles.pickerWrap}>
              <Picker
                selectedValue={subject}
                onValueChange={(v) => setSubject(String(v))}
                style={styles.picker}
              >
                <Picker.Item label="Select subject" value="" />
                {CREATE_SUBJECTS.map((s) => (
                  <Picker.Item key={s} label={s} value={s} />
                ))}
              </Picker>
            </View>
            {errors.subject ? (
              <Text style={styles.errText}>{errors.subject}</Text>
            ) : null}

            <Text style={styles.label}>Level (optional)</Text>
            <View style={styles.pickerWrap}>
              <Picker
                selectedValue={level}
                onValueChange={(v) => setLevel(String(v))}
                style={styles.picker}
              >
                <Picker.Item label="None" value={LEVEL_NONE} />
                {LEVEL_OPTIONS.map((l) => (
                  <Picker.Item key={l} label={l} value={l} />
                ))}
              </Picker>
            </View>

            <Text style={styles.label}>Description (optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description"
              value={description}
              onChangeText={setDescription}
              placeholderTextColor="#64748B"
              multiline
              textAlignVertical="top"
            />

            <Text style={styles.label}>Visibility</Text>
            <View style={styles.row}>
              <Pressable
                style={[styles.chip, !isPublic && styles.chipOn]}
                onPress={() => setIsPublic(false)}
              >
                <Text style={[styles.chipText, !isPublic && styles.chipTextOn]}>
                  Private
                </Text>
              </Pressable>
              <Pressable
                style={[styles.chip, isPublic && styles.chipOn]}
                onPress={() => setIsPublic(true)}
              >
                <Text style={[styles.chipText, isPublic && styles.chipTextOn]}>
                  Public
                </Text>
              </Pressable>
            </View>
            <Text style={styles.hint}>
              {isPublic
                ? "Anyone can discover this set in public listings."
                : "Only you (and people you assign to) can see this set."}
            </Text>

            <Text style={styles.label}>Tags (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. algebra, exam — comma separated"
              value={tagsInput}
              onChangeText={setTagsInput}
              placeholderTextColor="#64748B"
            />

            <Text style={styles.sectionTitle}>First item (optional)</Text>
            {type === "Flashcards" ? (
              <>
                <Text style={styles.label}>Term</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Term"
                  value={flashcardTerm}
                  onChangeText={setFlashcardTerm}
                  placeholderTextColor="#64748B"
                />
                <Text style={styles.label}>Definition</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Definition"
                  value={flashcardDefinition}
                  onChangeText={setFlashcardDefinition}
                  placeholderTextColor="#64748B"
                />
              </>
            ) : null}

            {type === "Quiz" ? (
              <>
                <Text style={styles.label}>Question</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Question text"
                  value={questionText}
                  onChangeText={setQuestionText}
                  placeholderTextColor="#64748B"
                />
                <Text style={styles.label}>Question type</Text>
                <View style={styles.pickerWrap}>
                  <Picker
                    selectedValue={questionType}
                    onValueChange={(v) => setQuestionType(v as QuestionType)}
                    style={styles.picker}
                  >
                    {QUESTION_TYPES.map((qt) => (
                      <Picker.Item key={qt} label={qt} value={qt} />
                    ))}
                  </Picker>
                </View>
                {questionType === "Multiple choice" ? (
                  <>
                    <TextInput
                      style={styles.input}
                      placeholder="Option 1"
                      value={option1}
                      onChangeText={setOption1}
                      placeholderTextColor="#64748B"
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Option 2"
                      value={option2}
                      onChangeText={setOption2}
                      placeholderTextColor="#64748B"
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Option 3"
                      value={option3}
                      onChangeText={setOption3}
                      placeholderTextColor="#64748B"
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Option 4"
                      value={option4}
                      onChangeText={setOption4}
                      placeholderTextColor="#64748B"
                    />
                    <Text style={styles.label}>Correct option</Text>
                    <View style={styles.pickerWrap}>
                      <Picker
                        selectedValue={correctOption}
                        onValueChange={(v) => setCorrectOption(String(v))}
                        style={styles.picker}
                      >
                        <Picker.Item label="Option 1" value="1" />
                        <Picker.Item label="Option 2" value="2" />
                        <Picker.Item label="Option 3" value="3" />
                        <Picker.Item label="Option 4" value="4" />
                      </Picker>
                    </View>
                    {errors.quizOptions ? (
                      <Text style={styles.errText}>{errors.quizOptions}</Text>
                    ) : null}
                  </>
                ) : null}
                {questionType === "True/False" ? (
                  <View style={styles.row}>
                    <Pressable
                      style={[
                        styles.chip,
                        trueFalseAnswer === "true" && styles.chipOn,
                      ]}
                      onPress={() => setTrueFalseAnswer("true")}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          trueFalseAnswer === "true" && styles.chipTextOn,
                        ]}
                      >
                        True
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.chip,
                        trueFalseAnswer === "false" && styles.chipOn,
                      ]}
                      onPress={() => setTrueFalseAnswer("false")}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          trueFalseAnswer === "false" && styles.chipTextOn,
                        ]}
                      >
                        False
                      </Text>
                    </Pressable>
                  </View>
                ) : null}
                {questionType === "Short answer" ? (
                  <TextInput
                    style={styles.input}
                    placeholder="Expected answer"
                    value={shortAnswer}
                    onChangeText={setShortAnswer}
                    placeholderTextColor="#64748B"
                  />
                ) : null}
              </>
            ) : null}

            {type === "Problem set" ? (
              <>
                <Text style={styles.label}>Problem</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Problem statement"
                  value={problemStatement}
                  onChangeText={setProblemStatement}
                  placeholderTextColor="#64748B"
                  multiline
                  textAlignVertical="top"
                />
                <Text style={styles.label}>Solution (optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Solution"
                  value={solution}
                  onChangeText={setSolution}
                  placeholderTextColor="#64748B"
                  multiline
                  textAlignVertical="top"
                />
              </>
            ) : null}

            {isTeacher ? (
              <>
                <Text style={styles.sectionTitle}>
                  Assign to class (optional)
                </Text>
                <Text style={styles.hint}>
                  Leave class as “None” to assign later from the web app.
                </Text>
                <Text style={styles.label}>Class</Text>
                <View style={styles.pickerWrap}>
                  <Picker
                    selectedValue={selectedClassId}
                    onValueChange={(v) => setSelectedClassId(String(v))}
                    style={styles.picker}
                  >
                    <Picker.Item label="None" value="" />
                    {classes.map((c) => (
                      <Picker.Item
                        key={c.id}
                        label={c.class_name}
                        value={String(c.id)}
                      />
                    ))}
                  </Picker>
                </View>
                {selectedClassId ? (
                  <>
                    <Text style={styles.label}>Due date (optional)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. 2026-05-01T14:30"
                      value={dueDate}
                      onChangeText={setDueDate}
                      placeholderTextColor="#64748B"
                    />
                    <Text style={styles.label}>
                      Time limit per session (optional, minutes)
                    </Text>
                    <TextInput
                      style={styles.input}
                      placeholder="1–1440"
                      value={timeLimitMinutes}
                      onChangeText={setTimeLimitMinutes}
                      placeholderTextColor="#64748B"
                      keyboardType="number-pad"
                    />
                    <View style={styles.switchRow}>
                      <Text style={styles.switchLabel}>Assign to all students</Text>
                      <Switch
                        value={assignToAll}
                        onValueChange={setAssignToAll}
                        trackColor={{ false: "#CBD5E1", true: "#93C5FD" }}
                        thumbColor={assignToAll ? "#2593BE" : "#f4f3f4"}
                      />
                    </View>
                  </>
                ) : null}
              </>
            ) : null}
          </ScrollView>
          <View style={styles.actions}>
            <Pressable onPress={handleClose} style={styles.secondaryBtn}>
              <Text style={styles.secondaryBtnText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleCreate}
              disabled={submitting}
              style={[styles.primaryBtn, submitting && styles.disabled]}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Create</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.45)",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    maxHeight: "92%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 10,
  },
  scroll: {
    maxHeight: 520,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#334155",
    marginTop: 8,
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 4,
    marginTop: 6,
  },
  req: { color: "#DC2626" },
  hint: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 8,
  },
  errText: {
    color: "#B91C1C",
    fontSize: 12,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 8,
  },
  textArea: {
    minHeight: 80,
    paddingTop: 10,
  },
  pickerWrap: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    marginBottom: 10,
    overflow: "hidden",
  },
  picker: { width: "100%" },
  row: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 8,
    flexWrap: "wrap",
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#fff",
  },
  chipOn: {
    backgroundColor: "#2593BE",
    borderColor: "#2593BE",
  },
  chipText: {
    fontWeight: "600",
    color: "#475569",
    fontSize: 14,
  },
  chipTextOn: { color: "#fff" },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 10,
  },
  switchLabel: {
    fontSize: 15,
    color: "#334155",
    fontWeight: "600",
    flex: 1,
    paddingRight: 12,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
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
  disabled: { opacity: 0.6 },
});
