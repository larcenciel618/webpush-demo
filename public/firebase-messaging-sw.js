// Firebase Cloud Messaging 用 Service Worker
// ブラウザがフォアグラウンドにない時の通知はここで受信・表示される

// 注意: Service Worker は ES Modules / ビルドパイプラインを通らないため
// Firebase の compat SDK を importScripts で直接読み込む
importScripts("https://www.gstatic.com/firebasejs/11.1.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.1.0/firebase-messaging-compat.js");

// クライアントから登録時に URL クエリ経由で Firebase 設定を受け取る
// (.env の値を Service Worker に直接埋め込めないため)
const urlParams = new URLSearchParams(self.location.search);
const firebaseConfig = {
  apiKey: urlParams.get("apiKey"),
  authDomain: urlParams.get("authDomain"),
  projectId: urlParams.get("projectId"),
  storageBucket: urlParams.get("storageBucket"),
  messagingSenderId: urlParams.get("messagingSenderId"),
  appId: urlParams.get("appId"),
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// バックグラウンド時は、payload に notification フィールドがあれば
// FCM がこのハンドラを呼ばずに自動で通知を表示する。
// データメッセージ (data のみ) を独自処理したい場合にこのハンドラが有効。
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title ?? payload.data?.title ?? "通知";
  const options = {
    body: payload.notification?.body ?? payload.data?.body ?? "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: payload.data,
  };
  self.registration.showNotification(title, options);
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url ?? "/";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientsArr) => {
        const existing = clientsArr.find((c) => c.url.includes(targetUrl));
        if (existing) return existing.focus();
        return self.clients.openWindow(targetUrl);
      })
  );
});
