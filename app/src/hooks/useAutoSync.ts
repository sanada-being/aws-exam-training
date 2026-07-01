import { useEffect } from "react";
import { useStore } from "../store/useStore";
import { useSync } from "../store/useSync";
import { fetchGist, updateGist, buildPayload } from "../data/gist";

const PUSH_DEBOUNCE_MS = 2500;

/** 設定済みなら、起動時に取得マージ・変更時にデバウンスして保存する自動同期。 */
export function useAutoSync() {
  const enabled = useSync((s) => s.enabled);
  const token = useSync((s) => s.token);
  const gistId = useSync((s) => s.gistId);

  // 起動時: リモート取得→マージ
  useEffect(() => {
    if (!enabled || !token || !gistId) return;
    let cancelled = false;
    useSync.getState().setStatus("syncing");
    fetchGist(token, gistId)
      .then((p) => {
        if (cancelled) return;
        useStore.getState().mergeRemote(p);
        useSync.getState().markSynced(Date.now());
      })
      .catch((e) => {
        if (!cancelled) useSync.getState().setStatus("error", String(e?.message ?? e));
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, token, gistId]);

  // 変更時: デバウンスして保存
  useEffect(() => {
    if (!enabled || !token || !gistId) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsub = useStore.subscribe((s) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        useSync.getState().setStatus("syncing");
        updateGist(
          token,
          gistId,
          buildPayload({ records: s.records, bookmarks: s.bookmarks }, Date.now()),
        )
          .then(() => useSync.getState().markSynced(Date.now()))
          .catch((e) => useSync.getState().setStatus("error", String(e?.message ?? e)));
      }, PUSH_DEBOUNCE_MS);
    });
    return () => {
      clearTimeout(timer);
      unsub();
    };
  }, [enabled, token, gistId]);
}
