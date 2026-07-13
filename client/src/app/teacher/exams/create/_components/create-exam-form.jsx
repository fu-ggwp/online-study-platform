import { AlertCircle, CheckCircle2, Loader2, Save } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { CheckboxField, SelectField, SelectItem, TextAreaField, TextField } from "./create-exam-fields";
import { getQuestionCount, RESULT_VISIBILITY_OPTIONS, STATUS_OPTIONS } from "./create-exam-options";

export function CreateExamForm({
  availableQuestions,
  classes,
  error,
  fieldErrors,
  form,
  isSubmitting,
  onFieldChange,
  onInputChange,
  onSubmitExam,
  questionBanks,
  submittingAction,
}) {
  return (
    <form className="flex flex-col gap-5" onSubmit={(event) => event.preventDefault()}>
      <div className="flex flex-col gap-5">
        <Card className="border border-border shadow-sm">
          <CardHeader className="border-b bg-muted/30">
            <CardTitle className="text-lg font-semibold">Basic Info</CardTitle>
            <CardDescription>Name the exam and choose who receives it.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 lg:grid-cols-2">
            <TextField
              error={fieldErrors.title}
              label="Exam Title"
              name="title"
              onChange={onInputChange}
              placeholder="Biology 12A Midterm"
              value={form.title}
            />
            <SelectField
              error={fieldErrors.class_id}
              label="Class"
              name="class_id"
              onValueChange={onFieldChange}
              placeholder="Select class"
              value={form.class_id}
            >
              {classes.length === 0 ? <SelectItem disabled value="no-classes">No active classes available</SelectItem> : null}
              {classes.map((item) => (
                <SelectItem key={item.class_id} value={item.class_id}>
                  {item.class_name}
                </SelectItem>
              ))}
            </SelectField>

            <SelectField
              className="lg:col-span-2"
              error={fieldErrors.question_bank_id}
              label="Question Source"
              name="question_bank_id"
              onValueChange={onFieldChange}
              placeholder="Select question bank"
              value={form.question_bank_id}
            >
              {questionBanks.length === 0 ? <SelectItem disabled value="no-question-banks">No question banks available</SelectItem> : null}
              {questionBanks.map((bank) => {
                const count = getQuestionCount(bank);
                return (
                  <SelectItem disabled={count <= 0} key={bank.question_bank_id} value={bank.question_bank_id}>
                    {bank.title} ({count} questions)
                  </SelectItem>
                );
              })}
            </SelectField>
            <TextAreaField
              error={fieldErrors.description}
              label="Description"
              name="description"
              onChange={onInputChange}
              placeholder="Optional notes for this exam session"
              value={form.description}
            />
          </CardContent>
        </Card>

        <Card className="border border-border shadow-sm">
          <CardHeader className="border-b bg-muted/30">
            <CardTitle className="text-lg font-semibold">Timing & Status</CardTitle>
            <CardDescription>Draft exams can be scheduled later; active exams need a full window.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 lg:grid-cols-2">
            <SelectField error={fieldErrors.status} label="Status" name="status" onValueChange={onFieldChange} value={form.status}>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectField>
            <TextField
              error={fieldErrors.duration_minutes}
              label="Duration Minutes"
              min="1"
              name="duration_minutes"
              onChange={onInputChange}
              type="number"
              value={form.duration_minutes}
            />
            <TextField
              error={fieldErrors.start_at}
              label="Start Time"
              name="start_at"
              onChange={onInputChange}
              type="datetime-local"
              value={form.start_at}
            />
            <TextField
              error={fieldErrors.end_at}
              label="End Time"
              name="end_at"
              onChange={onInputChange}
              type="datetime-local"
              value={form.end_at}
            />
          </CardContent>
        </Card>

        <Card className="border border-border shadow-sm">
          <CardHeader className="border-b bg-muted/30">
            <CardTitle className="text-lg font-semibold">Rules</CardTitle>
            <CardDescription>Control attempts, result visibility, and how questions are delivered.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 lg:grid-cols-2">
            <TextField
              error={fieldErrors.question_count}
              label="Question Count"
              max={availableQuestions || undefined}
              min="1"
              name="question_count"
              onChange={onInputChange}
              type="number"
              value={form.question_count}
            />
            <TextField
              error={fieldErrors.attempt_limit}
              label="Allowed Attempts"
              min="1"
              name="attempt_limit"
              onChange={onInputChange}
              type="number"
              value={form.attempt_limit}
            />
            <SelectField
              error={fieldErrors.result_visibility}
              label="Result Visibility"
              name="result_visibility"
              onValueChange={onFieldChange}
              value={form.result_visibility}
            >
              {RESULT_VISIBILITY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectField>
            <TextField
              error={fieldErrors.access_code}
              label="Exam Access Code"
              name="access_code"
              onChange={onInputChange}
              placeholder="Auto-generated if blank"
              value={form.access_code}
            />
            <div className="grid gap-3 lg:col-span-2 sm:grid-cols-2">
              <CheckboxField
                checked={form.randomize_questions}
                label="Randomize Questions"
                onCheckedChange={(checked) => onFieldChange("randomize_questions", Boolean(checked))}
              />
              <CheckboxField
                checked={form.randomize_answers}
                label="Randomize Answers"
                onCheckedChange={(checked) => onFieldChange("randomize_answers", Boolean(checked))}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
        <Button disabled={isSubmitting} onClick={() => onSubmitExam("draft")} type="button" variant="outline">
          {submittingAction === "draft" ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <Save data-icon="inline-start" />}
          Save as Draft
        </Button>
        <Button disabled={isSubmitting} onClick={() => onSubmitExam(form.status)} type="button">
          {submittingAction && submittingAction !== "draft" ? (
            <Loader2 className="animate-spin" data-icon="inline-start" />
          ) : (
            <CheckCircle2 data-icon="inline-start" />
          )}
          Create Exam Session
        </Button>
      </div>
    </form>
  );
}
