"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowLeft, CalendarClock, CheckCircle2, Loader2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import classesService from "@/services/classes.service";
import { examsService } from "@/services/exams.service";
import { questionBanksService } from "@/services/question-banks.service";

const INITIAL_FORM = {
  title: "",
  description: "",
  class_id: "",
  question_bank_id: "",
  status: "draft",
  start_at: "",
  end_at: "",
  duration_minutes: "60",
  attempt_limit: "1",
  question_count: "10",
  result_visibility: "score_only",
  access_code: "",
  randomize_questions: true,
  randomize_answers: true,
};

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
];

const RESULT_VISIBILITY_OPTIONS = [
  { value: "score_only", label: "Score only" },
  { value: "completion_only", label: "Completion only" },
];

function getQuestionCount(bank) {
  return Number(bank?.questionCount ?? bank?.question_count ?? 0);
}

function getErrorMessage(error) {
  return error?.response?.data?.error || error?.response?.data?.message || error.message || "Request failed.";
}

function toDateTimePayload(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export default function CreateExamPage() {
  const router = useRouter();
  const [form, setForm] = useState(INITIAL_FORM);
  const [classes, setClasses] = useState([]);
  const [questionBanks, setQuestionBanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submittingAction, setSubmittingAction] = useState(null);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const selectedBank = useMemo(
    () => questionBanks.find((bank) => bank.question_bank_id === form.question_bank_id),
    [form.question_bank_id, questionBanks]
  );
  const availableQuestions = getQuestionCount(selectedBank);

  const loadFormOptions = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [classRows, bankResult] = await Promise.all([
        classesService.listMine(),
        questionBanksService.listMine({ limit: 100, sortBy: "updated_at", sortOrder: "desc" }),
      ]);

      const activeClasses = (classRows ?? []).filter((item) => item.status === "active");
      const availableBanks = (bankResult?.items ?? []).filter((bank) => bank.status !== "archived");
      const firstUsableBank = availableBanks.find((bank) => getQuestionCount(bank) > 0);

      setClasses(activeClasses);
      setQuestionBanks(availableBanks);
      setForm((current) => ({
        ...current,
        class_id: current.class_id || activeClasses[0]?.class_id || "",
        question_bank_id: current.question_bank_id || firstUsableBank?.question_bank_id || availableBanks[0]?.question_bank_id || "",
      }));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadFormOptions();
  }, [loadFormOptions]);

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: undefined }));
  }

  function handleInputChange(event) {
    updateField(event.target.name, event.target.value);
  }

  function validate(nextStatus) {
    const errors = {};
    const questionCount = Number(form.question_count);
    const durationMinutes = Number(form.duration_minutes);
    const attemptLimit = Number(form.attempt_limit);
    const startTime = form.start_at ? new Date(form.start_at).getTime() : null;
    const endTime = form.end_at ? new Date(form.end_at).getTime() : null;

    if (!form.title.trim()) errors.title = "Exam title is required.";
    if (!form.class_id) errors.class_id = "Please select an active class.";
    if (!form.question_bank_id) errors.question_bank_id = "Please select a question bank.";
    if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
      errors.duration_minutes = "Duration must be a positive whole number.";
    }
    if (!Number.isInteger(attemptLimit) || attemptLimit <= 0) {
      errors.attempt_limit = "Allowed attempts must be a positive whole number.";
    }
    if (!Number.isInteger(questionCount) || questionCount <= 0) {
      errors.question_count = "Question count must be a positive whole number.";
    } else if (questionCount > availableQuestions) {
      errors.question_count = `Only ${availableQuestions} questions are available in the selected bank.`;
    }
    if (availableQuestions <= 0) {
      errors.question_bank_id = "The selected question bank has no available questions.";
    }

    if (nextStatus === "published") {
      if (!form.start_at) errors.start_at = "Start time is required to publish.";
      if (!form.end_at) errors.end_at = "End time is required to publish.";
      if (startTime && startTime < Date.now()) errors.start_at = "Start time cannot be in the past.";
    }

    if ((form.start_at && !form.end_at) || (!form.start_at && form.end_at)) {
      errors.start_at = errors.start_at || "Start and end time must be provided together.";
      errors.end_at = errors.end_at || "Start and end time must be provided together.";
    }

    if (startTime && endTime && endTime <= startTime) {
      errors.end_at = "End time must be later than start time.";
    }

    return errors;
  }

  async function submitExam(nextStatus) {
    setError("");
    const errors = validate(nextStatus);
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      setError("Please fix the highlighted fields before creating the exam session.");
      return;
    }

    setSubmittingAction(nextStatus);

    try {
      const response = await examsService.create({
        title: form.title.trim(),
        description: form.description.trim() || null,
        class_id: form.class_id,
        question_bank_id: form.question_bank_id,
        status: nextStatus,
        start_at: toDateTimePayload(form.start_at),
        end_at: toDateTimePayload(form.end_at),
        duration_minutes: Number(form.duration_minutes),
        attempt_limit: Number(form.attempt_limit),
        question_count: Number(form.question_count),
        result_visibility: form.result_visibility,
        access_code: form.access_code.trim() || null,
        randomize_questions: form.randomize_questions,
        randomize_answers: form.randomize_answers,
      });

      const exam = response?.data ?? response;
      router.push(`/teacher/classes/${exam.class_id}`);
    } catch (err) {
      setError(getErrorMessage(err));
      setFieldErrors(err?.response?.data?.fields ?? {});
    } finally {
      setSubmittingAction(null);
    }
  }

  const isSubmitting = Boolean(submittingAction);

  return (
    <main className="min-h-screen bg-background px-4 py-6 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-normal text-foreground">Create Exam Session</h1>
            <p className="mt-2 text-sm text-muted-foreground">Create an official exam session for one of your active classes.</p>
          </div>

          <Button asChild variant="ghost">
            <Link href="/teacher/exams">
              <ArrowLeft className="size-4" />
              Back to exams
            </Link>
          </Button>
        </div>

        {loading ? (
          <StatePanel icon={<Loader2 className="size-5 animate-spin" />} title="Loading exam form" description="Fetching your classes and question banks." />
        ) : (
          <form className="space-y-5" onSubmit={(event) => event.preventDefault()}>
            <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
              <div className="grid gap-5 lg:grid-cols-2">
                <TextField error={fieldErrors.title} label="Exam Title" name="title" onChange={handleInputChange} placeholder="Biology 12A Midterm" value={form.title} />
                <SelectField error={fieldErrors.class_id} label="Class" name="class_id" onChange={handleInputChange} value={form.class_id}>
                  {classes.length === 0 ? <option value="">No active classes available</option> : null}
                  {classes.map((item) => (
                    <option key={item.class_id} value={item.class_id}>
                      {item.class_name}
                    </option>
                  ))}
                </SelectField>

                <SelectField error={fieldErrors.question_bank_id} label="Question Source" name="question_bank_id" onChange={handleInputChange} value={form.question_bank_id}>
                  {questionBanks.length === 0 ? <option value="">No question banks available</option> : null}
                  {questionBanks.map((bank) => {
                    const count = getQuestionCount(bank);
                    return (
                      <option disabled={count <= 0} key={bank.question_bank_id} value={bank.question_bank_id}>
                        {bank.title} ({count} questions)
                      </option>
                    );
                  })}
                </SelectField>
                <SelectField error={fieldErrors.status} label="Status" name="status" onChange={handleInputChange} value={form.status}>
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </SelectField>

                <TextField error={fieldErrors.start_at} label="Start Time" name="start_at" onChange={handleInputChange} type="datetime-local" value={form.start_at} />
                <TextField error={fieldErrors.end_at} label="End Time" name="end_at" onChange={handleInputChange} type="datetime-local" value={form.end_at} />
                <TextField error={fieldErrors.duration_minutes} label="Duration Minutes" min="1" name="duration_minutes" onChange={handleInputChange} type="number" value={form.duration_minutes} />
                <TextField error={fieldErrors.attempt_limit} label="Allowed Attempts" min="1" name="attempt_limit" onChange={handleInputChange} type="number" value={form.attempt_limit} />
                <TextField error={fieldErrors.question_count} label="Question Count" max={availableQuestions || undefined} min="1" name="question_count" onChange={handleInputChange} type="number" value={form.question_count} />
                <SelectField error={fieldErrors.result_visibility} label="Result Visibility" name="result_visibility" onChange={handleInputChange} value={form.result_visibility}>
                  {RESULT_VISIBILITY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </SelectField>
                <TextField error={fieldErrors.access_code} label="Exam Access Code" name="access_code" onChange={handleInputChange} placeholder="Auto-generated if blank" value={form.access_code} />
                <TextAreaField error={fieldErrors.description} label="Description" name="description" onChange={handleInputChange} placeholder="Optional notes for this exam session" value={form.description} />
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
                <div className="grid gap-3 sm:grid-cols-2">
                  <CheckboxField checked={form.randomize_questions} label="Randomize Questions" onCheckedChange={(checked) => updateField("randomize_questions", Boolean(checked))} />
                  <CheckboxField checked={form.randomize_answers} label="Randomize Answers" onCheckedChange={(checked) => updateField("randomize_answers", Boolean(checked))} />
                </div>
              </div>

              <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <CalendarClock className="size-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">Available Questions</p>
                    <p className="mt-1 text-2xl font-bold text-foreground">{availableQuestions}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Selected source: {selectedBank?.title || "None"}</p>
                  </div>
                </div>
              </div>
            </div>

            {error ? (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}

            <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
              <Button disabled={isSubmitting} onClick={() => submitExam("draft")} type="button" variant="outline">
                {submittingAction === "draft" ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                Save as Draft
              </Button>
              <Button disabled={isSubmitting} onClick={() => submitExam(form.status)} type="button">
                {submittingAction && submittingAction !== "draft" ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                Create Exam Session
              </Button>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}

function FieldMessage({ error }) {
  if (!error) return null;
  return <p className="text-xs font-medium text-destructive">{error}</p>;
}

function TextField({ error, label, ...props }) {
  return (
    <label className="space-y-1.5">
      <span className="text-sm font-semibold text-foreground">{label}</span>
      <Input aria-invalid={Boolean(error)} {...props} />
      <FieldMessage error={error} />
    </label>
  );
}

function TextAreaField({ error, label, ...props }) {
  return (
    <label className="space-y-1.5 lg:col-span-2">
      <span className="text-sm font-semibold text-foreground">{label}</span>
      <textarea
        aria-invalid={Boolean(error)}
        className="min-h-24 w-full resize-y rounded-2xl border border-transparent bg-input/50 px-3 py-2 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20"
        {...props}
      />
      <FieldMessage error={error} />
    </label>
  );
}

function SelectField({ children, error, label, ...props }) {
  return (
    <label className="space-y-1.5">
      <span className="text-sm font-semibold text-foreground">{label}</span>
      <select
        aria-invalid={Boolean(error)}
        className="h-8 w-full rounded-2xl border border-transparent bg-input/50 px-2.5 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20"
        {...props}
      >
        {children}
      </select>
      <FieldMessage error={error} />
    </label>
  );
}

function CheckboxField({ checked, label, onCheckedChange }) {
  return (
    <label className="flex min-h-11 items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-foreground">
      <Checkbox checked={checked} onCheckedChange={onCheckedChange} />
      <span>{label}</span>
    </label>
  );
}

function StatePanel({ description, icon, title }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center">
      <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">{icon}</div>
      <h2 className="text-base font-bold text-foreground">{title}</h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
