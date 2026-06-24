"use client";

import React from "react";
import { Star, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function FlashcardControls({ 
  questionId, 
  isDifficult, 
  isMastered, 
  onToggleDifficult, 
  onMarkMastered 
}) {
  return (
    <div className="mt-8 flex gap-3 max-w-md w-full justify-center">
      {/* Nút Mark Difficult */}
      <Button
        onClick={(e) => {
          e.stopPropagation();
          onToggleDifficult(questionId);
        }}
        variant="outline"
        className={`flex-1 h-11 gap-2 rounded-2xl border-border text-xs font-bold transition-all duration-205 ${
          isDifficult
            ? "bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100/80"
            : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
      >
        <Star className={`size-4 ${isDifficult ? "fill-amber-400 text-amber-500" : ""}`} />
        {isDifficult ? "Difficult" : "Mark Difficult"}
      </Button>

      {/* Nút Mark Mastered */}
      <Button
        onClick={(e) => {
          e.stopPropagation();
          onMarkMastered(questionId);
        }}
        variant="outline"
        className={`flex-1 h-11 gap-2 rounded-2xl border-border text-xs font-bold transition-all duration-205 ${
          isMastered
            ? "bg-emerald-50 text-emerald-700 border-emerald-250 hover:bg-emerald-100/80"
            : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
      >
        <CheckCircle className={`size-4 ${isMastered ? "fill-emerald-500 text-emerald-600" : ""}`} />
        {isMastered ? "Mastered!" : "Mark Mastered"}
      </Button>
    </div>
  );
}
