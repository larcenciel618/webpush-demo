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

// このアプリは data メッセージのみを送信する設計のため、表示は常にこのハンドラで行う。
// notification フィールドを使うと FCM が自動表示し、ここでも showNotification を
// 呼ぶことで通知が二重に出てしまう (Firebase JS SDK V1 の挙動)。
messaging.onBackgroundMessage((payload) => {
  const title = payload.data?.title ?? "通知";
  const options = {
    body: payload.data?.body ?? "",
    icon: payload.data?.icon ?? "/icon-192.png",
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
