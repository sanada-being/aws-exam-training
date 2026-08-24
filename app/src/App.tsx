import { useEffect, useMemo, useState } from "react";
import type { Question } from "./types";
import { loadQuestions } from "./data/loader";
import { buildQueue, type QuizMode } from "./domain/selection";
import { applyFilters, emptyFilter, type Filter } from "./domain/filter";
import { Home } from "./screens/Home";
import { Quiz } from "./screens/Quiz";
import { Settings } from "./screens/Settings";
import { useStore } from "./store/useStore";
import { resolveResume } from "./domain/session";
import { useAutoSync } from "./hooks/useAutoSync";

interface ActiveQueue {
  items: Question[];
  index: number;
}

export default function App() {
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [queue, setQueue] = useState<ActiveQueue | null>(null);
  const [filter, setFilter] = useState<Filter>(emptyFilter);
  const [showSettings, setShowSettings] = useState(false);
  const [count, setCount] = useState<number | null>(null);

  useAutoSync();

  const records = useStore((s) => s.records);
  const bookmarks = useStore((s) => s.bookmarks);
  const session = useStore((s) => s.session);
  const startSession = useStore((s) => s.startSession);

  const byId = useMemo(() => new Map((questions ?? []).map((q) => [q.id, q])), [questions]);
  // 中断していたセッションを現在の問題集に突き合わせて解決する（問題idベース）
  const resumable = resolveResume(session, byId);

  useEffect(() => {
    loadQuestions()
      .then(setQuestions)
      .catch((e) => setError(String(e)));
  }, []);

  if (error) return <div className="center">読み込みエラー: {error}</div>;
  if (!questions) return <div className="center">読み込み中…</div>;

  if (showSettings) return <Settings onBack={() => setShowSettings(false)} />;

  if (queue) {
    return (
      <Quiz
        queue={queue.items}
        initialIndex={queue.index}
        onExit={() => setQueue(null)}
      />
    );
  }

  const start = (mode: QuizMode) => {
    const pool = applyFilters(questions, filter, bookmarks, records);
    const items = buildQueue(pool, mode, records, Math.random, count ?? undefined);
    if (items.length === 0) return;
    startSession(items.map((q) => q.id));
    setQueue({ items, index: 0 });
  };

  return (
    <Home
      questions={questions}
      onStart={start}
      // resumable が null のとき（旧形式のセッション・問題が全て消えた場合）は再開不可
      onResume={resumable ? () => setQueue(resumable) : undefined}
      resumeInfo={resumable ? { index: resumable.index, total: resumable.items.length } : undefined}
      filter={filter}
      onFilterChange={setFilter}
      onOpenSettings={() => setShowSettings(true)}
      count={count}
      onCountChange={setCount}
    />
  );
}
