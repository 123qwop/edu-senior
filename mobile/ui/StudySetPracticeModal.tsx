import {
  getStudySetQuestions,
  recordProgress,
  type Question,
  type RecordProgressResponse,
} from "@/api/studySetsApi";
import AntDesign from "@expo/vector-icons/AntDesign";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  visible: boolean;
  setId: number | null;
  title: string;
  onClose: () => void;
  onSubmitted?: () => void;
};

function normQuestionType(type: string | undefined): string {
  if (!type) return "";
  return String(type).trim().toLowerCase().replace(/\s+/g, "_");
}

function buildProgressPayload(
  questions: Question[],
  answers: Record<number, string | number | boolean>,
): { [key: string]: string | number | boolean } {
  const merged: { [key: string]: string | number | boolean } = {};
  for (const q of questions) {
    const v = answers[q.id];
    if (v !== undefined && v !== "") {
      merged[String(q.id)] = v;
    }
  }
  return merged;
}

function canGoNext(
  q: Question | undefined,
  answers: Record<number, string | number | boolean>,
): boolean {
  if (!q) return false;
  if (normQuestionType(q.type) === "flashcard") return true;
  const v = answers[q.id];
  return v !== undefined && v !== "";
}

export default function StudySetPracticeModal({
  visible,
  setId,
  title,
  onClose,
  onSubmitted,
}: Props) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<
    Record<number, string | number | boolean>
  >({});
  const [flashFlipped, setFlashFlipped] = useState<Record<number, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [results, setResults] = useState<RecordProgressResponse | null>(null);

  const reset = useCallback(() => {
    setError(null);
    setSubmitError(null);
    setResults(null);
    setQuestions([]);
    setIndex(0);
    setAnswers({});
    setFlashFlipped({});
  }, []);

  useEffect(() => {
    if (!visible || setId == null) {
      return;
    }
    let cancelled = false;
    reset();
    setLoading(true);
    (async () => {
      try {
        const qs = await getStudySetQuestions(setId);
        if (!cancelled) setQuestions(qs);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load questions");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, setId, reset]);

  const current = questions[index];
  const atEnd = index >= Math.max(0, questions.length - 1);
  const nextEnabled = canGoNext(current, answers);

  const handleSubmit = async () => {
    if (setId == null) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload = buildProgressPayload(questions, answers);
      const res = await recordProgress(setId, payload);
      setResults(res);
    } catch (e) {
      setSubmitError(
        e instanceof Error ? e.message : "Could not save progress",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDone = () => {
    if (results) onSubmitted?.();
    onClose();
  };

  const setAnswer = (qid: number, value: string | number | boolean) => {
    setAnswers((prev) => ({ ...prev, [qid]: value }));
  };

  const renderQuestionBody = () => {
    if (!current) return null;
    const q = current;
    const qt = normQuestionType(q.type);

    if (qt === "flashcard") {
      const flipped = flashFlipped[q.id] ?? false;
      return (
        <Pressable
          onPress={() =>
            setFlashFlipped((p) => ({ ...p, [q.id]: !p[q.id] }))
          }
          style={styles.flashCard}
        >
          <Text style={styles.flashLabel}>
            {flipped ? "Definition" : "Term"}
          </Text>
          <Text style={styles.flashText}>
            {flipped ? (q.definition ?? "—") : (q.term ?? "—")}
          </Text>
          <Text style={styles.flashHint}>Tap to flip</Text>
        </Pressable>
      );
    }

    if (qt === "multiple_choice" && q.options?.length) {
      return (
        <View>
          <Text style={styles.prompt}>{q.content}</Text>
          {q.options.map((opt, idx) => {
            const selected = String(answers[q.id] ?? "") === String(idx);
            return (
              <Pressable
                key={idx}
                onPress={() => setAnswer(q.id, String(idx))}
                style={[
                  styles.optionRow,
                  selected && styles.optionRowSelected,
                ]}
              >
                <Text style={styles.optionText}>
                  {idx + 1}. {opt}
                </Text>
              </Pressable>
            );
          })}
        </View>
      );
    }

    if (qt === "true_false") {
      return (
        <View>
          <Text style={styles.prompt}>{q.content}</Text>
          {(["true", "false"] as const).map((v) => {
            const selected = String(answers[q.id] ?? "") === v;
            return (
              <Pressable
                key={v}
                onPress={() => setAnswer(q.id, v)}
                style={[
                  styles.optionRow,
                  selected && styles.optionRowSelected,
                ]}
              >
                <Text style={styles.optionText}>
                  {v === "true" ? "True" : "False"}
                </Text>
              </Pressable>
            );
          })}
        </View>
      );
    }

    if (qt === "short_answer" || qt === "problem") {
      return (
        <View>
          <Text style={styles.prompt}>{q.content}</Text>
          <TextInput
            style={styles.textArea}
            multiline
            value={String(answers[q.id] ?? "")}
            onChangeText={(t) => setAnswer(q.id, t)}
            placeholder={
              qt === "problem" ? "Your solution" : "Your answer"
            }
            placeholderTextColor="#94A3B8"
            textAlignVertical="top"
          />
        </View>
      );
    }

    return (
      <View>
        <Text style={styles.prompt}>{q.content}</Text>
        <Text style={styles.muted}>This question type is not supported yet.</Text>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={insets.top}
      >
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <Pressable onPress={onClose} style={styles.backBtn}>
            <AntDesign name="arrow-left" size={18} color="#0F172A" />
            <Text style={styles.backBtnText}>Close</Text>
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={2}>
            {title}
          </Text>
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#2593BE" />
            <Text style={styles.muted}>Loading questions…</Text>
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Text style={styles.error}>{error}</Text>
            <Pressable style={styles.primaryBtn} onPress={onClose}>
              <Text style={styles.primaryBtnText}>Close</Text>
            </Pressable>
          </View>
        ) : results ? (
          <ScrollView
            style={styles.bodyScroll}
            contentContainerStyle={[
              styles.resultsBody,
              { paddingBottom: 24 + insets.bottom },
            ]}
          >
            <Text style={styles.resultsTitle}>Session complete</Text>
            <View style={styles.resultCard}>
              <Text style={styles.resultBig}>
                {Math.round(results.mastery_percentage)}
              </Text>
              <Text style={styles.resultSub}>Mastery</Text>
            </View>
            <Text style={styles.resultLine}>
              Correct: {results.correct_answers} / {results.total_questions}
            </Text>
            <Pressable style={styles.primaryBtn} onPress={handleDone}>
              <Text style={styles.primaryBtnText}>Done</Text>
            </Pressable>
          </ScrollView>
        ) : questions.length === 0 ? (
          <View style={styles.centered}>
            <Text style={styles.muted}>This study set has no items yet.</Text>
            <Pressable style={styles.primaryBtn} onPress={onClose}>
              <Text style={styles.primaryBtnText}>Close</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.progressBar}>
              <Text style={styles.progressText}>
                Question {index + 1} of {questions.length}
              </Text>
            </View>
            <ScrollView
              style={styles.bodyScroll}
              contentContainerStyle={[
                styles.questionScroll,
                { paddingBottom: 120 + insets.bottom },
              ]}
              keyboardShouldPersistTaps="handled"
            >
              {renderQuestionBody()}
              {submitError ? (
                <Text style={styles.errorMargin}>{submitError}</Text>
              ) : null}
            </ScrollView>

            <View
              style={[
                styles.footer,
                { paddingBottom: Math.max(12, insets.bottom) },
              ]}
            >
              <Pressable
                style={[styles.navBtn, index === 0 && styles.navBtnDisabled]}
                onPress={() => setIndex((i) => Math.max(0, i - 1))}
                disabled={index === 0}
              >
                <Text
                  style={[
                    styles.navBtnText,
                    index === 0 && styles.navBtnTextDisabled,
                  ]}
                >
                  Previous
                </Text>
              </Pressable>
              {!atEnd ? (
                <Pressable
                  style={[
                    styles.primaryBtn,
                    !nextEnabled && styles.navBtnDisabled,
                  ]}
                  onPress={() => setIndex((i) => i + 1)}
                  disabled={!nextEnabled}
                >
                  <Text style={styles.primaryBtnText}>Next</Text>
                </Pressable>
              ) : (
                <Pressable
                  style={[
                    styles.primaryBtn,
                    submitting && styles.navBtnDisabled,
                  ]}
                  onPress={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Submit</Text>
                  )}
                </Pressable>
              )}
            </View>
          </>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F1F5F9",
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
    alignSelf: "flex-start",
  },
  backBtnText: {
    color: "#0F172A",
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  progressBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#E0F2FE",
    borderBottomWidth: 1,
    borderBottomColor: "#BAE6FD",
  },
  progressText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0369A1",
  },
  bodyScroll: {
    flex: 1,
  },
  questionScroll: {
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
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
  },
  errorMargin: {
    color: "#B91C1C",
    marginTop: 16,
  },
  prompt: {
    fontSize: 17,
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: 14,
    lineHeight: 24,
  },
  flashCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 24,
    minHeight: 200,
    justifyContent: "center",
    alignItems: "center",
  },
  flashLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 8,
  },
  flashText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2593BE",
    textAlign: "center",
    lineHeight: 28,
  },
  flashHint: {
    marginTop: 16,
    fontSize: 13,
    color: "#94A3B8",
  },
  optionRow: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  optionRowSelected: {
    borderColor: "#2593BE",
    backgroundColor: "#E0F2FE",
  },
  optionText: {
    fontSize: 16,
    color: "#0F172A",
  },
  textArea: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    padding: 12,
    minHeight: 120,
    fontSize: 16,
    backgroundColor: "#fff",
    color: "#0F172A",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  navBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#fff",
  },
  navBtnDisabled: {
    opacity: 0.45,
  },
  navBtnText: {
    fontWeight: "600",
    color: "#334155",
  },
  navBtnTextDisabled: {
    color: "#94A3B8",
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: "#2593BE",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  resultsBody: {
    padding: 20,
    alignItems: "center",
  },
  resultsTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 20,
  },
  resultCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingVertical: 24,
    paddingHorizontal: 40,
    alignItems: "center",
    marginBottom: 16,
  },
  resultBig: {
    fontSize: 40,
    fontWeight: "800",
    color: "#2593BE",
  },
  resultSub: {
    marginTop: 4,
    fontSize: 14,
    color: "#64748B",
    fontWeight: "600",
  },
  resultLine: {
    fontSize: 16,
    color: "#475569",
    marginBottom: 24,
    textAlign: "center",
  },
});
