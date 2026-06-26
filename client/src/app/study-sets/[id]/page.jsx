"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  BookOpen, 
  Layers, 
  User, 
  ChevronRight, 
  HelpCircle,
  FileQuestion,
  GraduationCap,
  Star,
  CheckCircle,
  Lock
} from "lucide-react";
import { studySetsService } from "@/services/study-sets.service";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/navbar";
import { useAuth } from "@/hooks/use-auth";
import ConfirmModal from "@/components/common/ConfirmModal";

export default function PublicStudySetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id;

  const { isAuthenticated, loading: authLoading, role } = useAuth();
  const [studySet, setStudySet] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Redirect authenticated learners to their layout page
  useEffect(() => {
    if (!authLoading && isAuthenticated && role === "learner") {
      router.replace(`/learner/study-sets/${id}`);
    }
  }, [authLoading, isAuthenticated, role, id, router]);

  useEffect(() => {
    if (!id || authLoading) return;

    // Only load public details if user is not redirected
    if (isAuthenticated && role === "learner") return;

    async function loadDetails() {
      setLoading(true);
      try {
        const res = await studySetsService.getOne(id);
        setStudySet(res.data || null);
        setQuestions(res.data?.questions || []);
        setError(null);
      } catch (err) {
        console.error("Failed to load study set details:", err);
        setError(err);
      } finally {
        setLoading(false);
      }
    }

    loadDetails();
  }, [id, authLoading, isAuthenticated, role]);

  if (authLoading || (isAuthenticated && role === "learner")) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-3 text-foreground">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-muted-foreground font-medium">Verifying session...</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-3 text-foreground">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-muted-foreground font-medium">Loading study set...</p>
      </div>
    );
  }

  if (error || !studySet) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center space-y-4 text-foreground">
        <HelpCircle className="size-12 text-destructive" />
        <h2 className="text-xl font-bold">Study Set Not Found</h2>
        <p className="text-sm text-muted-foreground max-w-sm">We couldn't retrieve this study set. It may have been deleted, set to private, or you don't have access.</p>
        <Button onClick={() => router.push("/")}>Back to Homepage</Button>
      </div>
    );
  }

  const creatorName = studySet.teacher?.full_name || "Teacher";
  const formattedDate = new Date(studySet.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <Navbar />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <main className="min-h-full bg-background text-foreground px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl space-y-8">
            
            {/* Header section */}
            <div className="space-y-4">
              <Button 
                onClick={() => router.push("/")} 
                variant="ghost" 
                className="text-muted-foreground hover:text-foreground hover:bg-muted gap-2 pl-2"
              >
                <ArrowLeft className="size-4" />
                <span>Back to Homepage</span>
              </Button>

              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-xs font-bold bg-primary/10 text-primary px-2.5 py-0.5 rounded-full capitalize">
                      {studySet.visibility?.replace("_", " ")}
                    </span>
                    {studySet.topic && (
                      <span className="text-xs font-bold bg-muted text-muted-foreground px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-border">
                        <Layers size={10} />
                        {studySet.topic}
                      </span>
                    )}
                  </div>
                  <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                    {studySet.title}
                  </h1>
                  <p className="text-muted-foreground text-sm leading-relaxed max-w-2xl">
                    {studySet.description || "No description provided."}
                  </p>
                </div>

                {/* Creator details */}
                <div className="flex items-center gap-3 bg-card border border-border p-3 rounded-2xl shrink-0 shadow-sm">
                  <div className="size-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center font-bold">
                    <User size={18} />
                  </div>
                  <div className="text-xs">
                    <p className="text-muted-foreground">Created by</p>
                    <p className="font-bold text-foreground">{creatorName}</p>
                    <p className="text-[10px] text-muted-foreground">{formattedDate}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* STUDY MODE SELECTORS */}
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-1.5">
                <span>Select Study Mode</span>
              </h2>
              
              <div className="grid gap-4 sm:grid-cols-2">
                
                {/* Flashcard Practice Mode Card */}
                <div 
                  onClick={() => router.push(`/study-sets/${id}/flashcards`)}
                  className="group relative overflow-hidden rounded-3xl border border-border bg-card p-6 hover:border-primary/50 transition-all duration-300 cursor-pointer shadow-sm hover:shadow-md"
                >
                  <div className="absolute top-0 right-0 size-28 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-all duration-300"></div>
                  
                  <div className="space-y-4">
                    <div className="size-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                      <BookOpen className="size-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-1">
                        <span>Flashcards</span>
                        <ChevronRight className="size-4 group-hover:translate-x-1 transition-transform" />
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                        Rotate cards to check terms, mark difficult cards, and review key definitions at your own pace.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quiz Practice Mode Card (Locked for guests) */}
                <div 
                  onClick={() => setShowLoginModal(true)}
                  className="group relative overflow-hidden rounded-3xl border border-border/80 bg-neutral-50/50 dark:bg-neutral-900/20 p-6 hover:border-emerald-500/50 transition-all duration-300 cursor-pointer shadow-sm hover:shadow-md"
                >
                  <div className="absolute top-0 right-0 size-28 bg-emerald-50/40 rounded-full blur-2xl group-hover:bg-emerald-100/10 transition-all duration-300"></div>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="size-12 rounded-2xl bg-emerald-50/50 text-emerald-600 flex items-center justify-center border border-emerald-100/50">
                        <FileQuestion className="size-6" />
                      </div>
                      <span className="text-[10px] font-bold bg-emerald-100/80 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-200/50 shadow-sm">
                        <Lock size={10} />
                        <span>Login Required</span>
                      </span>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-foreground group-hover:text-emerald-600 transition-colors flex items-center gap-1">
                        <span>Practice Quiz</span>
                        <ChevronRight className="size-4 group-hover:translate-x-1 transition-transform" />
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                        Challenge yourself with multiple-choice questions under test conditions and calculate your mastery score.
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* QUESTION PREVIEW LIST */}
            <div className="space-y-6 pt-6 border-t border-border">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-foreground">
                  Study Set Cards ({questions.length})
                </h2>
              </div>

              <div className="space-y-8">
                <div className="space-y-3">
                  {questions.length > 0 ? (
                    <div className="space-y-3">
                      {questions.map((q, idx) => {
                        return (
                          <div 
                            key={q.question_id}
                            className="relative rounded-2xl border border-border bg-card p-6 shadow-sm hover:shadow-md transition-all duration-200"
                          >
                            {/* Top-Right Control Buttons (Star & CheckCircle - Restricted for Guest) */}
                            <div className="absolute top-4 right-4 flex items-center gap-1 z-10" onClick={(e) => e.stopPropagation()}>
                              <button 
                                onClick={() => setShowLoginModal(true)}
                                className="p-1.5 hover:bg-neutral-100 rounded-full transition-colors"
                                title="Mark as Difficult (Login required)"
                              >
                                <Star className="size-5 text-neutral-300 hover:text-amber-400" />
                              </button>
                              <button 
                                onClick={() => setShowLoginModal(true)}
                                className="p-1.5 hover:bg-neutral-100 rounded-full transition-colors"
                                title="Mark as Mastered (Login required)"
                              >
                                <CheckCircle className="size-5 text-neutral-300 hover:text-emerald-500" />
                              </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                              {/* Left Column: Question & Options */}
                              <div className="space-y-3 pr-4">
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                  Question {idx + 1}
                                </p>
                                <p className="text-lg font-bold text-foreground leading-relaxed">
                                  {q.question_text}
                                </p>
                                {/* Render Options */}
                                <div className="space-y-1.5 pl-1">
                                  {(q.answer_options || []).map((opt, oIdx) => (
                                    <p key={oIdx} className="text-sm text-foreground/80 leading-relaxed">
                                      {String.fromCharCode(97 + oIdx)}. {opt.option_text}
                                    </p>
                                  ))}
                                </div>
                              </div>

                              {/* Right Column: Correct Answer & Explanation */}
                              <div className="border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-6 space-y-3 flex flex-col justify-center">
                                <div>
                                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                                    Correct Answer
                                  </span>
                                  {(q.answer_options || []).filter(opt => opt.is_correct).map((opt, oIdx) => (
                                    <p key={oIdx} className="text-base font-bold text-emerald-600 leading-relaxed bg-emerald-50/40 border border-emerald-100/50 px-2.5 py-1 rounded-lg inline-block">
                                      {opt.option_text}
                                    </p>
                                  ))}
                                </div>
                                {q.explanation && (
                                  <div className="border-t border-dashed border-border/60 pt-2">
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                                      Explanation
                                    </span>
                                    <p className="text-sm text-muted-foreground italic leading-relaxed">
                                      {q.explanation}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic pl-1">No cards in this section.</p>
                  )}
                </div>
              </div>
            </div>

          </div>
        </main>
      </div>

      {/* Login Requirement Confirmation Modal */}
      <ConfirmModal
        isOpen={showLoginModal}
        title="Authentication Required"
        message="You must log in to access this feature. Please log in or register to track your learning progress."
        confirmLabel="Log In"
        cancelLabel="Cancel"
        onConfirm={() => {
          setShowLoginModal(false);
          const nextUrl = encodeURIComponent(`/study-sets/${id}`);
          router.push(`/login?next=${nextUrl}`);
        }}
        onCancel={() => setShowLoginModal(false)}
        variant="info"
      />
    </div>
  );
}
