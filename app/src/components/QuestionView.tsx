import { useEffect, useMemo, useState } from "react";
import type { Question } from "../types";
import { gradeAnswer, normalizeKeys, requiredCount } from "../domain/grading";

export interface QuestionViewProps {
  question: Question;
  /** 採点時に呼ばれる（正誤と選択キーを通知）。 */
  onResult: (correct: boolean, selected: string[]) => void;
  /** 「次へ」押下。 */
  onNext: () => void;
  /** 解説スロット（#6で投票分布などを差し込む）。 */
  renderExplanation?: (correct: boolean) => React.ReactNode;
  /** ブックマーク状態とトグル（任意）。 */
  bookmarked?: boolean;
  onToggleBookmark?: () => void;
  /** 回答済みの問題に戻ったときの初回選択（読み取り専用表示用）。 */
  initialSelected?: string[];
  /** 回答済みとして採点表示から開始する（前へ戻った場合）。 */
  initialGraded?: boolean;
}

export function QuestionView({
  question,
  onResult,
  onNext,
  renderExplanation,
  bookmarked,
  onToggleBookmark,
  initialSelected,
  initialGraded,
}: QuestionViewProps) {
  const [selected, setSelected] = useState<string[]>(initialSelected ?? []);
  const [graded, setGraded] = useState(!!initialGraded);
  const [showEn, setShowEn] = useState(false);
  const adopted = useMemo(() => normalizeKeys(question.adoptedAnswer), [question]);
  const multi = question.isMultipleAnswer || adopted.length > 1;
  const need = requiredCount(question.adoptedAnswer);

  // 問題が変わったら、その問題の初回回答状態（あれば）に合わせてリセット
  useEffect(() => {
    setSelected(initialSelected ?? []);
    setGraded(!!initialGraded);
    setShowEn(false);
    // 初回状態は question.id に紐づく。id変化時のみリセットする。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.id]);

  const correct = graded ? gradeAnswer(selected, adopted) : null;

  function toggle(key: string) {
    if (graded) return;
    setSelected((s) =>
      multi ? (s.includes(key) ? s.filter((x) => x !== key) : [...s, key]) : [key],
    );
  }

  function grade() {
    if (graded || selected.length === 0) return;
    const c = gradeAnswer(selected, adopted);
    setGraded(true);
    onResult(c, selected);
  }

  function optionClass(key: string): string {
    const isSel = selected.includes(key);
    if (!graded) return isSel ? "option selected" : "option";
    if (adopted.includes(key)) return "option correct";
    if (isSel) return "option wrong";
    return "option";
  }

  return (
    <div className="qview">
      <div className="qhead">
        {multi && <span className="hint">（{need}つ選択）</span>}
        <button
          type="button"
          className="btn ghost small lang"
          onClick={() => setShowEn((v) => !v)}
        >
          {showEn ? "日本語" : "原文(EN)"}
        </button>
        {onToggleBookmark && (
          <button
            type="button"
            className={`bookmark-btn${bookmarked ? " on" : ""}`}
            aria-pressed={!!bookmarked}
            aria-label="ブックマーク"
            onClick={onToggleBookmark}
          >
            {bookmarked ? "★" : "☆"}
          </button>
        )}
      </div>
      <p className="qtext">
        {showEn ? question.question.en : (question.question.ja ?? question.question.en)}
      </p>

      <div role="list">
        {question.options.map((o) => (
          <button
            key={o.key}
            type="button"
            role="listitem"
            className={optionClass(o.key)}
            aria-pressed={selected.includes(o.key)}
            onClick={() => toggle(o.key)}
            disabled={graded}
          >
            <span className="optkey">{o.key}</span>
            <span className="opttext">{showEn ? o.en : (o.ja ?? o.en)}</span>
          </button>
        ))}
      </div>

      {!graded ? (
        <button
          type="button"
          className="btn primary"
          onClick={grade}
          disabled={selected.length === 0}
        >
          採点する
        </button>
      ) : (
        <div className="result">
          <p className={correct ? "verdict ok" : "verdict ng"} data-testid="verdict">
            {correct ? "正解！" : "不正解"} ・ 正解: {adopted.join(", ")}
          </p>
          {initialGraded && (
            <p className="muted answered-note">
              回答済みの問題です。集計・苦手・振り返りには初回の回答が使われます。
            </p>
          )}
          {renderExplanation?.(!!correct)}
          {onToggleBookmark && (
            <button
              type="button"
              className={`btn bookmark-wide${bookmarked ? " on" : ""}`}
              aria-pressed={!!bookmarked}
              onClick={onToggleBookmark}
            >
              {bookmarked ? "★ ブックマーク中（タップで解除）" : "☆ この問題をブックマーク"}
            </button>
          )}
          <button type="button" className="btn primary" onClick={onNext}>
            次へ →
          </button>
        </div>
      )}
    </div>
  );
}
