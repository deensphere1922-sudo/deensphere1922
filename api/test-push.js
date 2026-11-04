import webpush from 'web-push';

try {
  webpush.setVapidDetails(
    'mailto:deensphere1922@gmail.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
} catch (e) {
  console.error("VAPID Keys are missing or invalid in Vercel!");
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const { subscription } = req.body;
  if (!subscription) return res.status(400).send('No subscription provided');

  const payload = JSON.stringify({
    title: "🔔 Deen Sphere Test",
    body: "If you see this, the server push is working perfectly!",
    icon: "/Deensphere_app_icon.png",
    url: "/",
    tag: "test-notification"
  });

  try {
    await webpush.sendNotification(subscription, payload, { TTL: 3600 });
    return res.status(200).send('Test notification sent.');
  } catch (error) {
    console.error('Test push error:', error);
    return res.status(500).send('Error: ' + error.message);
  }
}