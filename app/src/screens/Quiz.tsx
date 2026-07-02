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
  const [items, setItems] = useState<Question[]>(queue);
  const [idx, setIdx] = useState(initialIndex);
  const [correctCount, setCorrectCount] = useState(initialCorrect);
  const [wrongIds, setWrongIds] = useState<string[]>([]);
  // 直後の誤答復習中は苦手状態を維持したいので、グローバル記録を更新しない
  const [reviewMode, setReviewMode] = useState(false);

  const recordAnswer = useStore((s) => s.recordAnswer);
  const setSessionIndex = useStore((s) => s.setSessionIndex);
  const bumpSessionCorrect = useStore((s) => s.bumpSessionCorrect);
  const endSession = useStore((s) => s.endSession);
  const startSession = useStore((s) => s.startSession);
  const bookmarks = useStore((s) => s.bookmarks);
  const toggleBookmark = useStore((s) => s.toggleBookmark);

  const q = items[idx];

  // 間違えた問題だけで再スタート
  function reviewWrong() {
    const wrongItems = items.filter((it) => wrongIds.includes(it.id));
    if (wrongItems.length === 0) return;
    setItems(wrongItems);
    setIdx(0);
    setCorrectCount(0);
    setWrongIds([]);
    setReviewMode(true);
    startSession(wrongItems.map((x) => x.id));
  }

  if (!q) {
    const total = items.length;
    const wrongCount = wrongIds.length;
    return (
      <div className="done">
        <h2>お疲れさまでした！</h2>
        <p>
          {total} 問中 <strong>{correctCount}</strong> 問正解（
          {total ? Math.round((correctCount / total) * 100) : 0}%）
        </p>
        {wrongCount > 0 ? (
          <p className="muted">間違い {wrongCount} 問</p>
        ) : (
          <p className="muted">全問正解！🎉</p>
        )}
        <div className="doneactions">
          {wrongCount > 0 && (
            <button type="button" className="btn primary" onClick={reviewWrong}>
              間違えた問題を復習（{wrongCount}問）
            </button>
          )}
          <button
            type="button"
            className={wrongCount > 0 ? "btn" : "btn primary"}
            onClick={() => {
              endSession();
              onExit();
            }}
          >
            ホームへ戻る
          </button>
        </div>
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
          {idx + 1} / {items.length}
        </span>
        <span className="qno">Q{q.questionNumber}</span>
      </header>
      <div className="progressbar" aria-hidden>
        <div style={{ width: `${((idx + 1) / items.length) * 100}%` }} />
      </div>
      <QuestionView
        question={q}
        bookmarked={!!bookmarks[q.id]}
        onToggleBookmark={() => toggleBookmark(q.id)}
        onResult={(c) => {
          // 復習モード中は苦手状態を維持するため記録を更新しない
          if (!reviewMode) recordAnswer(q.id, c);
          if (c) {
            setCorrectCount((n) => n + 1);
            bumpSessionCorrect();
          } else {
            setWrongIds((w) => (w.includes(q.id) ? w : [...w, q.id]));
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
