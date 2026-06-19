"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, Loader2, Plus, Save, Trash2 } from "lucide-react";

import QuestionCardEditor from "@/components/question-creator/QuestionCardEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { questionBanksService } from "@/services/question-banks.service";

import { QuestionBanksStatePanel } from "../../_components/question-banks-state-panel";

const initialForm = {
  title: "",
  description: "",
  topic: "",
  status: "Private",
};

function normalizeParamId(value) {
  return Array.isArray(value) ? value[0] : value;
}

function emptyOption(label = "") {
  return { option_text: label, is_correct: false };
}

function emptyQuestion() {
  return {
    question_text: "",
    question_type: "multiple_choice",
    score: 1,
    explanation: "",
    subject: "",
    topic: "",
    chapter: "",
    options: [emptyOption(), emptyOption()],
  };
}

function sortOptions(options = []) {
  return [...options].sort((left, right) => (left.display_order || 0) - (right.display_order || 0));
}

function normalizeTrueFalseOptions(options = []) {
  const next = sortOptions(options).slice(0, 2).map((option) => ({
    option_text: option.option_text || "",
    is_correct: Boolean(option.is_correct),
  }));

  while (next.length < 2) {
    next.push(emptyOption(next.length === 0 ? "True" : "False"));
  }

  let correctSeen = false;
  return next.map((option, index) => {
    const fallbackText = index === 0 ? "True" : "False";

    if (!option.is_correct || correctSeen) {
      return { option_text: option.option_text || fallbackText, is_correct: false };
    }

    correctSeen = true;
    return { option_text: option.option_text || fallbackText, is_correct: true };
  });
}

function normalizeMultipleChoiceOptions(options = []) {
  const next = sortOptions(options).map((option) => ({
    option_text: option.option_text || "",
    is_correct: Boolean(option.is_correct),
  }));

  while (next.length < 2) next.push(emptyOption());
  return next;
}

function toQuestionDraft(question) {
  const questionType = question?.question_type === "true_false" ? "true_false" : "multiple_choice";
  const options = questionType === "true_false"
    ? normalizeTrueFalseOptions(question?.answer_options || question?.options || [])
    : normalizeMultipleChoiceOptions(question?.answer_options || question?.options || []);

  return {
    question_id: question?.question_id,
    source_question_id: question?.source_question_id || null,
    question_text: question?.question_text || "",
    question_type: questionType,
    score: question?.score ?? 1,
    explanation: question?.explanation || "",
    subject: question?.subject || "",
    topic: question?.topic || "",
    chapter: question?.chapter || "",
    options,
  };
}

function toFormValues(questionBank) {
  return {
    title: questionBank?.title || "",
    description: questionBank?.description || "",
    topic: questionBank?.topic || "",
    status: questionBank?.status === "Assigned" ? "Assigned" : "Private",
  };
}

function buildPayload(form, questions) {
  return {
    title: form.title.trim(),
    description: form.description.trim() || null,
    topic: form.topic.trim() || null,
    status: form.status,
    questions: questions.map((question) => ({
      question_id: question.question_id,
      source_question_id: question.source_question_id || null,
      question_text: question.question_text.trim(),
      question_type: question.question_type || "multiple_choice",
      score: Number(question.score ?? 1),
      explanation: question.explanation?.trim() || null,
      subject: question.subject?.trim() || null,
      topic: question.topic?.trim() || null,
      chapter: question.chapter?.trim() || null,
      answer_options: question.options.map((option) => ({
        option_text: option.option_text.trim(),
        is_correct: Boolean(option.is_correct),
      })),
    })),
  };
}

function validateForm(form, questions) {
  const errors = {};

  if (!form.title.trim()) {
    errors.title = "Please complete all required information.";
  }

  questions.forEach((question, index) => {
    const score = Number(question.score ?? 1);
    const correctCount = question.options.filter((option) => option.is_correct).length;

    if (!question.question_text.trim()) {
      errors[`q_${index}_text`] = "Question prompt cannot be empty.";
    }

    if (!Number.isFinite(score) || score < 0) {
      errors[`q_${index}_score`] = "Score must be 0 or greater.";
    }

    if (question.question_type === "true_false") {
      if (question.options.length !== 2) {
        errors[`q_${index}_options`] = "True/false questions need exactly 2 answer options.";
      } else if (correctCount !== 1) {
        errors[`q_${index}_options`] = "True/false questions need exactly one correct answer.";
      }
    } else if (question.options.length < 2) {
      errors[`q_${index}_options`] = "Question must have at least 2 options.";
    } else if (correctCount < 1) {
      errors[`q_${index}_options`] = "At least one correct option must be selected.";
    }

    if (!errors[`q_${index}_options`] && question.options.some((option) => !option.option_text.trim())) {
      errors[`q_${index}_options`] = "All options must be filled out.";
    }
  });

  return errors;
}

function mapServerFieldErrors(fields = {}) {
  const errors = {};

  Object.entries(fields).forEach(([field, message]) => {
    const questionMatch = field.match(/^questions\.(\d+)\.(.+)$/);
    if (!questionMatch) {
      errors[field] = message;
      return;
    }

    const [, index, suffix] = questionMatch;
    if (suffix === "question_text") errors[`q_${index}_text`] = message;
    else if (suffix === "score") errors[`q_${index}_score`] = message;
    else if (suffix.startsWith("answer_options")) errors[`q_${index}_options`] = message;
    else errors[`q_${index}_${suffix}`] = message;
  });

  return errors;
}

export default function EditQuestionBankPage() {
  const router = useRouter();
  const params = useParams();
  const questionBankId = useMemo(() => normalizeParamId(params?.id), [params]);

  const [form, setForm] = useState(initialForm);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [errors, setErrors] = useState({});

  const detailHref = `/teacher/question-banks/${questionBankId}`;

  const loadQuestionBank = useCallback(async () => {
    if (!questionBankId) return;

    setLoading(true);
    setLoadError("");

    try {
      const [bankResponse, questionRows] = await Promise.all([
        questionBanksService.getOne(questionBankId),
        questionBanksService.listQuestions(questionBankId),
      ]);

      setForm(toFormValues(bankResponse?.data));
      setQuestions((questionRows || []).map(toQuestionDraft));
      setErrors({});
    } catch (err) {
      setLoadError(err.response?.data?.message || err.message || "Failed to load question bank.");
    } finally {
      setLoading(false);
    }
  }, [questionBankId]);

  useEffect(() => {
    void Promise.resolve().then(loadQuestionBank);
  }, [loadQuestionBank]);

  function clearError(name) {
    setErrors((current) => {
      const next = { ...current };
      delete next[name];
      delete next.submit;
      return next;
    });
  }

  function handleMetadataChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    clearError(name);
  }

  function addBlankQuestion() {
    setQuestions((current) => [...current, emptyQuestion()]);
    clearError("questions");
  }

  function deleteQuestion(index) {
    setQuestions((current) => current.filter((_, currentIndex) => currentIndex !== index));
    setErrors((current) => {
      const next = {};

      Object.entries(current).forEach(([key, value]) => {
        const match = key.match(/^q_(\d+)_(.+)$/);
        if (!match) {
          if (key !== "submit") next[key] = value;
          return;
        }

        const currentIndex = Number(match[1]);
        const suffix = match[2];
        if (currentIndex < index) next[key] = value;
        if (currentIndex > index) next[`q_${currentIndex - 1}_${suffix}`] = value;
      });

      return next;
    });
  }

  function updateQuestionField(index, field, value) {
    setQuestions((current) => current.map((question, currentIndex) => {
      if (currentIndex !== index) return question;

      if (field === "question_type" && value === "true_false") {
        return { ...question, question_type: value, options: normalizeTrueFalseOptions(question.options) };
      }

      if (field === "question_type") {
        return { ...question, question_type: value, options: normalizeMultipleChoiceOptions(question.options) };
      }

      return { ...question, [field]: value };
    }));

    clearError(field === "question_text" ? `q_${index}_text` : `q_${index}_${field}`);
  }

  function addOption(index) {
    setQuestions((current) => current.map((question, currentIndex) => (
      currentIndex === index
        ? { ...question, options: [...question.options, emptyOption()] }
        : question
    )));
    clearError(`q_${index}_options`);
  }

  function deleteOption(questionIndex, optionIndex) {
    setQuestions((current) => current.map((question, currentIndex) => (
      currentIndex === questionIndex
        ? { ...question, options: question.options.filter((_, currentOptionIndex) => currentOptionIndex !== optionIndex) }
        : question
    )));
    clearError(`q_${questionIndex}_options`);
  }

  function updateOption(questionIndex, optionIndex, field, value) {
    setQuestions((current) => current.map((question, currentIndex) => {
      if (currentIndex !== questionIndex) return question;

      const options = question.options.map((option, currentOptionIndex) => {
        if (currentOptionIndex !== optionIndex) return option;
        return { ...option, [field]: value };
      });

      if (field === "is_correct" && question.question_type === "true_false" && value) {
        return {
          ...question,
          options: options.map((option, currentOptionIndex) => ({
            ...option,
            is_correct: currentOptionIndex === optionIndex,
          })),
        };
      }

      return { ...question, options };
    }));
    clearError(`q_${questionIndex}_options`);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const nextErrors = validateForm(form, questions);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      await questionBanksService.update(questionBankId, buildPayload(form, questions));
      router.push(detailHref);
    } catch (err) {
      const fieldErrors = mapServerFieldErrors(err.response?.data?.fields || {});
      setErrors({
        ...fieldErrors,
        submit: Object.keys(fieldErrors).length
          ? "Please review the highlighted fields."
          : err.response?.data?.message || err.message || "Question bank could not be updated.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm("Delete this question bank?");
    if (!confirmed) return;

    setErrors({});
    setArchiving(true);

    try {
      await questionBanksService.remove(questionBankId);
      router.push("/teacher/question-banks");
    } catch (err) {
      setErrors({ submit: err.response?.data?.message || err.message || "Question bank delete failed." });
    } finally {
      setArchiving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background px-4 py-6 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-4xl">
          <QuestionBanksStatePanel title="Loading question bank" description="Fetching metadata and questions." />
        </section>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="min-h-screen bg-background px-4 py-6 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-4xl">
          <QuestionBanksStatePanel
            action={<Button onClick={loadQuestionBank} type="button">Try Again</Button>}
            icon={<AlertCircle className="size-5" />}
            title="Unable to load question bank"
            description={loadError}
          />
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-6 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-4xl space-y-6">
        <header className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Button onClick={() => router.push(detailHref)} size="sm" variant="ghost" className="mb-3 -ml-3" type="button">
              <ArrowLeft className="size-4" />
              Back
            </Button>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Edit Question Bank</h1>
            <p className="mt-2 text-sm text-muted-foreground">Update metadata and edit reusable questions in one place.</p>
          </div>

          <Button disabled={archiving || submitting} onClick={handleDelete} type="button" variant="destructive">
            {archiving ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            {archiving ? "Deleting..." : "Delete"}
          </Button>
        </header>

        {errors.submit && (
          <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {errors.submit}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
            <h2 className="border-b border-border pb-2 text-lg font-bold text-foreground">Question Bank Details</h2>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-sm font-semibold text-foreground">Title <span className="text-rose-500">*</span></label>
                <Input name="title" placeholder="e.g. Grade 10 Algebra" value={form.title} onChange={handleMetadataChange} />
                {errors.title && <p className="text-xs font-semibold text-rose-500">{errors.title}</p>}
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-sm font-semibold text-foreground">Description</label>
                <textarea
                  className="min-h-[80px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  name="description"
                  placeholder="What topics, classes, or exam goals does this bank cover?"
                  value={form.description}
                  onChange={handleMetadataChange}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-foreground">Topic</label>
                <Input name="topic" placeholder="e.g. Linear equations" value={form.topic} onChange={handleMetadataChange} />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-foreground">Status</label>
                <select
                  className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  name="status"
                  value={form.status}
                  onChange={handleMetadataChange}
                >
                  <option value="Private">Private</option>
                  <option value="Assigned">Assigned</option>
                </select>
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold text-foreground">Questions ({questions.length})</h2>
                <p className="text-sm text-muted-foreground">Edit prompts, options, scores, and explanations directly.</p>
              </div>
              <Button onClick={addBlankQuestion} type="button" variant="outline" className="gap-2">
                <Plus className="size-4" />
                Add Question Card
              </Button>
            </div>

            {questions.length === 0 ? (
              <QuestionBanksStatePanel
                title="No questions in this bank"
                description="Add a question card or save this empty bank to remove all active questions."
              />
            ) : (
              <div className="space-y-6">
                {questions.map((question, index) => (
                  <QuestionCardEditor
                    key={question.question_id || index}
                    question={question}
                    qIndex={index}
                    errors={errors}
                    showQuestionDetails
                    onFieldChange={(field, value) => updateQuestionField(index, field, value)}
                    onDelete={() => deleteQuestion(index)}
                    onAddOption={() => addOption(index)}
                    onDeleteOption={(optionIndex) => deleteOption(index, optionIndex)}
                    onOptionChange={(optionIndex, field, value) => updateOption(index, optionIndex, field, value)}
                  />
                ))}
              </div>
            )}

            <Button onClick={addBlankQuestion} type="button" variant="outline" className="h-12 w-full gap-2 rounded-2xl border-dashed">
              <Plus className="size-4" />
              Add Question Card
            </Button>
          </section>

          <div className="flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-end">
            <Button disabled={submitting || archiving} onClick={() => router.push(detailHref)} type="button" variant="outline">
              Cancel
            </Button>
            <Button disabled={submitting || archiving} type="submit" className="gap-2">
              {submitting ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              {submitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </section>
    </main>
  );
}
