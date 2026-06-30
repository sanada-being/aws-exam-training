import { useEffect, useMemo, useState } from "react";
import type { Question } from "../types";
import { gradeAnswer, normalizeKeys, requiredCount } from "../domain/grading";

export interface QuestionViewProps {
  question: Question;
  /** 採点時に呼ばれる（正誤を通知）。 */
  onResult: (correct: boolean) => void;
  /** 「次へ」押下。 */
  onNext: () => void;
  /** 解説スロット（#6で投票分布などを差し込む）。 */
  renderExplanation?: (correct: boolean) => React.ReactNode;
}

export function QuestionView({ question, onResult, onNext, renderExplanation }: QuestionViewProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [graded, setGraded] = useState(false);
  const [showEn, setShowEn] = useState(false);
  const adopted = useMemo(() => normalizeKeys(question.adoptedAnswer), [question]);
  const multi = question.isMultipleAnswer || adopted.length > 1;
  const need = requiredCount(question.adoptedAnswer);

  // 問題が変わったらリセット
  useEffect(() => {
    setSelected([]);
    setGraded(false);
    setShowEn(false);
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
    onResult(c);
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
          {renderExplanation?.(!!correct)}
          <button type="button" className="btn primary" onClick={onNext}>
            次へ →
          </button>
        </div>
      )}
    </div>
  );
}
