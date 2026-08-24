import { useState } from "react";
import type { Question } from "../types";
import { QuestionView } from "../components/QuestionView";
import { Explanation } from "../components/Explanation";
import { useStore } from "../store/useStore";
import { isAnswered, type SessionAnswers } from "../domain/sessionAnswers";
import { sessionResult } from "../domain/session";

/** session が無いときの回答明細。毎レンダーで新しい object を作らないよう定数化。 */
const NO_ANSWERS: SessionAnswers = {};

export function Quiz({
  queue,
  onExit,
  initialIndex = 0,
}: {
  queue: Question[];
  onExit: () => void;
  initialIndex?: number;
}) {
  const [items, setItems] = useState<Question[]>(queue);
  const [idx, setIdx] = useState(initialIndex);

  const session = useStore((s) => s.session);
  // 回答明細と復習フラグは session（永続化）が唯一の持ち主。
  // ローカル state に持つと中断（アンマウント）で失われ、正答数だけが残って集計が壊れる。
  const answers = session?.answers ?? NO_ANSWERS;
  const reviewMode = session?.reviewMode ?? false;

  const recordAnswer = useStore((s) => s.recordAnswer);
  const recordSessionAnswer = useStore((s) => s.recordSessionAnswer);
  const setSessionIndex = useStore((s) => s.setSessionIndex);
  const endSession = useStore((s) => s.endSession);
  const startSession = useStore((s) => s.startSession);
  const bookmarks = useStore((s) => s.bookmarks);
  const toggleBookmark = useStore((s) => s.toggleBookmark);

  const q = items[idx];
  // 結果表示・振り返りは同じ集計結果を使う（分子・分母・誤答リストの食い違いを防ぐ）
  const result = sessionResult(
    session,
    items.map((it) => it.id),
  );

  // 間違えた問題だけで再スタート
  function reviewWrong() {
    const wrong = new Set(result.wrongIds);
    const wrongItems = items.filter((it) => wrong.has(it.id));
    if (wrongItems.length === 0) return;
    setItems(wrongItems);
    setIdx(0);
    // 復習は独立した新セッション。前ラウンドの正答数を持ち込まないので100%を超えない。
    startSession(
      wrongItems.map((x) => x.id),
      true,
    );
  }

  function goPrev() {
    if (idx === 0) return;
    const p = idx - 1;
    setIdx(p);
    setSessionIndex(p);
  }

  if (!q) {
    const wrongCount = result.wrongIds.length;
    return (
      <div className="done">
        <h2>お疲れさまでした！</h2>
        <p>
          {result.total} 問中 <strong>{result.correct}</strong> 問正解（{result.accuracy}%）
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

  const current = answers[q.id];

  return (
    <div>
      <header className="quizbar">
        <button type="button" className="btn ghost" onClick={onExit} aria-label="中断">
          中断
        </button>
        <button
          type="button"
          className="btn ghost"
          onClick={goPrev}
          disabled={idx === 0}
          aria-label="前の問題へ"
        >
          ← 前へ
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
        initialSelected={current?.selected}
        initialGraded={!!current}
        onResult={(c, selected) => {
          const first = !isAnswered(answers, q.id);
          recordSessionAnswer(q.id, c, selected);
          // 初回回答のみ苦手収集に反映する（復習ラウンド中は苦手状態を維持）
          if (first && !reviewMode) recordAnswer(q.id, c);
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
