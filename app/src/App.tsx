import { useEffect, useState } from "react";
import type { Question } from "./types";
import { loadQuestions } from "./data/loader";
import { buildQueue, type QuizMode } from "./domain/selection";
import { applyFilters, emptyFilter, type Filter } from "./domain/filter";
import { Home } from "./screens/Home";
import { Quiz } from "./screens/Quiz";
import { Settings } from "./screens/Settings";
import { useStore } from "./store/useStore";
import { isResumable } from "./domain/session";
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

  const resume = () => {
    if (!session) return;
    const map = new Map(questions.map((q) => [q.id, q]));
    const items = session.queueIds
      .map((id) => map.get(id))
      .filter((q): q is Question => Boolean(q));
    setQueue({ items, index: session.index });
  };

  // 回答明細を持たない旧形式のセッションは再開不可（明細を復元できないため）
  const canResume = isResumable(session);

  return (
    <Home
      questions={questions}
      onStart={start}
      onResume={canResume ? resume : undefined}
      resumeInfo={canResume ? { index: session!.index, total: session!.queueIds.length } : undefined}
      filter={filter}
      onFilterChange={setFilter}
      onOpenSettings={() => setShowSettings(true)}
      count={count}
      onCountChange={setCount}
    />
  );
}
