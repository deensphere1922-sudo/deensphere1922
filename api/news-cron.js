// import webpush from 'web-push';
// import { createClient } from '@supabase/supabase-js';

// // ==========================================
// // VAPID + SUPABASE
// // ==========================================
// try {
//   webpush.setVapidDetails(
//     'mailto:deensphere1922@gmail.com',
//     process.env.VAPID_PUBLIC_KEY,
//     process.env.VAPID_PRIVATE_KEY
//   );
// } catch (e) {
//   console.error('VAPID Keys are missing or invalid in Vercel:', e.message);
// }

// const supabase = createClient(
//   process.env.SUPABASE_URL || 'https://ydopgiotyypnorpqkkwa.supabase.co',
//   process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SUPABASE_SECRET_KEY'
// );

// // ==========================================
// // HELPERS
// // ==========================================
// function pad(n) {
//   return String(n).padStart(2, '0');
// }

// function dateStr(d) {
//   return `${d.year}-${pad(d.month)}-${pad(d.day)}`;
// }

// function localPartsFor(timeZone, at) {
//   const parts = new Intl.DateTimeFormat('en-CA', {
//     timeZone,
//     year: 'numeric',
//     month: '2-digit',
//     day: '2-digit',
//     hour: '2-digit',
//     minute: '2-digit',
//     hourCycle: 'h23'
//   }).formatToParts(at);

//   const values = {};

//   for (const part of parts) {
//     if (part.type !== 'literal') {
//       values[part.type] = Number(part.value);
//     }
//   }

//   return {
//     year: values.year,
//     month: values.month,
//     day: values.day,
//     minutes: values.hour * 60 + values.minute
//   };
// }

// function timeStringToMinutes(value) {
//   if (!value) return 0;

//   const clean = String(value).trim().split(' ')[0];
//   const [hours, minutes] = clean.split(':').map(Number);

//   if (Number.isNaN(hours) || Number.isNaN(minutes)) {
//     return 0;
//   }

//   return ((hours * 60 + minutes) % 1440 + 1440) % 1440;
// }

// // ==========================================
// // EXACT TIME + 1 MINUTE SAFETY WINDOW
// // ==========================================
// function isWithinOneMinuteWindow(targetMinute, currentMinute) {
//   const target = ((targetMinute % 1440) + 1440) % 1440;

//   const diff = (currentMinute - target + 1440) % 1440;

//   return diff === 0 || diff === 1;
// }

// // ==========================================
// // ALADHAN — PRAYER TIMES
// // ==========================================
// const METHOD_MAP = {
//   MWL: 3,
//   ISNA: 2,
//   EGYPT: 5,
//   KARACHI: 1,
//   UMMALQURA: 4
// };

// async function getAladhanTimings(
//   lat,
//   lng,
//   tzName,
//   calcMethod,
//   asrMethod,
//   localDate
// ) {
//   const dd = pad(localDate.day);
//   const mm = pad(localDate.month);
//   const yyyy = localDate.year;

//   const methodId = METHOD_MAP[calcMethod] || 3;
//   const school = asrMethod === 'hanafi' ? 1 : 0;

//   const url =
//     `https://api.aladhan.com/v1/timings/${dd}-${mm}-${yyyy}` +
//     `?latitude=${lat}&longitude=${lng}` +
//     `&method=${methodId}&school=${school}` +
//     `&timezonestring=${encodeURIComponent(tzName)}`;

//   const response = await fetch(url);

//   if (!response.ok) {
//     throw new Error(`AlAdhan HTTP ${response.status}`);
//   }

//   const json = await response.json();

//   if (!json || !json.data || !json.data.timings) {
//     throw new Error('AlAdhan returned an invalid payload');
//   }

//   const timings = json.data.timings;

//   return {
//     fajr: timeStringToMinutes(timings.Fajr),
//     dhuhr: timeStringToMinutes(timings.Dhuhr),
//     asr: timeStringToMinutes(timings.Asr),
//     maghrib: timeStringToMinutes(timings.Maghrib),
//     isha: timeStringToMinutes(timings.Isha)
//   };
// }

// // ==========================================
// // PUSH SENDER + SUPABASE DEDUPLICATION
// // ==========================================
// async function sendUserNotification(
//   userId,
//   payload,
//   notificationKey
// ) {
//   const dedupeKey = `${userId}:${notificationKey}`;

//   const { data: existing, error: checkError } = await supabase
//     .from('app_state')
//     .select('value')
//     .eq('key', dedupeKey)
//     .maybeSingle();

//   if (checkError) {
//     console.error(
//       'Could not check notification dedupe key:',
//       dedupeKey,
//       checkError
//     );
//     return false;
//   }

//   if (existing) {
//     return false;
//   }

//   const { data: subscriptions, error: subscriptionError } =
//     await supabase
//       .from('push_subscriptions')
//       .select('subscription')
//       .eq('user_id', userId);

//   if (subscriptionError) {
//     console.error(
//       'Could not load push subscriptions:',
//       userId,
//       subscriptionError
//     );
//     return false;
//   }

//   if (!subscriptions || subscriptions.length === 0) {
//     console.log('No push subscriptions for user:', userId);
//     return false;
//   }

//   const finalPayload = {
//     ...payload,
//     icon: '/Deensphere_app_icon.png',
//     url: '/'
//   };

//   let delivered = false;

//   for (const row of subscriptions) {
//     try {
//       await webpush.sendNotification(
//         row.subscription,
//         JSON.stringify(finalPayload),
//         { TTL: 3600 }
//       );

//       delivered = true;

//     } catch (error) {
//       console.error(
//         'Push delivery failed:',
//         userId,
//         error.statusCode,
//         error.message
//       );

//       if (error.statusCode === 410 || error.statusCode === 404) {
//         const { error: deleteError } = await supabase
//           .from('push_subscriptions')
//           .delete()
//           .eq('user_id', userId)
//           .eq('subscription', row.subscription);

//         if (deleteError) {
//           console.error(
//             'Could not remove expired subscription:',
//             deleteError
//           );
//         }
//       }
//     }
//   }

//   if (!delivered) {
//     return false;
//   }

//   const { error: saveError } = await supabase
//     .from('app_state')
//     .upsert({
//       key: dedupeKey,
//       value: 'sent'
//     });

//   if (saveError) {
//     console.error(
//       'Could not save notification dedupe key:',
//       dedupeKey,
//       saveError
//     );

//     return false;
//   }

//   return true;
// }

// // ==========================================
// // MAIN HANDLER
// // ==========================================
// export default async function handler(req, res) {
//   try {
//     const now = new Date();

//     const {
//       data: profiles,
//       error: profilesError
//     } = await supabase
//       .from('user_sync')
//       .select('user_id, value')
//       .eq('key', 'settings');

//     if (profilesError) {
//       throw profilesError;
//     }

//     if (!profiles || profiles.length === 0) {
//       return res.status(200).send('No user settings found.');
//     }

//     let sentCount = 0;

//     // ==========================================
//     // 1. NEWS NOTIFICATIONS
//     // ==========================================
//     try {
//       const newsResponse = await fetch(
//         'https://deensphere1922.vercel.app/api/news'
//       );

//       if (!newsResponse.ok) {
//         throw new Error(`News API HTTP ${newsResponse.status}`);
//       }

//       const newsData = await newsResponse.json();

//       if (
//         newsData &&
//         Array.isArray(newsData.items) &&
//         newsData.items.length > 0
//       ) {
//         const latestArticle = newsData.items[0];

//         const {
//           data: lastNews,
//           error: lastNewsError
//         } = await supabase
//           .from('app_state')
//           .select('value')
//           .eq('key', 'last_news_title')
//           .maybeSingle();

//         if (lastNewsError) {
//           throw lastNewsError;
//         }

//         const lastTitle = lastNews ? lastNews.value : null;

//         if (
//           latestArticle.title &&
//           latestArticle.title !== lastTitle
//         ) {
//           const newsPayload = {
//             title: '📰 Ummah Hub Update',
//             body: latestArticle.title,
//             icon: '/Deensphere_app_icon.png',
//             url: '/',
//             tag: 'news-update'
//           };

//           let newsDelivered = false;

//           for (const profile of profiles) {
//             const settings = profile.value || {};

//             if (
//               settings.notif &&
//               settings.notif.news === false
//             ) {
//               continue;
//             }

//             const {
//               data: subscriptions,
//               error: subscriptionError
//             } = await supabase
//               .from('push_subscriptions')
//               .select('subscription')
//               .eq('user_id', profile.user_id);

//             if (subscriptionError) {
//               console.error(
//                 'News subscription lookup failed:',
//                 profile.user_id,
//                 subscriptionError
//               );
//               continue;
//             }

//             for (const row of subscriptions || []) {
//               try {
//                 await webpush.sendNotification(
//                   row.subscription,
//                   JSON.stringify(newsPayload),
//                   { TTL: 3600 }
//                 );

//                 newsDelivered = true;

//               } catch (error) {
//                 console.error(
//                   'News push failed:',
//                   profile.user_id,
//                   error.statusCode,
//                   error.message
//                 );

//                 if (
//                   error.statusCode === 410 ||
//                   error.statusCode === 404
//                 ) {
//                   await supabase
//                     .from('push_subscriptions')
//                     .delete()
//                     .eq('user_id', profile.user_id)
//                     .eq('subscription', row.subscription);
//                 }
//               }
//             }
//           }

//           if (newsDelivered) {
//             const { error: newsSaveError } = await supabase
//               .from('app_state')
//               .upsert({
//                 key: 'last_news_title',
//                 value: latestArticle.title
//               });

//             if (newsSaveError) {
//               console.error(
//                 'Could not save last news title:',
//                 newsSaveError
//               );
//             } else {
//               sentCount++;
//             }
//           }
//         }
//       }

//     } catch (newsError) {
//       console.error('News check failed:', newsError);
//     }

//     // ==========================================
//     // 2. PRAYER + ADHKAR + QURAN + BIRTHDAY
//     // ==========================================
//     for (const profile of profiles) {
//       try {
//         const settings = profile.value || {};

//         if (!settings.location) {
//           continue;
//         }

//         const lat = settings.location.lat;
//         const lng = settings.location.lng;

//         if (lat == null || lng == null) {
//           console.warn(
//             'Missing coordinates for user:',
//             profile.user_id
//           );
//           continue;
//         }

//         const calcMethod = settings.calcMethod || 'MWL';
//         const asrMethod = settings.asrMethod || 'standard';

//         const tzName =
//           settings.location.timezone ||
//           settings.timezone ||
//           'Asia/Kolkata';

//         // ------------------------------------------
//         // USER LOCAL TIME
//         // ------------------------------------------
//         let local;

//         try {
//           local = localPartsFor(tzName, now);

//         } catch (timezoneError) {
//           console.warn(
//             'Bad timezone for user:',
//             profile.user_id,
//             tzName,
//             timezoneError.message
//           );
//           continue;
//         }

//         const localDate = {
//           year: local.year,
//           month: local.month,
//           day: local.day
//         };

//         const at = local.minutes;

//         const today = dateStr(localDate);

//         const plus30 = (minutes) =>
//           (minutes + 30) % 1440;

//         // ------------------------------------------
//         // TIME MATCHING
//         // ------------------------------------------
//         const hit = (targetMinute) =>
//           isWithinOneMinuteWindow(targetMinute, at);

//         // ------------------------------------------
//         // NOTIFICATION TOGGLES
//         // ------------------------------------------
//         const allowed = (key) => {
//           if (!settings.notif) return true;

//           return settings.notif[key] !== false;
//         };

//         let payload = null;
//         let notificationKey = null;

//         // ------------------------------------------
//         // GET PRAYER TIMES
//         // ------------------------------------------
//         let userMin;

//         try {
//           userMin = await getAladhanTimings(
//             lat,
//             lng,
//             tzName,
//             calcMethod,
//             asrMethod,
//             localDate
//           );

//         } catch (aladhanError) {
//           console.error(
//             'AlAdhan failed for user:',
//             profile.user_id,
//             aladhanError.message
//           );
//           continue;
//         }

//         // ==========================================
//         // 3. FIVE PRAYER NOTIFICATIONS
//         // ==========================================
//         if (
//           hit(userMin.fajr) &&
//           allowed('fajr')
//         ) {
//           payload = {
//             title: '🕌 Fajr Prayer',
//             body: 'Time for Fajr. Begin your day with prayer.',
//             prayer: 'fajr',
//             kind: 'time'
//           };

//           notificationKey = `fajr-${today}`;

//         } else if (
//           hit(userMin.dhuhr) &&
//           allowed('dhuhr')
//         ) {
//           payload = {
//             title: '🕌 Dhuhr Prayer',
//             body: 'Time for Dhuhr. Take a break and reconnect with Allah.',
//             prayer: 'dhuhr',
//             kind: 'time'
//           };

//           notificationKey = `dhuhr-${today}`;

//         } else if (
//           hit(userMin.asr) &&
//           allowed('asr')
//         ) {
//           payload = {
//             title: '🕌 Asr Prayer',
//             body: 'Time for Asr. Pause your day to remember Him.',
//             prayer: 'asr',
//             kind: 'time'
//           };

//           notificationKey = `asr-${today}`;

//         } else if (
//           hit(userMin.maghrib) &&
//           allowed('maghrib')
//         ) {
//           payload = {
//             title: '🕌 Maghrib Prayer',
//             body: 'Time for Maghrib. The sun has set, time to pray.',
//             prayer: 'maghrib',
//             kind: 'time'
//           };

//           notificationKey = `maghrib-${today}`;

//         } else if (
//           hit(userMin.isha) &&
//           allowed('isha')
//         ) {
//           payload = {
//             title: '🕌 Isha Prayer',
//             body: 'Time for Isha. End your day with prayer and peace.',
//             prayer: 'isha',
//             kind: 'time'
//           };

//           notificationKey = `isha-${today}`;
//         }

//         // ==========================================
//         // 4. PRAYER CHECK — 30 MINUTES AFTER PRAYER
//         // ==========================================
//         if (
//           !payload &&
//           hit(plus30(userMin.fajr)) &&
//           allowed('fajr')
//         ) {
//           payload = {
//             title: '🕌 Fajr Check',
//             body: 'Did you offer Fajr? Tap to log your prayer now.',
//             prayer: 'fajr',
//             kind: 'check'
//           };

//           notificationKey = `fajr-check-${today}`;

//         } else if (
//           !payload &&
//           hit(plus30(userMin.dhuhr)) &&
//           allowed('dhuhr')
//         ) {
//           payload = {
//             title: '🕌 Dhuhr Check',
//             body: 'Did you offer Dhuhr? Tap to log your prayer now.',
//             prayer: 'dhuhr',
//             kind: 'check'
//           };

//           notificationKey = `dhuhr-check-${today}`;

//         } else if (
//           !payload &&
//           hit(plus30(userMin.asr)) &&
//           allowed('asr')
//         ) {
//           payload = {
//             title: '🕌 Asr Check',
//             body: 'Did you offer Asr? Tap to log your prayer now.',
//             prayer: 'asr',
//             kind: 'check'
//           };

//           notificationKey = `asr-check-${today}`;

//         } else if (
//           !payload &&
//           hit(plus30(userMin.maghrib)) &&
//           allowed('maghrib')
//         ) {
//           payload = {
//             title: '🕌 Maghrib Check',
//             body: 'Did you offer Maghrib? Tap to log your prayer now.',
//             prayer: 'maghrib',
//             kind: 'check'
//           };

//           notificationKey = `maghrib-check-${today}`;

//         } else if (
//           !payload &&
//           hit(plus30(userMin.isha)) &&
//           allowed('isha')
//         ) {
//           payload = {
//             title: '🕌 Isha Check',
//             body: 'Did you offer Isha? Tap to log your prayer now.',
//             prayer: 'isha',
//             kind: 'check'
//           };

//           notificationKey = `isha-check-${today}`;
//         }

//         // ==========================================
//         // 5. MORNING ADHKAR — 7:00 + 7:01
//         // ==========================================
//         if (
//           !payload &&
//           hit(7 * 60) &&
//           allowed('adhkar')
//         ) {
//           payload = {
//             title: '🌅 Morning Adhkar',
//             body: 'Start your day with the remembrance of Allah.'
//           };

//           notificationKey = `morning-adhkar-${today}`;
//         }

//         // ==========================================
//         // 6. EVENING ADHKAR — 6:00 + 6:01
//         // ==========================================
//         if (
//           !payload &&
//           hit(18 * 60) &&
//           allowed('adhkar')
//         ) {
//           payload = {
//             title: '🌇 Evening Adhkar',
//             body: 'Take a moment to remember Allah before the day ends.'
//           };

//           notificationKey = `evening-adhkar-${today}`;
//         }

//         // ==========================================
//         // 7. QURAN — 8:00 + 8:01
//         // ==========================================
//         if (
//           !payload &&
//          hit(20 * 60) &&
//           allowed('quran')
//         ) {
//           payload = {
//             title: '📖 Qur\'an Reminder',
//             body: 'A moment with the Qur\'an brings peace.'
//           };

//           notificationKey = `quran-${today}`;
//         }

//         // ==========================================
//         // 8. BIRTHDAY — 9:00 + 9:01
//         // ==========================================
//         if (
//           !payload &&
//           hit(9 * 60) &&
//           settings.birthday &&
//           allowed('birthday')
//         ) {
//           try {
//             const [, birthdayMonth, birthdayDay] =
//               String(settings.birthday).split('-').map(Number);

//             if (
//               birthdayMonth === local.month &&
//               birthdayDay === local.day
//             ) {
//               payload = {
//                 title: '🎂 Happy Birthday',
//                 body: 'May Allah bless your year ahead. Take a moment for gratitude today.'
//               };

//               notificationKey = `birthday-${today}`;
//             }

//           } catch (birthdayError) {
//             console.error(
//               'Invalid birthday value:',
//               profile.user_id,
//               birthdayError
//             );
//           }
//         }

//         // ==========================================
//         // 9. SEND NOTIFICATION
//         // ==========================================
//         if (payload && notificationKey) {
//           const delivered = await sendUserNotification(
//             profile.user_id,
//             payload,
//             notificationKey
//           );

//           if (delivered) {
//             sentCount++;
//           }
//         }

//       } catch (profileError) {
//         console.error(
//           'Error processing profile:',
//           profile.user_id,
//           profileError.message
//         );
//       }
//     }

//     // ==========================================
//     // RESPONSE
//     // ==========================================
//     if (sentCount > 0) {
//       return res.status(200).send(
//         `Sent ${sentCount} notifications.`
//       );
//     }

//     return res.status(200).send(
//       'No notifications to send right now.'
//     );

//   } catch (error) {
//     console.error('Notification handler failed:', error);

//     return res.status(500).send(
//       'Error: ' + error.message
//     );
//   }
// }


import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

// ==========================================
// CONFIG
// ==========================================
const WINDOW = {
  prayer:   1,
  check:    1,
  adhkar:   1,
  quran:    1,
  birthday: 1
};

const TTL_TIME_SENSITIVE = 60;
const TTL_NEWS           = 86400;
const ALADHAN_CACHE_TTL  = 86400;

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
function pad(n) {
  return String(n).padStart(2, '0');
}

function dateStr(d) {
  return `${d.year}-${pad(d.month)}-${pad(d.day)}`;
}

function localPartsFor(timeZone, at) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(at);

  const values = {};
  for (const part of parts) {
    if (part.type !== 'literal') values[part.type] = Number(part.value);
  }

  return {
    year: values.year,
    month: values.month,
    day: values.day,
    minutes: values.hour * 60 + values.minute
  };
}

function timeStringToMinutes(value) {
  if (!value) return null;
  const clean = String(value).trim().split(' ')[0];
  const [h, m] = clean.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return ((h * 60 + m) % 1440 + 1440) % 1440;
}

function isWithinWindow(targetMinute, currentMinute, safeMinutes) {
  const target = ((targetMinute % 1440) + 1440) % 1440;
  const diff = (currentMinute - target + 1440) % 1440;
  return diff <= safeMinutes;
}

// ==========================================
// ALADHAN — with cache
// ==========================================
const METHOD_MAP = { MWL: 3, ISNA: 2, EGYPT: 5, KARACHI: 1, UMMALQURA: 4 };

async function getAladhanTimingsCached(lat, lng, tzName, calcMethod, asrMethod, localDate) {
  const methodId = METHOD_MAP[calcMethod] || 3;
  const school = asrMethod === 'hanafi' ? 1 : 0;
  const dateKey = dateStr(localDate);

  const latKey = Number(lat).toFixed(2);
  const lngKey = Number(lng).toFixed(2);

  const cacheKey = `aladhan:${latKey}:${lngKey}:${dateKey}:${methodId}:${school}:${tzName}`;

  const { data: cached } = await supabase
    .from('app_state')
    .select('value, created_at')
    .eq('key', cacheKey)
    .maybeSingle();

  if (cached && cached.value) {
    try {
      const parsed = JSON.parse(cached.value);
      const ageSec = cached.created_at
        ? (Date.now() - new Date(cached.created_at).getTime()) / 1000
        : 0;
      if (ageSec < ALADHAN_CACHE_TTL && parsed && parsed.fajr != null) {
        return parsed;
      }
    } catch (_) { /* corrupted cache — refetch */ }
  }

  const url =
    `https://api.aladhan.com/v1/timings/${pad(localDate.day)}-${pad(localDate.month)}-${localDate.year}` +
    `?latitude=${lat}&longitude=${lng}` +
    `&method=${methodId}&school=${school}` +
    `&timezonestring=${encodeURIComponent(tzName)}`;

  const response = await fetch(url);
  if (!response.ok) throw new Error(`AlAdhan HTTP ${response.status}`);

  const json = await response.json();
  if (!json?.data?.timings) throw new Error('AlAdhan invalid payload');

  const t = json.data.timings;
  const timings = {
    fajr:    timeStringToMinutes(t.Fajr),
    dhuhr:   timeStringToMinutes(t.Dhuhr),
    asr:     timeStringToMinutes(t.Asr),
    maghrib: timeStringToMinutes(t.Maghrib),
    isha:    timeStringToMinutes(t.Isha)
  };

  try {
    await supabase.from('app_state').upsert({
      key: cacheKey,
      value: JSON.stringify(timings)
    });
  } catch (_) { /* ignore */ }

  return timings;
}

// ==========================================
// ATOMIC DEDUPE
// ==========================================
async function claimNotification(userId, notificationKey) {
  const dedupeKey = `${userId}:${notificationKey}`;

  const { data: inserted, error: insertError } = await supabase
    .from('app_state')
    .upsert(
      { key: dedupeKey, value: 'pending' },
      { onConflict: 'key', ignoreDuplicates: true }
    )
    .select('key');

  if (insertError) {
    console.error('Dedupe insert failed:', dedupeKey, insertError);
    return false;
  }

  if (!inserted || inserted.length === 0) {
    return false;
  }

  return true;
}

async function markSent(userId, notificationKey) {
  const dedupeKey = `${userId}:${notificationKey}`;
  await supabase
    .from('app_state')
    .update({ value: 'sent' })
    .eq('key', dedupeKey);
}

async function releaseClaim(userId, notificationKey) {
  const dedupeKey = `${userId}:${notificationKey}`;
  await supabase
    .from('app_state')
    .delete()
    .eq('key', dedupeKey)
    .eq('value', 'pending');
}

// ==========================================
// PUSH SENDER
// ==========================================
async function sendUserNotification(userId, payload, notificationKey, ttlSeconds) {
  const claimed = await claimNotification(userId, notificationKey);
  if (!claimed) return false;

  const { data: subscriptions, error: subscriptionError } = await supabase
    .from('push_subscriptions')
    .select('subscription')
    .eq('user_id', userId);

  if (subscriptionError) {
    console.error('Subscription load failed:', userId, subscriptionError);
    await releaseClaim(userId, notificationKey);
    return false;
  }

  if (!subscriptions || subscriptions.length === 0) {
    await releaseClaim(userId, notificationKey);
    return false;
  }

  const finalPayload = {
    ...payload,
    icon: '/Deensphere_app_icon.png',
    url: '/'
  };

  let delivered = false;

  for (const row of subscriptions) {
    try {
      await webpush.sendNotification(
        row.subscription,
        JSON.stringify(finalPayload),
        { TTL: ttlSeconds }
      );
      delivered = true;
    } catch (error) {
      console.error('Push failed:', userId, error.statusCode, error.message);
      if (error.statusCode === 410 || error.statusCode === 404) {
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', userId)
          .eq('subscription', row.subscription);
      }
    }
  }

  if (!delivered) {
    await releaseClaim(userId, notificationKey);
    return false;
  }

  await markSent(userId, notificationKey);
  return true;
}

// ==========================================
// NEWS — per-user dedupe
// ==========================================
async function handleNews(profiles) {
  try {
    const r = await fetch('https://deensphere1922.vercel.app/api/news');
    if (!r.ok) throw new Error(`News API HTTP ${r.status}`);

    const data = await r.json();
    if (!Array.isArray(data?.items) || data.items.length === 0) return 0;

    const latest = data.items[0];
    if (!latest?.title) return 0;

    let count = 0;

    for (const profile of profiles) {
      const settings = profile.value || {};
      if (settings.notif && settings.notif.news === false) continue;

      const userKey = `last_news_title:${profile.user_id}`;
      const { data: last } = await supabase
        .from('app_state')
        .select('value')
        .eq('key', userKey)
        .maybeSingle();

      if (last?.value === latest.title) continue;

      const { data: subs } = await supabase
        .from('push_subscriptions')
        .select('subscription')
        .eq('user_id', profile.user_id);

      if (!subs || subs.length === 0) continue;

      const newsPayload = {
        title: '📰 Ummah Hub Update',
        body: latest.title,
        icon: '/Deensphere_app_icon.png',
        url: '/',
        tag: 'news-update'
      };

      let userDelivered = false;

      for (const row of subs) {
        try {
          await webpush.sendNotification(
            row.subscription,
            JSON.stringify(newsPayload),
            { TTL: TTL_NEWS }
          );
          userDelivered = true;
        } catch (error) {
          console.error('News push failed:', profile.user_id, error.statusCode, error.message);
          if (error.statusCode === 410 || error.statusCode === 404) {
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('user_id', profile.user_id)
              .eq('subscription', row.subscription);
          }
        }
      }

      if (userDelivered) {
        await supabase
          .from('app_state')
          .upsert({ key: userKey, value: latest.title });
        count++;
      }
    }

    return count;
  } catch (err) {
    console.error('News check failed:', err);
    return 0;
  }
}

// ==========================================
// CATEGORY BUILDERS
// ==========================================
function prayerTimeNotification(name, minute, currentMinute, allowed, today) {
  if (minute == null) return null;
  if (!isWithinWindow(minute, currentMinute, WINDOW.prayer)) return null;
  if (!allowed(name)) return null;

  const meta = {
    fajr:    { title: '🕌 Fajr Prayer',    body: 'Time for Fajr. Begin your day with prayer.' },
    dhuhr:   { title: '🕌 Dhuhr Prayer',   body: 'Time for Dhuhr. Take a break and reconnect with Allah.' },
    asr:     { title: '🕌 Asr Prayer',     body: 'Time for Asr. Pause your day to remember Him.' },
    maghrib: { title: '🕌 Maghrib Prayer', body: 'Time for Maghrib. The sun has set, time to pray.' },
    isha:    { title: '🕌 Isha Prayer',    body: 'Time for Isha. End your day with prayer and peace.' }
  }[name];

  if (!meta) return null;
  return { key: `${name}-${today}`, payload: { ...meta, prayer: name, kind: 'time' } };
}

function prayerCheckNotification(name, minute, currentMinute, allowed, today) {
  if (minute == null) return null;
  const checkMinute = (minute + 30) % 1440;

  let checkDate = today;
  if (minute + 30 >= 1440) {
    const [y, m, d] = today.split('-').map(Number);
    const next = new Date(Date.UTC(y, m - 1, d + 1));
    checkDate = `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`;
  }

  if (!isWithinWindow(checkMinute, currentMinute, WINDOW.check)) return null;
  if (!allowed(name)) return null;

  const meta = {
    fajr:    { title: '🕌 Fajr Check',    body: 'Did you offer Fajr? Tap to log your prayer now.' },
    dhuhr:   { title: '🕌 Dhuhr Check',   body: 'Did you offer Dhuhr? Tap to log your prayer now.' },
    asr:     { title: '🕌 Asr Check',     body: 'Did you offer Asr? Tap to log your prayer now.' },
    maghrib: { title: '🕌 Maghrib Check', body: 'Did you offer Maghrib? Tap to log your prayer now.' },
    isha:    { title: '🕌 Isha Check',    body: 'Did you offer Isha? Tap to log your prayer now.' }
  }[name];

  if (!meta) return null;
  return { key: `${name}-check-${checkDate}`, payload: { ...meta, prayer: name, kind: 'check' } };
}

// ==========================================
// MAIN HANDLER
// ==========================================
export default async function handler(req, res) {
  try {
    const now = new Date();

    const { data: profiles, error: profilesError } = await supabase
      .from('user_sync')
      .select('user_id, value')
      .eq('key', 'settings');

    if (profilesError) throw profilesError;
    if (!profiles || profiles.length === 0) {
      return res.status(200).send('No user settings found.');
    }

    let sentCount = 0;

    // 1. NEWS
    sentCount += await handleNews(profiles);

    // 2. TIME-BASED PER USER
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
        try {
          local = localPartsFor(tzName, now);
        } catch (tzErr) {
          console.warn('Bad timezone:', profile.user_id, tzName);
          continue;
        }

        const localDate = { year: local.year, month: local.month, day: local.day };
        const at = local.minutes;
        const today = dateStr(localDate);

        const allowed = (key) => {
          if (!settings.notif) return true;
          return settings.notif[key] !== false;
        };

        let userMin;
        try {
          userMin = await getAladhanTimingsCached(lat, lng, tzName, calcMethod, asrMethod, localDate);
        } catch (err) {
          console.error('AlAdhan failed:', profile.user_id, err.message);
          continue;
        }

        const prayerNames = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

        // --- Prayer-time notifications ---
        for (const name of prayerNames) {
          const n = prayerTimeNotification(name, userMin[name], at, allowed, today);
          if (!n) continue;
          const ok = await sendUserNotification(
            profile.user_id, n.payload, n.key, TTL_TIME_SENSITIVE
          );
          if (ok) sentCount++;
        }

        // --- Prayer checks (only if prayer was sent) ---
        for (const name of prayerNames) {
          const prayerKey = `${name}-${today}`;
          const { data: sentRow } = await supabase
            .from('app_state')
            .select('key')
            .eq('key', `${profile.user_id}:${prayerKey}`)
            .maybeSingle();
          if (!sentRow) continue;

          const n = prayerCheckNotification(name, userMin[name], at, allowed, today);
          if (!n) continue;
          const ok = await sendUserNotification(
            profile.user_id, n.payload, n.key, TTL_TIME_SENSITIVE
          );
          if (ok) sentCount++;
        }

        // --- Morning Adhkar (07:00) ---
        if (isWithinWindow(7 * 60, at, WINDOW.adhkar) && allowed('adhkar')) {
          const ok = await sendUserNotification(
            profile.user_id,
            { title: '🌅 Morning Adhkar', body: 'Start your day with the remembrance of Allah.' },
            `morning-adhkar-${today}`,
            TTL_TIME_SENSITIVE
          );
          if (ok) sentCount++;
        }

        // --- Evening Adhkar (18:00) ---
        if (isWithinWindow(18 * 60, at, WINDOW.adhkar) && allowed('adhkar')) {
          const ok = await sendUserNotification(
            profile.user_id,
            { title: '🌇 Evening Adhkar', body: 'Take a moment to remember Allah before the day ends.' },
            `evening-adhkar-${today}`,
            TTL_TIME_SENSITIVE
          );
          if (ok) sentCount++;
        }

        // --- Qur'an (20:00) ---
        if (isWithinWindow(20 * 60, at, WINDOW.quran) && allowed('quran')) {
          const ok = await sendUserNotification(
            profile.user_id,
            { title: '📖 Qur\'an Reminder', body: 'A moment with the Qur\'an brings peace.' },
            `quran-${today}`,
            TTL_TIME_SENSITIVE
          );
          if (ok) sentCount++;
        }

        // --- Birthday (09:00, on birthday only) ---
        if (isWithinWindow(9 * 60, at, WINDOW.birthday) && settings.birthday && allowed('birthday')) {
          try {
            const [, bm, bd] = String(settings.birthday).split('-').map(Number);
            if (bm === local.month && bd === local.day) {
              const ok = await sendUserNotification(
                profile.user_id,
                { title: '🎂 Happy Birthday', body: 'May Allah bless your year ahead. Take a moment for gratitude today.' },
                `birthday-${today}`,
                TTL_TIME_SENSITIVE
              );
              if (ok) sentCount++;
            }
          } catch (e) {
            console.error('Invalid birthday:', profile.user_id, e);
          }
        }

      } catch (profileError) {
        console.error('Profile error:', profile.user_id, profileError.message);
      }
    }

    if (sentCount > 0) {
      return res.status(200).send(`Sent ${sentCount} notifications.`);
    }
    return res.status(200).send('No notifications to send right now.');

  } catch (error) {
    console.error('Handler failed:', error);
    return res.status(500).send('Error: ' + error.message);
  }
}
