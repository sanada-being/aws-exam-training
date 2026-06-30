import type { Question } from "../types";
import type { QuizMode } from "../domain/selection";
import { modeCount } from "../domain/selection";
import { summarize } from "../domain/dataset";
import { useStore } from "../store/useStore";

export function Home({
  questions,
  onStart,
}: {
  questions: Question[];
  onStart: (mode: QuizMode) => void;
}) {
  const records = useStore((s) => s.records);
  const s = summarize(questions);
  const wrong = modeCount(questions, "wrong", records);
  const unanswered = modeCount(questions, "unanswered", records);

  return (
    <div className="home">
      <h1>AWS SAA 問題集</h1>
      <p className="muted">
        全 <strong>{s.total}</strong> 問・Topic {Object.keys(s.byTopic).length}
      </p>

      <div className="actions">
        <button type="button" className="btn primary big" onClick={() => onStart("sequential")}>
          順番に学習
        </button>
        <button type="button" className="btn big" onClick={() => onStart("random")}>
          ランダム出題
        </button>
        <button
          type="button"
          className="btn big"
          onClick={() => onStart("wrong")}
          disabled={wrong === 0}
        >
          苦手を復習 <span className="badge">{wrong}</span>
        </button>
        <button
          type="button"
          className="btn big"
          onClick={() => onStart("unanswered")}
          disabled={unanswered === 0}
        >
          未回答のみ <span className="badge">{unanswered}</span>
        </button>
      </div>
    </div>
  );
}
