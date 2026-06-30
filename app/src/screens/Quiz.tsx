import { useState } from "react";
import type { Question } from "../types";
import { QuestionView } from "../components/QuestionView";
import { Explanation } from "../components/Explanation";
import { useStore } from "../store/useStore";

export function Quiz({
  queue,
  onExit,
  initialIndex = 0,
  initialCorrect = 0,
}: {
  queue: Question[];
  onExit: () => void;
  initialIndex?: number;
  initialCorrect?: number;
}) {
  const [idx, setIdx] = useState(initialIndex);
  const [correctCount, setCorrectCount] = useState(initialCorrect);
  const recordAnswer = useStore((s) => s.recordAnswer);
  const setSessionIndex = useStore((s) => s.setSessionIndex);
  const bumpSessionCorrect = useStore((s) => s.bumpSessionCorrect);
  const endSession = useStore((s) => s.endSession);
  const bookmarks = useStore((s) => s.bookmarks);
  const toggleBookmark = useStore((s) => s.toggleBookmark);

  const q = queue[idx];

  if (!q) {
    return (
      <div className="done">
        <h2>お疲れさまでした！</h2>
        <p>
          {queue.length} 問中 <strong>{correctCount}</strong> 問正解（
          {queue.length ? Math.round((correctCount / queue.length) * 100) : 0}%）
        </p>
        <button
          type="button"
          className="btn primary"
          onClick={() => {
            endSession();
            onExit();
          }}
        >
          ホームへ戻る
        </button>
      </div>
    );
  }

  return (
    <div>
      <header className="quizbar">
        <button type="button" className="btn ghost" onClick={onExit} aria-label="中断">
          ← 中断
        </button>
        <span className="progress" data-testid="progress">
          {idx + 1} / {queue.length}
        </span>
        <span className="qno">Q{q.questionNumber}</span>
      </header>
      <div className="progressbar" aria-hidden>
        <div style={{ width: `${((idx + 1) / queue.length) * 100}%` }} />
      </div>
      <QuestionView
        question={q}
        bookmarked={!!bookmarks[q.id]}
        onToggleBookmark={() => toggleBookmark(q.id)}
        onResult={(c) => {
          recordAnswer(q.id, c);
          if (c) {
            setCorrectCount((n) => n + 1);
            bumpSessionCorrect();
          }
        }}
        onNext={() => {
          const next = idx + 1;
          setIdx(next);
          setSessionIndex(next);
        }}
        renderExplanation={() => <Explanation question={q} />}
      />
    </div>
  );
}
