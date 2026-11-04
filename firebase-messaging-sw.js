// firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/12.19.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.19.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDE2QyKSZfKx-KgiEW48qjbzIWYeCvQXpw",
  authDomain: "deensphere-4b321.firebaseapp.com",
  projectId: "deensphere-4b321",
  storageBucket: "deensphere-4b321.firebasestorage.app",
  messagingSenderId: "869472134150",
  appId: "1:869472134150:web:a8085df51837e72aa44f87"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: './Deensphere_app_icon.png'
  });
});