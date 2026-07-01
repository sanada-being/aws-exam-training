import { useState } from "react";
import { useStore } from "../store/useStore";
import { useSync } from "../store/useSync";
import { createGist, fetchGist, updateGist, buildPayload } from "../data/gist";

export function Settings({ onBack }: { onBack: () => void }) {
  const sync = useSync();
  const [importText, setImportText] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const snapshot = () => {
    const s = useStore.getState();
    return { records: s.records, bookmarks: s.bookmarks };
  };

  const busy = () => useSync.getState().setStatus("syncing");

  async function handleCreate() {
    if (!sync.token) return setMsg("先にトークンを入力してください");
    try {
      busy();
      const id = await createGist(sync.token, buildPayload(snapshot(), Date.now()));
      sync.setGistId(id);
      sync.setEnabled(true);
      useSync.getState().markSynced(Date.now());
      setMsg(`同期を作成しました。同期コード: ${id}`);
    } catch (e) {
      useSync.getState().setStatus("error", String(e));
      setMsg(`失敗: ${e}`);
    }
  }

  async function handlePull() {
    if (!sync.token || !sync.gistId) return setMsg("トークンと同期コードが必要です");
    try {
      busy();
      const p = await fetchGist(sync.token, sync.gistId);
      useStore.getState().mergeRemote(p);
      sync.setEnabled(true);
      useSync.getState().markSynced(Date.now());
      setMsg("取得してマージしました");
    } catch (e) {
      useSync.getState().setStatus("error", String(e));
      setMsg(`失敗: ${e}`);
    }
  }

  async function handlePush() {
    if (!sync.token || !sync.gistId) return setMsg("トークンと同期コードが必要です");
    try {
      busy();
      await updateGist(sync.token, sync.gistId, buildPayload(snapshot(), Date.now()));
      useSync.getState().markSynced(Date.now());
      setMsg("保存しました");
    } catch (e) {
      useSync.getState().setStatus("error", String(e));
      setMsg(`失敗: ${e}`);
    }
  }

  function handleExport() {
    navigator.clipboard?.writeText(JSON.stringify(buildPayload(snapshot(), Date.now())));
    setMsg("進捗JSONをコピーしました（バックアップ用）");
  }

  function handleImport() {
    try {
      const p = JSON.parse(importText);
      useStore.getState().mergeRemote(p);
      setMsg("インポートしてマージしました");
      setImportText("");
    } catch {
      setMsg("JSONの形式が不正です");
    }
  }

  return (
    <div className="settings">
      <header className="quizbar">
        <button type="button" className="btn ghost" onClick={onBack}>
          ← 戻る
        </button>
        <span className="qno">設定 / 同期</span>
      </header>

      <h2>進捗の端末間同期（GitHub Gist）</h2>
      <p className="muted small">
        非公開Gistに進捗を保存し、PC↔スマホで同期します。トークンはこの端末のブラウザにのみ保存され、公開されません。
        <br />
        トークンは GitHub の Settings → Developer settings → Personal access tokens で
        <strong> gist 権限のみ</strong> のトークンを作成してください。
      </p>

      <label className="field">
        <span>アクセストークン</span>
        <input
          type="password"
          value={sync.token}
          onChange={(e) => sync.setToken(e.target.value)}
          placeholder="ghp_..."
          autoComplete="off"
        />
      </label>

      <label className="field">
        <span>同期コード（Gist ID）</span>
        <input
          type="text"
          value={sync.gistId}
          onChange={(e) => sync.setGistId(e.target.value)}
          placeholder="別端末で発行したコードを貼り付け"
        />
      </label>

      <div className="syncbtns">
        <button type="button" className="btn primary" onClick={handleCreate}>
          この端末で新規に同期を開始
        </button>
        <button type="button" className="btn" onClick={handlePull}>
          同期コードで取得（参加）
        </button>
        <button type="button" className="btn" onClick={handlePush} disabled={!sync.gistId}>
          今すぐ保存
        </button>
        {sync.gistId && (
          <button
            type="button"
            className="btn ghost small"
            onClick={() => {
              navigator.clipboard?.writeText(sync.gistId);
              setMsg("同期コードをコピーしました");
            }}
          >
            同期コードをコピー
          </button>
        )}
      </div>

      <p className="muted small" data-testid="syncstatus">
        状態: {sync.enabled ? "有効" : "無効"} / {sync.status}
        {sync.lastError ? ` (${sync.lastError})` : ""}
      </p>
      {sync.enabled && (
        <button type="button" className="btn ghost small" onClick={() => sync.clear()}>
          同期を解除
        </button>
      )}

      <details className="backup">
        <summary>手動バックアップ（エクスポート/インポート）</summary>
        <button type="button" className="btn small" onClick={handleExport}>
          進捗をコピー
        </button>
        <textarea
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder="ここに進捗JSONを貼り付けてインポート"
          rows={4}
        />
        <button type="button" className="btn small" onClick={handleImport} disabled={!importText}>
          インポート
        </button>
      </details>

      {msg && (
        <p className="syncmsg" role="status">
          {msg}
        </p>
      )}
    </div>
  );
}
