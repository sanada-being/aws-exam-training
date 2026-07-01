import type { Question, Confidence } from "../types";
import type { QuizMode } from "../domain/selection";
import { modeCount } from "../domain/selection";
import { computeStats } from "../domain/stats";
import { applyFilters, isFilterActive, emptyFilter, type Filter } from "../domain/filter";
import { useStore } from "../store/useStore";
import { SyncIndicator } from "../components/SyncIndicator";
import { Chip } from "../components/Chip";

const CONFS: { key: Confidence; label: string }[] = [
  { key: "high", label: "確信度:高" },
  { key: "medium", label: "中" },
  { key: "low", label: "低" },
];

// トグル型の絞り込み（真偽値フィルタ）
const TOGGLES: { key: "bookmarkedOnly" | "needsReviewOnly" | "excludeMastered"; label: string }[] =
  [
    { key: "bookmarkedOnly", label: "★のみ" },
    { key: "needsReviewOnly", label: "要確認のみ" },
    { key: "excludeMastered", label: "未正解のみ" },
  ];

const COUNTS: (number | null)[] = [10, 20, 30, 40, 50, null];

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
  count: number | null;
  onCountChange: (c: number | null) => void;
}) {
  const records = useStore((s) => s.records);
  const bookmarks = useStore((s) => s.bookmarks);
  const stats = computeStats(questions, records, bookmarks);

  const pool = applyFilters(questions, filter, bookmarks, records);
  const wrong = modeCount(pool, "wrong", records);
  const unanswered = modeCount(pool, "unanswered", records);
  const poolEmpty = pool.length === 0;

  const dashboard = [
    { testid: "answered", value: stats.answered, label: `/ ${stats.total} 解答` },
    { testid: "accuracy", value: `${stats.accuracy}%`, label: "正答率" },
    { value: stats.weak, label: "苦手" },
    { value: stats.bookmarks, label: "★" },
  ];

  const modes: { mode: QuizMode; label: string; badge?: number; disabled: boolean }[] = [
    { mode: "sequential", label: "順番に学習", disabled: poolEmpty },
    { mode: "random", label: "ランダム出題", disabled: poolEmpty },
    { mode: "wrong", label: "苦手を復習", badge: wrong, disabled: wrong === 0 },
    { mode: "unanswered", label: "未回答のみ", badge: unanswered, disabled: unanswered === 0 },
  ];

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
        <div className="topbar-right">
          <SyncIndicator />
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
      </div>

      <section className="dashboard" aria-label="学習状況">
        {dashboard.map((d, i) => (
          <div className="stat" key={i}>
            <span className="statnum" data-testid={d.testid}>
              {d.value}
            </span>
            <span className="statlabel">{d.label}</span>
          </div>
        ))}
      </section>
      <div className="progressbar home-progress" aria-hidden>
        <div style={{ width: `${stats.total ? (stats.answered / stats.total) * 100 : 0}%` }} />
      </div>

      <section className="filters" aria-label="絞り込み">
        <div className="chips">
          {CONFS.map((c) => (
            <Chip
              key={c.key}
              label={c.label}
              pressed={filter.confidences.includes(c.key)}
              onClick={() => toggleConf(c.key)}
            />
          ))}
          {TOGGLES.map((t) => (
            <Chip
              key={t.key}
              label={t.label}
              pressed={filter[t.key]}
              onClick={() => onFilterChange({ ...filter, [t.key]: !filter[t.key] })}
            />
          ))}
        </div>
        <div className="chips countchips">
          {COUNTS.map((c) => (
            <Chip
              key={c ?? "all"}
              label={c === null ? "全問" : `${c}問`}
              pressed={count === c}
              onClick={() => onCountChange(c)}
            />
          ))}
        </div>
        <p className="filterinfo">
          対象 <strong data-testid="pool">{pool.length}</strong> 問
          {count !== null && <span className="muted">（{Math.min(count, pool.length)}問出題）</span>}
          {isFilterActive(filter) && (
            <button
              type="button"
              className="btn ghost small"
              onClick={() => onFilterChange(emptyFilter)}
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
        {modes.map((m) => (
          <button
            key={m.mode}
            type="button"
            className="btn big"
            onClick={() => onStart(m.mode)}
            disabled={m.disabled}
          >
            {m.label}
            {m.badge !== undefined && <span className="badge">{m.badge}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
