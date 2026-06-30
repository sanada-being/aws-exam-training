import { useEffect, useState } from "react";
import type { Question } from "./types";
import { loadQuestions } from "./data/loader";
import { summarize } from "./domain/dataset";

/** データ概要の表示（純粋・テスト容易）。#5以降でホーム画面に発展させる。 */
export function Summary({ questions }: { questions: Question[] }) {
  const s = summarize(questions);
  return (
    <div>
      <h1>AWS SAA 問題集</h1>
      <p data-testid="total">
        全 <strong>{s.total}</strong> 問
      </p>
      <p className="muted" style={{ color: "var(--muted)" }}>
        確信度 high {s.byConfidence.high} / medium {s.byConfidence.medium} / low{" "}
        {s.byConfidence.low}・複数回答 {s.multipleAnswer} 問・Topic 数{" "}
        {Object.keys(s.byTopic).length}
      </p>
    </div>
  );
}

export default function App() {
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadQuestions()
      .then(setQuestions)
      .catch((e) => setError(String(e)));
  }, []);

  if (error) return <div className="center">読み込みエラー: {error}</div>;
  if (!questions) return <div className="center">読み込み中…</div>;
  return <Summary questions={questions} />;
}
