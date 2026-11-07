import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

// ==========================================
// VAPID + SUPABASE
// ==========================================
try {
  webpush.setVapidDetails(
    'mailto:deensphere1922@gmail.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
} catch (e) {
  console.error('VAPID Keys are missing or invalid in Vercel:', e.message);
}

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://ydopgiotyypnorpqkkwa.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SUPABASE_SECRET_KEY'
);

// ==========================================
// HELPERS
// ==========================================
function pad(n) { return String(n).padStart(2, '0'); }
function dateStr(d) { return `${d.year}-${pad(d.month)}-${pad(d.day)}`; }

function localPartsFor(timeZone, at) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(at);

  const values = {};
  for (const part of parts) {
    if (part.type !== 'literal') values[part.type] = Number(part.value);
  }
  return { year: values.year, month: values.month, day: values.day, minutes: values.hour * 60 + values.minute };
}

function timeStringToMinutes(value) {
  if (!value) return 0;
  const clean = String(value).trim().split(' ')[0];
  const [hours, minutes] = clean.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return 0;
  return ((hours * 60 + minutes) % 1440 + 1440) % 1440;
}

// ==========================================
// 1-MINUTE SAFE WINDOW
// ==========================================
function isWithinOneMinuteWindow(targetMinute, currentMinute) {
  const target = ((targetMinute % 1440) + 1440) % 1440;
  const diff = (currentMinute - target + 1440) % 1440;
  return diff === 0 || diff === 1;
}

// ==========================================
// ALADHAN — PRAYER TIMES
// ==========================================
const METHOD_MAP = { MWL: 3, ISNA: 2, EGYPT: 5, KARACHI: 1, UMMALQURA: 4 };

async function getAladhanTimings(lat, lng, tzName, calcMethod, asrMethod, localDate) {
  const dd = pad(localDate.day);
  const mm = pad(localDate.month);
  const yyyy = localDate.year;
  const methodId = METHOD_MAP[calcMethod] || 3;
  const school = asrMethod === 'hanafi' ? 1 : 0;

  const url = `https://api.aladhan.com/v1/timings/${dd}-${mm}-${yyyy}?latitude=${lat}&longitude=${lng}&method=${methodId}&school=${school}&timezonestring=${encodeURIComponent(tzName)}`;
  const response = await fetch(url);

  if (!response.ok) throw new Error(`AlAdhan HTTP ${response.status}`);
  const json = await response.json();
  if (!json || !json.data || !json.data.timings) throw new Error('AlAdhan invalid');

  const timings = json.data.timings;
  return {
    fajr: timeStringToMinutes(timings.Fajr),
    dhuhr: timeStringToMinutes(timings.Dhuhr),
    asr: timeStringToMinutes(timings.Asr),
    maghrib: timeStringToMinutes(timings.Maghrib),
    isha: timeStringToMinutes(timings.Isha)
  };
}

// ==========================================
// PUSH SENDER
// ==========================================
async function sendUserNotification(userId, payload, notificationKey) {
  const dedupeKey = `${userId}:${notificationKey}`;

  const { data: existing, error: checkError } = await supabase.from('app_state').select('value').eq('key', dedupeKey).maybeSingle();
  if (checkError || existing) return false;

  const { data: subscriptions, error: subscriptionError } = await supabase.from('push_subscriptions').select('subscription').eq('user_id', userId);
  if (subscriptionError || !subscriptions || subscriptions.length === 0) return false;

  const finalPayload = { ...payload, icon: '/Deensphere_app_icon.png', url: '/' };
  let delivered = false;

   for (const row of subscriptions) {
    try {
      await webpush.sendNotification(
        row.subscription, 
        JSON.stringify(finalPayload), 
        { TTL: 3600 } // <--- CHANGED TO 3600
      );
      delivered = true;
    } catch (error) {
      if (error.statusCode === 410 || error.statusCode === 404) {
        await supabase.from('push_subscriptions').delete().eq('user_id', userId).eq('subscription', row.subscription);
      }
    }
  }

  if (!delivered) return false;

  await supabase.from('app_state').upsert({ key: dedupeKey, value: 'sent' });
  return true;
}

// ==========================================
// NEWS
// ==========================================
async function handleNews(profiles) {
  try {
    const r = await fetch('https://deensphere1922.vercel.app/api/news');
    if (!r.ok) return 0;
    const data = await r.json();
    if (!Array.isArray(data?.items) || data.items.length === 0) return 0;

    const latest = data.items[0];
    const articleId = latest.id || latest.link;
    if (!articleId) return 0;

    let count = 0;
    for (const profile of profiles) {
      const settings = profile.value || {};
      if (settings.notif && settings.notif.news === false) continue;

      const userKey = `seen_news:${profile.user_id}`;
      const { data: row } = await supabase.from('app_state').select('value').eq('key', userKey).maybeSingle();
      
      let seen = [];
      if (row?.value) { try { seen = JSON.parse(row.value); } catch { seen = []; } }
      if (seen.includes(articleId)) continue;

      const { data: subs } = await supabase.from('push_subscriptions').select('subscription').eq('user_id', profile.user_id);
      if (!subs || subs.length === 0) continue;

      const payload = { title: '📰 Ummah Hub Update', body: latest.title, icon: '/Deensphere_app_icon.png', url: latest.link || '/', tag: 'news-update' };
      let delivered = false;

      for (const s of subs) {
        try {
          await webpush.sendNotification(s.subscription, JSON.stringify(payload), { TTL: 3600 });
          delivered = true;
        } catch (e) {
          if (e.statusCode === 410 || e.statusCode === 404) {
            await supabase.from('push_subscriptions').delete().eq('user_id', profile.user_id).eq('subscription', s.subscription);
          }
        }
      }

      if (delivered) {
        seen.push(articleId);
        if (seen.length > 100) seen = seen.slice(-100);
        await supabase.from('app_state').upsert({ key: userKey, value: JSON.stringify(seen) });
        count++;
      }
    }
    return count;
  } catch (err) { return 0; }
}

// ==========================================
// MAIN HANDLER
// ==========================================
export default async function handler(req, res) {
  try {
    const now = new Date();
    const { data: profiles, error: profilesError } = await supabase.from('user_sync').select('user_id, value').eq('key', 'settings');

    if (profilesError || !profiles || profiles.length === 0) return res.status(200).send('No user settings found.');

    let sentCount = 0;
    sentCount += await handleNews(profiles);

    for (const profile of profiles) {
      try {
        const settings = profile.value || {};
        if (!settings.location) continue;

        const lat = settings.location.lat;
        const lng = settings.location.lng;
        if (lat == null || lng == null) continue;

        const calcMethod = settings.calcMethod || 'MWL';
        const asrMethod = settings.asrMethod || 'standard';
        const tzName = settings.location.timezone || settings.timezone || 'Asia/Kolkata';

        let local;
        try { local = localPartsFor(tzName, now); } catch { continue; }

        const localDate = { year: local.year, month: local.month, day: local.day };
        const at = local.minutes;
        const today = dateStr(localDate);

        const hit = (targetMinute) => isWithinOneMinuteWindow(targetMinute, at);
        const allowed = (key) => !settings.notif || settings.notif[key] !== false;

        let userMin;
        try { userMin = await getAladhanTimings(lat, lng, tzName, calcMethod, asrMethod, localDate); } catch { continue; }

        const getTargetTime = (minuteOfDay) => {
          const h = Math.floor(minuteOfDay / 60);
          const m = minuteOfDay % 60;
          return new Date(localDate.year, localDate.month - 1, localDate.day, h, m, 0).getTime();
        };

        const getExactHitMinute = (targetMinute) => {
          return at === targetMinute ? targetMinute : targetMinute + 1;
        };

        // Helper to send and count
        const send = async (payload, key) => {
          const delivered = await sendUserNotification(profile.user_id, payload, key);
          if (delivered) sentCount++;
        };

        // ==========================================
        // 3. FIVE PRAYERS
        // ==========================================
        let prayerFired = null; 
        let prayerTarget = null;

        if (hit(userMin.fajr) && allowed('fajr')) {
          prayerFired = 'fajr'; prayerTarget = userMin.fajr;
          const exactMin = getExactHitMinute(userMin.fajr);
          await send({ title: '🕌 Fajr Prayer', body: 'Time for Fajr. Begin your day with prayer.', prayer: 'fajr', kind: 'time', targetTime: getTargetTime(exactMin) }, `fajr-${today}`);
        }
        if (hit(userMin.dhuhr) && allowed('dhuhr')) {
          prayerFired = 'dhuhr'; prayerTarget = userMin.dhuhr;
          const exactMin = getExactHitMinute(userMin.dhuhr);
          await send({ title: '🕌 Dhuhr Prayer', body: 'Time for Dhuhr. Take a break and reconnect with Allah.', prayer: 'dhuhr', kind: 'time', targetTime: getTargetTime(exactMin) }, `dhuhr-${today}`);
        }
        if (hit(userMin.asr) && allowed('asr')) {
          prayerFired = 'asr'; prayerTarget = userMin.asr;
          const exactMin = getExactHitMinute(userMin.asr);
          await send({ title: '🕌 Asr Prayer', body: 'Time for Asr. Pause your day to remember Him.', prayer: 'asr', kind: 'time', targetTime: getTargetTime(exactMin) }, `asr-${today}`);
        }
        if (hit(userMin.maghrib) && allowed('maghrib')) {
          prayerFired = 'maghrib'; prayerTarget = userMin.maghrib;
          const exactMin = getExactHitMinute(userMin.maghrib);
          await send({ title: '🕌 Maghrib Prayer', body: 'Time for Maghrib. The sun has set, time to pray.', prayer: 'maghrib', kind: 'time', targetTime: getTargetTime(exactMin) }, `maghrib-${today}`);
        }
        if (hit(userMin.isha) && allowed('isha')) {
          prayerFired = 'isha'; prayerTarget = userMin.isha;
          const exactMin = getExactHitMinute(userMin.isha);
          await send({ title: '🕌 Isha Prayer', body: 'Time for Isha. End your day with prayer and peace.', prayer: 'isha', kind: 'time', targetTime: getTargetTime(exactMin) }, `isha-${today}`);
        }

        // ==========================================
        // 4. CHECKS (Shifts if prayer was late)
        // ==========================================
        if (prayerFired && prayerTarget !== null) {
          const checkTarget = (prayerTarget + 30) % 1440; 
          const checkKey = `${prayerFired}-check-${today}`;
          const exactMin = getExactHitMinute(checkTarget);
          await send({ title: `🕌 ${prayerFired.charAt(0).toUpperCase() + prayerFired.slice(1)} Check`, body: `Did you offer ${prayerFired}? Tap to log your prayer now.`, prayer: prayerFired, kind: 'check', targetTime: getTargetTime(exactMin) }, checkKey);
        }

        // ==========================================
        // 5. ADHKAR / QURAN / BIRTHDAY
        // ==========================================
        if (hit(7 * 60) && allowed('adhkar')) {
          const exactMin = getExactHitMinute(7 * 60);
          await send({ title: '🌅 Morning Adhkar', body: 'Start your day with the remembrance of Allah.', targetTime: getTargetTime(exactMin) }, `morning-adhkar-${today}`);
        }

        if (hit(18 * 60) && allowed('adhkar')) {
          const exactMin = getExactHitMinute(18 * 60);
          await send({ title: '🌇 Evening Adhkar', body: 'Take a moment to remember Allah before the day ends.', targetTime: getTargetTime(exactMin) }, `evening-adhkar-${today}`);
        }

        if (hit(23 * 60 + 12) && allowed('quran')) {
          const exactMin = getExactHitMinute(23 * 60 + 12);
          await send({ title: '📖 Qur\'an Reminder', body: 'A moment with the Qur\'an brings peace.', targetTime: getTargetTime(exactMin) }, `quran-${today}`);
        }

        if (hit(9 * 60) && settings.birthday && allowed('birthday')) {
          try {
            const [, birthdayMonth, birthdayDay] = String(settings.birthday).split('-').map(Number);
            if (birthdayMonth === local.month && birthdayDay === local.day) {
              const exactMin = getExactHitMinute(9 * 60);
              await send({ title: '🎂 Happy Birthday', body: 'May Allah bless your year ahead. Take a moment for gratitude today.', targetTime: getTargetTime(exactMin) }, `birthday-${today}`);
            }
          } catch {}
        }

      } catch (profileError) { }
    }

    if (sentCount > 0) return res.status(200).send(`Sent ${sentCount} notifications.`);
    return res.status(200).send('No notifications to send right now.');
  } catch (error) {
    return res.status(500).send('Error: ' + error.message);
  }
}
