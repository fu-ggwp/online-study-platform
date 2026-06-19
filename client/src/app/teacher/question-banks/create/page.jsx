"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Plus, Save } from "lucide-react";

import QuestionCardEditor from "@/components/question-creator/QuestionCardEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { questionBanksService } from "@/services/question-banks.service";

const initialForm = {
  title: "",
  description: "",
  topic: "",
  status: "Private",
};

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

function normalizeTrueFalseOptions(options = []) {
  const next = options.slice(0, 2).map((option) => ({
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
  const next = options.map((option) => ({
    option_text: option.option_text || "",
    is_correct: Boolean(option.is_correct),
  }));

  while (next.length < 2) next.push(emptyOption());
  return next;
}

function buildPayload(form, questions) {
  return {
    title: form.title.trim(),
    description: form.description.trim() || null,
    topic: form.topic.trim() || null,
    status: form.status,
    questions: questions.map((question) => ({
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

export default function CreateQuestionBankPage() {
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [questions, setQuestions] = useState([emptyQuestion()]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

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
      const response = await questionBanksService.create(buildPayload(form, questions));
      const questionBankId = response?.data?.question_bank_id;

      if (questionBankId) {
        router.push(`/teacher/question-banks/${questionBankId}`);
        return;
      }

      router.push("/teacher/question-banks");
    } catch (err) {
      const fieldErrors = mapServerFieldErrors(err.response?.data?.fields || {});
      setErrors({
        ...fieldErrors,
        submit: Object.keys(fieldErrors).length
          ? "Please review the highlighted fields."
          : err.response?.data?.message || err.message || "Question bank could not be created.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-background px-4 py-6 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-4xl space-y-6">
        <header className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Button onClick={() => router.push("/teacher/question-banks")} size="sm" variant="ghost" className="mb-3 -ml-3" type="button">
              <ArrowLeft className="size-4" />
              Back
            </Button>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Create Question Bank</h1>
            <p className="mt-2 text-sm text-muted-foreground">Create metadata and draft reusable questions in one place.</p>
          </div>
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
                <p className="text-sm text-muted-foreground">Add prompts, options, scores, and explanations directly.</p>
              </div>
              <Button onClick={addBlankQuestion} type="button" variant="outline" className="gap-2">
                <Plus className="size-4" />
                Add Question Card
              </Button>
            </div>

            {questions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
                This bank will be created without questions.
              </div>
            ) : (
              <div className="space-y-6">
                {questions.map((question, index) => (
                  <QuestionCardEditor
                    key={index}
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
            <Button disabled={submitting} onClick={() => router.push("/teacher/question-banks")} type="button" variant="outline">
              Cancel
            </Button>
            <Button disabled={submitting} type="submit" className="gap-2">
              {submitting ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              {submitting ? "Creating..." : "Create Question Bank"}
            </Button>
          </div>
        </form>
      </section>
    </main>
  );
}
