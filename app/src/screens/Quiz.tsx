import { useState } from "react";
import type { Question } from "../types";
import { QuestionView } from "../components/QuestionView";
import { Explanation } from "../components/Explanation";
import { useStore } from "../store/useStore";

export function Quiz({ queue, onExit }: { queue: Question[]; onExit: () => void }) {
  const [idx, setIdx] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const recordAnswer = useStore((s) => s.recordAnswer);

  const q = queue[idx];

  if (!q) {
    return (
      <div className="done">
        <h2>お疲れさまでした！</h2>
        <p>
          {queue.length} 問中 <strong>{correctCount}</strong> 問正解（
          {queue.length ? Math.round((correctCount / queue.length) * 100) : 0}%）
        </p>
        <button type="button" className="btn primary" onClick={onExit}>
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
        onResult={(c) => {
          recordAnswer(q.id, c);
          if (c) setCorrectCount((n) => n + 1);
        }}
        onNext={() => setIdx((i) => i + 1)}
        renderExplanation={() => <Explanation question={q} />}
      />
    </div>
  );
}
