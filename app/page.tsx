"use client";

import { useEffect, useState } from "react";
import {
  listenForegroundMessages,
  requestPermissionAndGetToken,
} from "@/lib/firebase/client";

type LogEntry = { at: string; text: string };

export default function Page() {
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<
    "idle" | "requesting" | "registered" | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const addLog = (text: string) =>
    setLogs((prev) => [
      { at: new Date().toLocaleTimeString(), text },
      ...prev,
    ].slice(0, 50));

  useEffect(() => {
    let unsub: (() => void) | undefined;
    (async () => {
      unsub = await listenForegroundMessages((payload) => {
        addLog(
          `フォアグラウンド受信: ${payload.title ?? "(no title)"} — ${payload.body ?? ""}`
        );
      });
    })();
    return () => {
      unsub?.();
    };
  }, []);

  async function subscribe() {
    setStatus("requesting");
    setError(null);
    try {
      const t = await requestPermissionAndGetToken();
      if (!t) {
        setStatus("error");
        setError("通知が許可されなかったか、FCM が未対応のブラウザです");
        return;
      }

      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: t,
          userAgent: navigator.userAgent,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }

      setToken(t);
      setStatus("registered");
      addLog("トークンをサーバーに登録しました");
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <main>
      <nav>
        <a href="/">購読</a>
        <a href="/admin">送信 (Admin)</a>
      </nav>

      <h1>Web Push Demo</h1>
      <p className="muted">
        Next.js App Router + Firebase Cloud Messaging。ブラウザ非表示でも通知を受け取れます。
      </p>

      <section className="card">
        <h2>
          通知を購読{" "}
          {status === "registered" && (
            <span className="badge success">登録済み</span>
          )}
          {status === "error" && <span className="badge error">エラー</span>}
        </h2>

        <p className="muted">
          ボタンを押すと通知許可ダイアログが出ます。許可すると FCM トークンが発行され、
          サーバー側の Firestore に保存されます。
        </p>

        <div className="row">
          <button onClick={subscribe} disabled={status === "requesting"}>
            {status === "requesting" ? "登録中…" : "通知を購読する"}
          </button>
        </div>

        {error && (
          <p style={{ color: "#f87171", marginTop: 12 }}>{error}</p>
        )}

        {token && (
          <>
            <label>FCM トークン</label>
            <div className="token">{token}</div>
          </>
        )}
      </section>

      <section className="card">
        <h2>受信ログ (フォアグラウンド)</h2>
        <p className="muted">
          このタブがアクティブな時の通知はここに記録されます。バックグラウンド時は OS
          の通知センターを確認してください。
        </p>
        <div className="log">
          {logs.length === 0 && (
            <div className="log-entry" style={{ color: "#5a5a67" }}>
              まだ受信していません
            </div>
          )}
          {logs.map((l, i) => (
            <div className="log-entry" key={i}>
              <span style={{ color: "#5a5a67" }}>[{l.at}]</span> {l.text}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
