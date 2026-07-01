import type { Question, Confidence } from "../types";
import type { QuizMode } from "../domain/selection";
import { modeCount } from "../domain/selection";
import { computeStats } from "../domain/stats";
import { applyFilters, isFilterActive, type Filter } from "../domain/filter";
import { useStore } from "../store/useStore";

const CONFS: { key: Confidence; label: string }[] = [
  { key: "high", label: "確信度:高" },
  { key: "medium", label: "中" },
  { key: "low", label: "低" },
];

export function Home({
  questions,
  onStart,
  onResume,
  resumeInfo,
  filter,
  onFilterChange,
  onOpenSettings,
  count,
  onCountChange,
}: {
  questions: Question[];
  onStart: (mode: QuizMode) => void;
  onResume?: () => void;
  resumeInfo?: { index: number; total: number };
  filter: Filter;
  onFilterChange: (f: Filter) => void;
  onOpenSettings?: () => void;
  count: number | null; // null = 全問
  onCountChange: (c: number | null) => void;
}) {
  const records = useStore((s) => s.records);
  const bookmarks = useStore((s) => s.bookmarks);
  const stats = computeStats(questions, records, bookmarks);

  const pool = applyFilters(questions, filter, bookmarks);
  const wrong = modeCount(pool, "wrong", records);
  const unanswered = modeCount(pool, "unanswered", records);
  const poolEmpty = pool.length === 0;

  const toggleConf = (c: Confidence) =>
    onFilterChange({
      ...filter,
      confidences: filter.confidences.includes(c)
        ? filter.confidences.filter((x) => x !== c)
        : [...filter.confidences, c],
    });

  return (
    <div className="home">
      <div className="topbar">
        <h1>AWS SAA 問題集</h1>
        {onOpenSettings && (
          <button
            type="button"
            className="btn ghost small"
            onClick={onOpenSettings}
            aria-label="設定・同期"
          >
            ⚙ 同期
          </button>
        )}
      </div>

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

      <section className="filters" aria-label="絞り込み">
        <div className="chips">
          {CONFS.map((c) => (
            <button
              key={c.key}
              type="button"
              className={`chip${filter.confidences.includes(c.key) ? " on" : ""}`}
              aria-pressed={filter.confidences.includes(c.key)}
              onClick={() => toggleConf(c.key)}
            >
              {c.label}
            </button>
          ))}
          <button
            type="button"
            className={`chip${filter.bookmarkedOnly ? " on" : ""}`}
            aria-pressed={filter.bookmarkedOnly}
            onClick={() => onFilterChange({ ...filter, bookmarkedOnly: !filter.bookmarkedOnly })}
          >
            ★のみ
          </button>
          <button
            type="button"
            className={`chip${filter.needsReviewOnly ? " on" : ""}`}
            aria-pressed={filter.needsReviewOnly}
            onClick={() => onFilterChange({ ...filter, needsReviewOnly: !filter.needsReviewOnly })}
          >
            要確認のみ
          </button>
        </div>
        <div className="chips countchips">
          {[10, 20, 30, 40, 50, null].map((c) => (
            <button
              key={c ?? "all"}
              type="button"
              className={`chip${count === c ? " on" : ""}`}
              aria-pressed={count === c}
              onClick={() => onCountChange(c)}
            >
              {c === null ? "全問" : `${c}問`}
            </button>
          ))}
        </div>
        <p className="filterinfo">
          対象 <strong data-testid="pool">{pool.length}</strong> 問
          {count !== null && <span className="muted">（{Math.min(count, pool.length)}問出題）</span>}
          {isFilterActive(filter) && (
            <button
              type="button"
              className="btn ghost small"
              onClick={() => onFilterChange({ confidences: [], needsReviewOnly: false, bookmarkedOnly: false })}
            >
              クリア
            </button>
          )}
        </p>
      </section>

      <div className="actions">
        {onResume && resumeInfo && (
          <button type="button" className="btn primary big" onClick={onResume}>
            続きから（{resumeInfo.index + 1} / {resumeInfo.total}）
          </button>
        )}
        <button
          type="button"
          className="btn big"
          onClick={() => onStart("sequential")}
          disabled={poolEmpty}
        >
          順番に学習
        </button>
        <button
          type="button"
          className="btn big"
          onClick={() => onStart("random")}
          disabled={poolEmpty}
        >
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
