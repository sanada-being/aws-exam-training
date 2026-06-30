import type { Question } from "../types";
import type { QuizMode } from "../domain/selection";
import { modeCount } from "../domain/selection";
import { computeStats } from "../domain/stats";
import { useStore } from "../store/useStore";

export function Home({
  questions,
  onStart,
  onResume,
  resumeInfo,
}: {
  questions: Question[];
  onStart: (mode: QuizMode) => void;
  onResume?: () => void;
  resumeInfo?: { index: number; total: number };
}) {
  const records = useStore((s) => s.records);
  const bookmarks = useStore((s) => s.bookmarks);
  const stats = computeStats(questions, records, bookmarks);
  const wrong = modeCount(questions, "wrong", records);
  const unanswered = modeCount(questions, "unanswered", records);

  return (
    <div className="home">
      <h1>AWS SAA 問題集</h1>

      <section className="dashboard" aria-label="学習状況">
        <div className="stat">
          <span className="statnum" data-testid="answered">
            {stats.answered}
          </span>
          <span className="statlabel">/ {stats.total} 解答</span>
        </div>
        <div className="stat">
          <span className="statnum" data-testid="accuracy">
            {stats.accuracy}%
          </span>
          <span className="statlabel">正答率</span>
        </div>
        <div className="stat">
          <span className="statnum">{stats.weak}</span>
          <span className="statlabel">苦手</span>
        </div>
        <div className="stat">
          <span className="statnum">{stats.bookmarks}</span>
          <span className="statlabel">★</span>
        </div>
      </section>
      <div className="progressbar home-progress" aria-hidden>
        <div style={{ width: `${stats.total ? (stats.answered / stats.total) * 100 : 0}%` }} />
      </div>

      <div className="actions">
        {onResume && resumeInfo && (
          <button type="button" className="btn primary big" onClick={onResume}>
            続きから（{resumeInfo.index + 1} / {resumeInfo.total}）
          </button>
        )}
        <button type="button" className="btn big" onClick={() => onStart("sequential")}>
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
