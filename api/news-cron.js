import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

try {
  webpush.setVapidDetails(
    'mailto:deensphere1922@gmail.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
} catch (e) {
  console.error("VAPID Keys are missing or invalid in Vercel!");
}

const supabase = createClient(
  process.env.SUPABASE_URL || "https://ydopgiotyypnorpqkkwa.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "YOUR_SUPABASE_SECRET_KEY"
);

// ==========================================
// HELPERS
// ==========================================
function pad(n) { return String(n).padStart(2, '0'); }
function dateStr(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }

function localPartsFor(timeZone, at) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23"
  }).formatToParts(at);
  const v = {};
  for (const p of parts) if (p.type !== "literal") v[p.type] = Number(p.value);
  return { year: v.year, month: v.month, day: v.day, minutes: v.hour * 60 + v.minute };
}

function timeStringToMinutes(s) {
  if (!s) return 0;
  const clean = String(s).trim().split(' ')[0];
  const [h, m] = clean.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return 0;
  return ((h * 60 + m) % 1440 + 1440) % 1440;
}

// ==========================================
// ALADHAN — exact prayer times per locality
// ==========================================
const METHOD_MAP = {
  MWL: 3,
  ISNA: 2,
  EGYPT: 5,
  KARACHI: 1,
  UMMALQURA: 4,
};

async function getAladhanTimings(lat, lng, tzName, calcMethod, asrMethod, localDate) {
  const dd = pad(localDate.day);
  const mm = pad(localDate.month);
  const yyyy = localDate.year;

  const methodId = METHOD_MAP[calcMethod] || 3;
  const school = asrMethod === 'hanafi' ? 1 : 0;

  const url =
    `https://api.aladhan.com/v1/timings/${dd}-${mm}-${yyyy}` +
    `?latitude=${lat}&longitude=${lng}` +
    `&method=${methodId}&school=${school}` +
    `&timezonestring=${encodeURIComponent(tzName)}`;

  const resp = await fetch(url);
  if (!resp.ok) throw new Error('AlAdhan HTTP ' + resp.status);
  const json = await resp.json();
  if (!json || !json.data || !json.data.timings) throw new Error('AlAdhan bad payload');

  const t = json.data.timings;
  return {
    fajr:    timeStringToMinutes(t.Fajr),
    dhuhr:   timeStringToMinutes(t.Dhuhr),
    asr:     timeStringToMinutes(t.Asr),
    maghrib: timeStringToMinutes(t.Maghrib),
    isha:    timeStringToMinutes(t.Isha),
  };
}

// ==========================================
// MAIN HANDLER
// ==========================================
export default async function handler(req, res) {
  try {
    const { data: profiles } = await supabase
      .from('user_sync')
      .select('user_id, value')
      .eq('key', 'settings');

    if (!profiles || profiles.length === 0) {
      return res.status(200).send("No user settings found.");
    }

    let sentCount = 0;
    const now = new Date();

    // ==========================================
    // 1) NEWS
    // ==========================================
    try {
      const newsRes = await fetch('https://deensphere1922.vercel.app/api/news');
      const newsData = await newsRes.json();

      if (newsData && newsData.items && newsData.items.length > 0) {
        const latestArticle = newsData.items[0];
        const { data: lastNews } = await supabase
          .from('app_state').select('value').eq('key', 'last_news_title').maybeSingle();
        const lastTitle = lastNews ? lastNews.value : null;

        if (latestArticle.title !== lastTitle) {
          const newsPayload = {
            title: "📰 Ummah Hub Update",
            body: latestArticle.title,
            icon: "/Deensphere_app_icon.png",
            url: "/",
            tag: "news-update"
          };

          for (const profile of profiles) {
            const settings = profile.value || {};
            if (settings.notif && settings.notif.news === false) continue;

            const { data: subs } = await supabase
              .from('push_subscriptions').select('subscription')
              .eq('user_id', profile.user_id);

            if (subs) {
              for (const sub of subs) {
                try {
                  await webpush.sendNotification(sub.subscription, JSON.stringify(newsPayload), { TTL: 3600 });
                } catch (e) {
                  if (e.statusCode === 410 || e.statusCode === 404) {
                    await supabase.from('push_subscriptions').delete().eq('subscription', sub.subscription);
                  }
                }
              }
            }
          }
          await supabase.from('app_state').upsert({ key: 'last_news_title', value: latestArticle.title });
          sentCount++;
        }
      }
    } catch (e) { console.error("News check failed:", e); }

    // ==========================================
    // 2) PRAYER + ADHKAR + QURAN + BIRTHDAY
    // ==========================================
    for (const profile of profiles) {
      try {
        const settings = profile.value;
        if (!settings || !settings.location) continue;

        const lat = settings.location.lat;
        const lng = settings.location.lng;
        const calcMethod = settings.calcMethod || 'MWL';
        const asrMethod = settings.asrMethod || 'standard';
        const tzName = settings.location.timezone || settings.timezone || 'Asia/Kolkata';

        let local;
        try { local = localPartsFor(tzName, now); }
        catch (e) {
          console.warn('Bad timezone for user', profile.user_id, tzName);
          continue;
        }

        const localDate = {
          year: local.year,
          month: local.month,
          day: local.day,
        };

        let userMin;
        try {
          userMin = await getAladhanTimings(lat, lng, tzName, calcMethod, asrMethod, localDate);
        } catch (e) {
          console.error('AlAdhan failed for user', profile.user_id, e.message);
          continue;
        }

        const at = local.minutes;
        const plus30 = (m) => (m + 30) % 1440;

        const hit = (m) => {
          const target = ((m % 1440) + 1440) % 1440;

          const parts = new Intl.DateTimeFormat('en-CA', {
            timeZone: tzName,
            hour: '2-digit',
            minute: '2-digit',
            hourCycle: 'h23'
          }).formatToParts(new Date());

          const v = {};
          for (const p of parts) if (p.type !== 'literal') v[p.type] = Number(p.value);
          const nowMin = ((v.hour * 60) + v.minute) % 1440;

          return nowMin === target || nowMin === ((target + 1) % 1440);
        };

        const allowed = (key) => {
          if (!settings.notif) return true;
          return settings.notif[key] !== false;
        };

        let payload = null, notificationKey = null;

        if (hit(userMin.fajr) && allowed('fajr')) { payload = { title: "🕌 Fajr Prayer", body: "Time for Fajr. Begin your day with prayer.", prayer: "fajr", kind: "time" }; notificationKey = `fajr-${dateStr(localDate)}`; }
        else if (hit(userMin.dhuhr) && allowed('dhuhr')) { payload = { title: "🕌 Dhuhr Prayer", body: "Time for Dhuhr. Take a break and reconnect with Allah.", prayer: "dhuhr", kind: "time" }; notificationKey = `dhuhr-${dateStr(localDate)}`; }
        else if (hit(userMin.asr) && allowed('asr')) { payload = { title: "🕌 Asr Prayer", body: "Time for Asr. Pause your day to remember Him.", prayer: "asr", kind: "time" }; notificationKey = `asr-${dateStr(localDate)}`; }
        else if (hit(userMin.maghrib) && allowed('maghrib')) { payload = { title: "🕌 Maghrib Prayer", body: "Time for Maghrib. The sun has set, time to pray.", prayer: "maghrib", kind: "time" }; notificationKey = `maghrib-${dateStr(localDate)}`; }
        else if (hit(userMin.isha) && allowed('isha')) { payload = { title: "🕌 Isha Prayer", body: "Time for Isha. End your day with prayer and peace.", prayer: "isha", kind: "time" }; notificationKey = `isha-${dateStr(localDate)}`; }

        else if (hit(plus30(userMin.fajr)) && allowed('fajr')) { payload = { title: "🕌 Fajr Check", body: "Did you offer Fajr? Tap to log your prayer now.", prayer: "fajr", kind: "check" }; notificationKey = `fajr-check-${dateStr(localDate)}`; }
        else if (hit(plus30(userMin.dhuhr)) && allowed('dhuhr')) { payload = { title: "🕌 Dhuhr Check", body: "Did you offer Dhuhr? Tap to log your prayer now.", prayer: "dhuhr", kind: "check" }; notificationKey = `dhuhr-check-${dateStr(localDate)}`; }
        else if (hit(plus30(userMin.asr)) && allowed('asr')) { payload = { title: "🕌 Asr Check", body: "Did you offer Asr? Tap to log your prayer now.", prayer: "asr", kind: "check" }; notificationKey = `asr-check-${dateStr(localDate)}`; }
        else if (hit(plus30(userMin.maghrib)) && allowed('maghrib')) { payload = { title: "🕌 Maghrib Check", body: "Did you offer Maghrib? Tap to log your prayer now.", prayer: "maghrib", kind: "check" }; notificationKey = `maghrib-check-${dateStr(localDate)}`; }
        else if (hit(plus30(userMin.isha)) && allowed('isha')) { payload = { title: "🕌 Isha Check", body: "Did you offer Isha? Tap to log your prayer now.", prayer: "isha", kind: "check" }; notificationKey = `isha-check-${dateStr(localDate)}`; }

        // ── CATCH-UP: fires only if the exact-minute tick was skipped ──
        if (!payload) {
          const prayerMap = {
            fajr:    { min: userMin.fajr,    label: 'Fajr',    body: 'Time for Fajr. Begin your day with prayer.' },
            dhuhr:   { min: userMin.dhuhr,   label: 'Dhuhr',   body: 'Time for Dhuhr. Take a break and reconnect with Allah.' },
            asr:     { min: userMin.asr,     label: 'Asr',     body: 'Time for Asr. Pause your day to remember Him.' },
            maghrib: { min: userMin.maghrib, label: 'Maghrib', body: 'Time for Maghrib. The sun has set, time to pray.' },
            isha:    { min: userMin.isha,    label: 'Isha',    body: 'Time for Isha. End your day with prayer and peace.' },
          };

          for (const key of ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']) {
            const target = prayerMap[key].min % 1440;
            const diff = (at - target + 1440) % 1440;

            if (diff !== 1) continue;
            if (!allowed(key)) continue;

            const originalKey = profile.user_id + ':' + `${key}-${dateStr(localDate)}`;
            const { data: originalSent } = await supabase
              .from('app_state').select('value').eq('key', originalKey).maybeSingle();
            if (originalSent) continue;

            payload = {
              title: `🕌 ${prayerMap[key].label} Prayer`,
              body: prayerMap[key].body,
              prayer: key,
              kind: 'time',
            };
            notificationKey = `${key}-catchup-${dateStr(localDate)}`;
            break;
          }
        }

        if (!payload && at === 420 && allowed('adhkar')) {
          payload = { title: "🌅 Morning Adhkar", body: "Start your day with the remembrance of Allah." };
          notificationKey = `morning-adhkar-${dateStr(localDate)}`;
        }

        if (!payload && at === 18 * 60 && allowed('adhkar')) {
          payload = { title: "🌇 Evening Adhkar", body: "Take a moment to remember Allah before the day ends." };
          notificationKey = `evening-adhkar-${dateStr(localDate)}`;
        }

        // ✅ QUR'AN REMINDER AT 8:00 PM (20 * 60 = 1200 minutes)
        if (!payload && hit(20 * 60) && allowed('quran')) {
          payload = { title: "📖 Qur'an Reminder", body: "A moment with the Qur'an brings peace." };
          notificationKey = `quran-${dateStr(localDate)}`;
        }

        if (!payload && at === 9 * 60 && settings.birthday && allowed('birthday')) {
          try {
            const [, bm, bd] = String(settings.birthday).split('-').map(Number);
            if (bm === local.month && bd === local.day) {
              payload = { title: "🎂 Happy Birthday", body: "May Allah bless your year ahead. Take a moment for gratitude today." };
              notificationKey = `birthday-${dateStr(localDate)}`;
            }
          } catch (e) {}
        }

        if (payload && notificationKey) {
          const dedupeKey = profile.user_id + ':' + notificationKey;
          const { data: sentData } = await supabase
            .from('app_state').select('value').eq('key', dedupeKey).maybeSingle();

          if (!sentData) {
            payload.icon = "/Deensphere_app_icon.png";
            payload.url = "/";

            const { data: subs } = await supabase
              .from('push_subscriptions').select('subscription')
              .eq('user_id', profile.user_id);

            if (subs && subs.length > 0) {
              for (const sub of subs) {
                try {
                  await webpush.sendNotification(
                    sub.subscription,
                    JSON.stringify(payload),
                    { TTL: 3600 }
                  );
                } catch (e) {
                  if (e.statusCode === 410 || e.statusCode === 404) {
                    await supabase.from('push_subscriptions')
                      .delete().eq('subscription', sub.subscription);
                  }
                }
              }
              sentCount++;
              const { error: dedupeError } = await supabase.from('app_state')
                .upsert({ key: dedupeKey, value: 'sent' });

              if (dedupeError) {
                console.error("🚨 DEDUPE FAILED (will send again!):", dedupeError);
              }
            }
          }
        }
      } catch (profileError) {
        console.error("Error processing profile:", profileError.message);
      }
    }

    if (sentCount > 0) return res.status(200).send(`Sent ${sentCount} notifications.`);
    return res.status(200).send("No notifications to send right now.");
  } catch (error) {
    return res.status(500).send("Error: " + error.message);
  }
}
