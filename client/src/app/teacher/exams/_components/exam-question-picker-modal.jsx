"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, ChevronDown, ChevronRight, Loader2, Shuffle, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { questionBanksService } from "@/services/question-banks.service";

function shuffleItems(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function groupByChapter(questions) {
  return questions.reduce((groups, question) => {
    const chapter = question.chapter?.trim() || "No Chapter";
    if (!groups[chapter]) groups[chapter] = [];
    groups[chapter].push(question);
    return groups;
  }, {});
}

function selectedQuestionsFromIds(questions, ids) {
  const selected = new Set(ids);
  return questions.filter((question) => selected.has(question.question_id));
}

export function ExamQuestionPickerModal({
  isOpen,
  mode = "manual",
  questionBankId,
  randomCount = 0,
  initialSelectedIds = [],
  onCancel,
  onConfirm,
}) {
  const [questions, setQuestions] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [expandedChapters, setExpandedChapters] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const groupedQuestions = useMemo(() => groupByChapter(questions), [questions]);
  const allSelected = questions.length > 0 && questions.every((question) => selectedIds.has(question.question_id));
  const partiallySelected = questions.some((question) => selectedIds.has(question.question_id)) && !allSelected;

  useEffect(() => {
    if (!isOpen || !questionBankId) return;

    let ignore = false;

    async function loadQuestions() {
      setLoading(true);
      setError("");

      try {
        const rows = await questionBanksService.listReadyQuestions(questionBankId);
        if (ignore) return;

        const nextQuestions = rows ?? [];
        const nextSelected = mode === "random" && Number(randomCount) > 0
          ? shuffleItems(nextQuestions).slice(0, Number(randomCount)).map((question) => question.question_id)
          : initialSelectedIds;

        setQuestions(nextQuestions);
        setSelectedIds(new Set(nextSelected));
        setExpandedChapters(
          Object.keys(groupByChapter(nextQuestions)).reduce((expanded, chapter) => {
            expanded[chapter] = true;
            return expanded;
          }, {})
        );
      } catch (loadError) {
        if (!ignore) setError(loadError?.message || "Failed to load questions.");
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadQuestions();

    return () => {
      ignore = true;
    };
  }, [initialSelectedIds, isOpen, mode, questionBankId, randomCount]);

  if (!isOpen) return null;

  function toggleQuestion(questionId) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  }

  function toggleChapter(chapter, checked) {
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const question of groupedQuestions[chapter] ?? []) {
        if (checked) next.add(question.question_id);
        else next.delete(question.question_id);
      }
      return next;
    });
  }

  function toggleAll(checked) {
    setSelectedIds(checked ? new Set(questions.map((question) => question.question_id)) : new Set());
  }

  function randomizeSelection() {
    const count = Math.min(Math.max(Number(randomCount) || 0, 0), questions.length);
    setSelectedIds(new Set(shuffleItems(questions).slice(0, count).map((question) => question.question_id)));
  }

  function confirmSelection() {
    const ids = [...selectedIds];
    onConfirm({
      questionIds: ids,
      questions: selectedQuestionsFromIds(questions, ids),
    });
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral/60 px-4 py-6 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">Choose Exam Questions</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Select questions from the chosen question bank.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
          <label className="flex items-center gap-3 text-sm font-semibold text-foreground">
            <input
              type="checkbox"
              className="size-4 rounded border-input"
              checked={allSelected}
              ref={(element) => {
                if (element) element.indeterminate = partiallySelected;
              }}
              onChange={(event) => toggleAll(event.target.checked)}
            />
            Select all
          </label>
          <div className="flex items-center gap-3">
            {mode === "random" ? (
              <Button disabled={loading || questions.length === 0} onClick={randomizeSelection} type="button" variant="outline" size="sm">
                <Shuffle className="size-4" />
                Randomize again
              </Button>
            ) : null}
            <span className="text-sm font-semibold text-muted-foreground">
              Selected: <span className="text-foreground">{selectedIds.size}</span> questions
            </span>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading questions...
            </div>
          ) : error ? (
            <p className="py-16 text-center text-sm text-error">{error}</p>
          ) : questions.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">This question bank has no available questions.</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(groupedQuestions).map(([chapter, chapterQuestions]) => {
                const chapterChecked = chapterQuestions.every((question) => selectedIds.has(question.question_id));
                const chapterPartial = chapterQuestions.some((question) => selectedIds.has(question.question_id)) && !chapterChecked;

                return (
                  <div key={chapter} className="space-y-1">
                    <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/60">
                      <button
                        type="button"
                        onClick={() => setExpandedChapters((current) => ({ ...current, [chapter]: !current[chapter] }))}
                        className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                      >
                        {expandedChapters[chapter] ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                      </button>
                      <input
                        type="checkbox"
                        className="size-4 rounded border-input"
                        checked={chapterChecked}
                        ref={(element) => {
                          if (element) element.indeterminate = chapterPartial;
                        }}
                        onChange={(event) => toggleChapter(chapter, event.target.checked)}
                      />
                      <BookOpen className="size-4 text-info" />
                      <span className="text-sm font-bold text-foreground">Chapter: {chapter}</span>
                      <span className="text-xs text-muted-foreground">({chapterQuestions.length} Qs)</span>
                    </div>

                    {expandedChapters[chapter] ? (
                      <div className="ml-4 space-y-1.5 border-l border-border/70 py-1 pl-6">
                        {chapterQuestions.map((question) => (
                          <label
                            key={question.question_id}
                            className="flex cursor-pointer items-start gap-3 rounded-lg p-2 hover:bg-muted/70"
                          >
                            <input
                              type="checkbox"
                              className="mt-0.5 size-4 rounded border-input"
                              checked={selectedIds.has(question.question_id)}
                              onChange={() => toggleQuestion(question.question_id)}
                            />
                            <span className="text-sm leading-relaxed text-foreground">{question.question_text}</span>
                          </label>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Question count will be saved as <span className="font-semibold text-foreground">{selectedIds.size}</span>.
          </p>
          <div className="flex justify-end gap-2">
            <Button onClick={onCancel} type="button" variant="outline">
              Cancel
            </Button>
            <Button disabled={selectedIds.size === 0 || loading} onClick={confirmSelection} type="button">
              OK
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
