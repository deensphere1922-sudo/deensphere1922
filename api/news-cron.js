// // import webpush from 'web-push';
// // import { createClient } from '@supabase/supabase-js';

// // // ==========================================
// // // VAPID + SUPABASE
// // // ==========================================
// // try {
// //   webpush.setVapidDetails(
// //     'mailto:deensphere1922@gmail.com',
// //     process.env.VAPID_PUBLIC_KEY,
// //     process.env.VAPID_PRIVATE_KEY
// //   );
// // } catch (e) {
// //   console.error('VAPID Keys are missing or invalid in Vercel:', e.message);
// // }

// // const supabase = createClient(
// //   process.env.SUPABASE_URL || 'https://ydopgiotyypnorpqkkwa.supabase.co',
// //   process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SUPABASE_SECRET_KEY'
// // );

// // // ==========================================
// // // HELPERS
// // // ==========================================
// // function pad(n) {
// //   return String(n).padStart(2, '0');
// // }

// // function dateStr(d) {
// //   return `${d.year}-${pad(d.month)}-${pad(d.day)}`;
// // }

// // function localPartsFor(timeZone, at) {
// //   const parts = new Intl.DateTimeFormat('en-CA', {
// //     timeZone,
// //     year: 'numeric',
// //     month: '2-digit',
// //     day: '2-digit',
// //     hour: '2-digit',
// //     minute: '2-digit',
// //     hourCycle: 'h23'
// //   }).formatToParts(at);

// //   const values = {};

// //   for (const part of parts) {
// //     if (part.type !== 'literal') {
// //       values[part.type] = Number(part.value);
// //     }
// //   }

// //   return {
// //     year: values.year,
// //     month: values.month,
// //     day: values.day,
// //     minutes: values.hour * 60 + values.minute
// //   };
// // }

// // function timeStringToMinutes(value) {
// //   if (!value) return 0;

// //   const clean = String(value).trim().split(' ')[0];
// //   const [hours, minutes] = clean.split(':').map(Number);

// //   if (Number.isNaN(hours) || Number.isNaN(minutes)) {
// //     return 0;
// //   }

// //   return ((hours * 60 + minutes) % 1440 + 1440) % 1440;
// // }

// // // ==========================================
// // // TIME WINDOWS
// // // ==========================================
// // // Prayers AND checks: exact minute OR +1 minute
// // function isPrayerHit(targetMinute, currentMinute) {
// //   const target = ((targetMinute % 1440) + 1440) % 1440;
// //   const diff = (currentMinute - target + 1440) % 1440;
// //   return diff === 0 || diff === 1;
// // }

// // // Everything else: exact minute ONLY
// // function isExactHit(targetMinute, currentMinute) {
// //   const target = ((targetMinute % 1440) + 1440) % 1440;
// //   const diff = (currentMinute - target + 1440) % 1440;
// //   return diff === 0;
// // }

// // // ==========================================
// // // ALADHAN — PRAYER TIMES
// // // ==========================================
// // const METHOD_MAP = {
// //   MWL: 3,
// //   ISNA: 2,
// //   EGYPT: 5,
// //   KARACHI: 1,
// //   UMMALQURA: 4
// // };

// // async function getAladhanTimings(lat, lng, tzName, calcMethod, asrMethod, localDate) {
// //   const dd = pad(localDate.day);
// //   const mm = pad(localDate.month);
// //   const yyyy = localDate.year;

// //   const methodId = METHOD_MAP[calcMethod] || 3;
// //   const school = asrMethod === 'hanafi' ? 1 : 0;

// //   const url =
// //     `https://api.aladhan.com/v1/timings/${dd}-${mm}-${yyyy}` +
// //     `?latitude=${lat}&longitude=${lng}` +
// //     `&method=${methodId}&school=${school}` +
// //     `&timezonestring=${encodeURIComponent(tzName)}`;

// //   const response = await fetch(url);

// //   if (!response.ok) {
// //     throw new Error(`AlAdhan HTTP ${response.status}`);
// //   }

// //   const json = await response.json();

// //   if (!json || !json.data || !json.data.timings) {
// //     throw new Error('AlAdhan returned an invalid payload');
// //   }

// //   const timings = json.data.timings;

// //   return {
// //     fajr: timeStringToMinutes(timings.Fajr),
// //     dhuhr: timeStringToMinutes(timings.Dhuhr),
// //     asr: timeStringToMinutes(timings.Asr),
// //     maghrib: timeStringToMinutes(timings.Maghrib),
// //     isha: timeStringToMinutes(timings.Isha)
// //   };
// // }

// // // ==========================================
// // // PUSH SENDER + SUPABASE DEDUPLICATION
// // // ==========================================
// // async function sendUserNotification(userId, payload, notificationKey) {
// //   const dedupeKey = `${userId}:${notificationKey}`;

// //   const { data: existing, error: checkError } = await supabase
// //     .from('app_state')
// //     .select('value')
// //     .eq('key', dedupeKey)
// //     .maybeSingle();

// //   if (checkError) {
// //     console.error('Could not check notification dedupe key:', dedupeKey, checkError);
// //     return false;
// //   }

// //   if (existing) {
// //     return false;
// //   }

// //   const { data: subscriptions, error: subscriptionError } = await supabase
// //     .from('push_subscriptions')
// //     .select('subscription')
// //     .eq('user_id', userId);

// //   if (subscriptionError) {
// //     console.error('Could not load push subscriptions:', userId, subscriptionError);
// //     return false;
// //   }

// //   if (!subscriptions || subscriptions.length === 0) {
// //     console.log('No push subscriptions for user:', userId);
// //     return false;
// //   }

// //   const finalPayload = {
// //     ...payload,
// //     icon: '/Deensphere_app_icon.png',
// //     url: '/'
// //   };

// //   let delivered = false;

// //   for (const row of subscriptions) {
// //     try {
// //       await webpush.sendNotification(
// //         row.subscription,
// //         JSON.stringify(finalPayload),
// //         { TTL: 3600 }
// //       );

// //       delivered = true;

// //     } catch (error) {
// //       console.error('Push delivery failed:', userId, error.statusCode, error.message);

// //       if (error.statusCode === 410 || error.statusCode === 404) {
// //         const { error: deleteError } = await supabase
// //           .from('push_subscriptions')
// //           .delete()
// //           .eq('user_id', userId)
// //           .eq('subscription', row.subscription);

// //         if (deleteError) {
// //           console.error('Could not remove expired subscription:', deleteError);
// //         }
// //       }
// //     }
// //   }

// //   if (!delivered) {
// //     return false;
// //   }

// //   const { error: saveError } = await supabase
// //     .from('app_state')
// //     .upsert({
// //       key: dedupeKey,
// //       value: 'sent'
// //     });

// //   if (saveError) {
// //     console.error('Could not save notification dedupe key:', dedupeKey, saveError);
// //     return false;
// //   }

// //   return true;
// // }

// // // ==========================================
// // // NEWS — per-user ID dedupe (never re-notifies an old article)
// // // ==========================================
// // async function handleNews(profiles) {
// //   try {
// //     const r = await fetch('https://deensphere1922.vercel.app/api/news');
// //     if (!r.ok) throw new Error(`News API HTTP ${r.status}`);

// //     const data = await r.json();
// //     if (!Array.isArray(data?.items) || data.items.length === 0) return 0;

// //     const latest = data.items[0];
// //     const articleId = latest.id || latest.link;
// //     if (!articleId) return 0;

// //     let count = 0;

// //     for (const profile of profiles) {
// //       const settings = profile.value || {};
// //       if (settings.notif && settings.notif.news === false) continue;

// //       const userKey = `seen_news:${profile.user_id}`;
// //       const { data: row } = await supabase
// //         .from('app_state')
// //         .select('value')
// //         .eq('key', userKey)
// //         .maybeSingle();

// //       let seen = [];
// //       if (row?.value) {
// //         try {
// //           const parsed = JSON.parse(row.value);
// //           if (Array.isArray(parsed)) seen = parsed;
// //         } catch {
// //           seen = [];
// //         }
// //       }

// //       if (seen.includes(articleId)) continue;

// //       const { data: subs } = await supabase
// //         .from('push_subscriptions')
// //         .select('subscription')
// //         .eq('user_id', profile.user_id);

// //       if (!subs || subs.length === 0) continue;

// //       const payload = {
// //         title: '📰 Ummah Hub Update',
// //         body: latest.title,
// //         icon: '/Deensphere_app_icon.png',
// //         url: latest.link || '/',
// //         tag: 'news-update'
// //       };

// //       let delivered = false;

// //       for (const s of subs) {
// //         try {
// //           await webpush.sendNotification(
// //             s.subscription,
// //             JSON.stringify(payload),
// //             { TTL: 3600 }
// //           );
// //           delivered = true;
// //         } catch (e) {
// //           console.error('News push failed:', profile.user_id, e.statusCode, e.message);
// //           if (e.statusCode === 410 || e.statusCode === 404) {
// //             await supabase
// //               .from('push_subscriptions')
// //               .delete()
// //               .eq('user_id', profile.user_id)
// //               .eq('subscription', s.subscription);
// //           }
// //         }
// //       }

// //       if (delivered) {
// //         seen.push(articleId);
// //         if (seen.length > 100) seen = seen.slice(-100);
// //         await supabase
// //           .from('app_state')
// //           .upsert({ key: userKey, value: JSON.stringify(seen) });
// //         count++;
// //       }
// //     }

// //     return count;
// //   } catch (err) {
// //     console.error('News check failed:', err);
// //     return 0;
// //   }
// // }

// // // ==========================================
// // // MAIN HANDLER
// // // ==========================================
// // export default async function handler(req, res) {
// //   try {
// //     const now = new Date();

// //     const { data: profiles, error: profilesError } = await supabase
// //       .from('user_sync')
// //       .select('user_id, value')
// //       .eq('key', 'settings');

// //     if (profilesError) {
// //       throw profilesError;
// //     }

// //     if (!profiles || profiles.length === 0) {
// //       return res.status(200).send('No user settings found.');
// //     }

// //     let sentCount = 0;

// //     // ==========================================
// //     // 1. NEWS
// //     // ==========================================
// //     sentCount += await handleNews(profiles);

// //     // ==========================================
// //     // 2. PRAYER + CHECKS + ADHKAR + QURAN + BIRTHDAY
// //     // ==========================================
// //     for (const profile of profiles) {
// //       try {
// //         const settings = profile.value || {};

// //         if (!settings.location) continue;

// //         const lat = settings.location.lat;
// //         const lng = settings.location.lng;

// //         if (lat == null || lng == null) {
// //           console.warn('Missing coordinates for user:', profile.user_id);
// //           continue;
// //         }

// //         const calcMethod = settings.calcMethod || 'MWL';
// //         const asrMethod = settings.asrMethod || 'standard';

// //         const tzName =
// //           settings.location.timezone ||
// //           settings.timezone ||
// //           'Asia/Kolkata';

// //         let local;

// //         try {
// //           local = localPartsFor(tzName, now);
// //         } catch (timezoneError) {
// //           console.warn('Bad timezone for user:', profile.user_id, tzName, timezoneError.message);
// //           continue;
// //         }

// //         const localDate = {
// //           year: local.year,
// //           month: local.month,
// //           day: local.day
// //         };

// //         const at = local.minutes;
// //         const today = dateStr(localDate);

// //         const plus30 = (minutes) => (minutes + 30) % 1440;

// //         // hitPrayer → exact + 1 min (prayers AND checks)
// //         // hitExact  → exact minute only (adhkar, quran, birthday)
// //         const hitPrayer = (targetMinute) => isPrayerHit(targetMinute, at);
// //         const hitExact = (targetMinute) => isExactHit(targetMinute, at);

// //         const allowed = (key) => {
// //           if (!settings.notif) return true;
// //           return settings.notif[key] !== false;
// //         };

// //         let payload = null;
// //         let notificationKey = null;

// //         let userMin;

// //         try {
// //           userMin = await getAladhanTimings(lat, lng, tzName, calcMethod, asrMethod, localDate);
// //         } catch (aladhanError) {
// //           console.error('AlAdhan failed for user:', profile.user_id, aladhanError.message);
// //           continue;
// //         }

// //         // ==========================================
// //         // 3. FIVE PRAYER NOTIFICATIONS — exact + 1 min
// //         // ==========================================
// //         if (hitPrayer(userMin.fajr) && allowed('fajr')) {
// //           payload = {
// //             title: '🕌 Fajr Prayer',
// //             body: 'Time for Fajr. Begin your day with prayer.',
// //             prayer: 'fajr',
// //             kind: 'time'
// //           };
// //           notificationKey = `fajr-${today}`;

// //         } else if (hitPrayer(userMin.dhuhr) && allowed('dhuhr')) {
// //           payload = {
// //             title: '🕌 Dhuhr Prayer',
// //             body: 'Time for Dhuhr. Take a break and reconnect with Allah.',
// //             prayer: 'dhuhr',
// //             kind: 'time'
// //           };
// //           notificationKey = `dhuhr-${today}`;

// //         } else if (hitPrayer(userMin.asr) && allowed('asr')) {
// //           payload = {
// //             title: '🕌 Asr Prayer',
// //             body: 'Time for Asr. Pause your day to remember Him.',
// //             prayer: 'asr',
// //             kind: 'time'
// //           };
// //           notificationKey = `asr-${today}`;

// //         } else if (hitPrayer(userMin.maghrib) && allowed('maghrib')) {
// //           payload = {
// //             title: '🕌 Maghrib Prayer',
// //             body: 'Time for Maghrib. The sun has set, time to pray.',
// //             prayer: 'maghrib',
// //             kind: 'time'
// //           };
// //           notificationKey = `maghrib-${today}`;

// //         } else if (hitPrayer(userMin.isha) && allowed('isha')) {
// //           payload = {
// //             title: '🕌 Isha Prayer',
// //             body: 'Time for Isha. End your day with prayer and peace.',
// //             prayer: 'isha',
// //             kind: 'time'
// //           };
// //           notificationKey = `isha-${today}`;
// //         }

// //         // ==========================================
// //         // 4. PRAYER CHECK — exact + 1 min (same as prayers)
// //         // ==========================================
// //         if (!payload && hitPrayer(plus30(userMin.fajr)) && allowed('fajr')) {
// //           payload = {
// //             title: '🕌 Fajr Check',
// //             body: 'Did you offer Fajr? Tap to log your prayer now.',
// //             prayer: 'fajr',
// //             kind: 'check'
// //           };
// //           notificationKey = `fajr-check-${today}`;

// //         } else if (!payload && hitPrayer(plus30(userMin.dhuhr)) && allowed('dhuhr')) {
// //           payload = {
// //             title: '🕌 Dhuhr Check',
// //             body: 'Did you offer Dhuhr? Tap to log your prayer now.',
// //             prayer: 'dhuhr',
// //             kind: 'check'
// //           };
// //           notificationKey = `dhuhr-check-${today}`;

// //         } else if (!payload && hitPrayer(plus30(userMin.asr)) && allowed('asr')) {
// //           payload = {
// //             title: '🕌 Asr Check',
// //             body: 'Did you offer Asr? Tap to log your prayer now.',
// //             prayer: 'asr',
// //             kind: 'check'
// //           };
// //           notificationKey = `asr-check-${today}`;

// //         } else if (!payload && hitPrayer(plus30(userMin.maghrib)) && allowed('maghrib')) {
// //           payload = {
// //             title: '🕌 Maghrib Check',
// //             body: 'Did you offer Maghrib? Tap to log your prayer now.',
// //             prayer: 'maghrib',
// //             kind: 'check'
// //           };
// //           notificationKey = `maghrib-check-${today}`;

// //         } else if (!payload && hitPrayer(plus30(userMin.isha)) && allowed('isha')) {
// //           payload = {
// //             title: '🕌 Isha Check',
// //             body: 'Did you offer Isha? Tap to log your prayer now.',
// //             prayer: 'isha',
// //             kind: 'check'
// //           };
// //           notificationKey = `isha-check-${today}`;
// //         }

// //         // ==========================================
// //         // 5. MORNING ADHKAR — 07:00 exact
// //         // ==========================================
// //         if (!payload && hitExact(7 * 60) && allowed('adhkar')) {
// //           payload = {
// //             title: '🌅 Morning Adhkar',
// //             body: 'Start your day with the remembrance of Allah.'
// //           };
// //           notificationKey = `morning-adhkar-${today}`;
// //         }

// //         // ==========================================
// //         // 6. EVENING ADHKAR — 18:00 exact
// //         // ==========================================
// //         if (!payload && hitExact(7 * 60 + 50) && allowed('adhkar')) {
// //           payload = {
// //             title: '🌇 Evening Adhkar',
// //             body: 'Take a moment to remember Allah before the day ends.'
// //           };
// //           notificationKey = `evening-adhkar-${today}`;
// //         }

// //         // ==========================================
// //         // 7. QURAN — 20:00 exact
// //         // ==========================================
// //         if (!payload && hitExact(20 * 60) && allowed('quran')) {
// //           payload = {
// //             title: '📖 Qur\'an Reminder',
// //             body: 'A moment with the Qur\'an brings peace.'
// //           };
// //           notificationKey = `quran-${today}`;
// //         }

// //         // ==========================================
// //         // 8. BIRTHDAY — 09:00 exact, only on birthday
// //         // ==========================================
// //         if (!payload && hitExact(9 * 60) && settings.birthday && allowed('birthday')) {
// //           try {
// //             const [, birthdayMonth, birthdayDay] =
// //               String(settings.birthday).split('-').map(Number);

// //             if (birthdayMonth === local.month && birthdayDay === local.day) {
// //               payload = {
// //                 title: '🎂 Happy Birthday',
// //                 body: 'May Allah bless your year ahead. Take a moment for gratitude today.'
// //               };
// //               notificationKey = `birthday-${today}`;
// //             }

// //           } catch (birthdayError) {
// //             console.error('Invalid birthday value:', profile.user_id, birthdayError);
// //           }
// //         }

// //         // ==========================================
// //         // 9. SEND
// //         // ==========================================
// //         if (payload && notificationKey) {
// //           const delivered = await sendUserNotification(
// //             profile.user_id,
// //             payload,
// //             notificationKey
// //           );

// //           if (delivered) {
// //             sentCount++;
// //           }
// //         }

// //       } catch (profileError) {
// //         console.error('Error processing profile:', profile.user_id, profileError.message);
// //       }
// //     }

// //     // ==========================================
// //     // RESPONSE
// //     // ==========================================
// //     if (sentCount > 0) {
// //       return res.status(200).send(`Sent ${sentCount} notifications.`);
// //     }

// //     return res.status(200).send('No notifications to send right now.');

// //   } catch (error) {
// //     console.error('Notification handler failed:', error);
// //     return res.status(500).send('Error: ' + error.message);
// //   }
// // }

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
// function pad(n) { return String(n).padStart(2, '0'); }
// function dateStr(d) { return `${d.year}-${pad(d.month)}-${pad(d.day)}`; }

// function localPartsFor(timeZone, at) {
//   const parts = new Intl.DateTimeFormat('en-CA', {
//     timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
//     hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
//   }).formatToParts(at);

//   const values = {};
//   for (const part of parts) {
//     if (part.type !== 'literal') values[part.type] = Number(part.value);
//   }
//   return { year: values.year, month: values.month, day: values.day, minutes: values.hour * 60 + values.minute };
// }

// function timeStringToMinutes(value) {
//   if (!value) return 0;
//   const clean = String(value).trim().split(' ')[0];
//   const [hours, minutes] = clean.split(':').map(Number);
//   if (Number.isNaN(hours) || Number.isNaN(minutes)) return 0;
//   return ((hours * 60 + minutes) % 1440 + 1440) % 1440;
// }

// // ==========================================
// // 1-MINUTE SAFE WINDOW
// // ==========================================
// function isWithinOneMinuteWindow(targetMinute, currentMinute) {
//   const target = ((targetMinute % 1440) + 1440) % 1440;
//   const diff = (currentMinute - target + 1440) % 1440;
//   return diff === 0 || diff === 1;
// }

// // ==========================================
// // ALADHAN — PRAYER TIMES
// // ==========================================
// const METHOD_MAP = { MWL: 3, ISNA: 2, EGYPT: 5, KARACHI: 1, UMMALQURA: 4 };

// async function getAladhanTimings(lat, lng, tzName, calcMethod, asrMethod, localDate) {
//   const dd = pad(localDate.day);
//   const mm = pad(localDate.month);
//   const yyyy = localDate.year;
//   const methodId = METHOD_MAP[calcMethod] || 3;
//   const school = asrMethod === 'hanafi' ? 1 : 0;

//   const url = `https://api.aladhan.com/v1/timings/${dd}-${mm}-${yyyy}?latitude=${lat}&longitude=${lng}&method=${methodId}&school=${school}&timezonestring=${encodeURIComponent(tzName)}`;
//   const response = await fetch(url);

//   if (!response.ok) throw new Error(`AlAdhan HTTP ${response.status}`);
//   const json = await response.json();
//   if (!json || !json.data || !json.data.timings) throw new Error('AlAdhan invalid');

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
// // PUSH SENDER
// // ==========================================
// async function sendUserNotification(userId, payload, notificationKey) {
//   const dedupeKey = `${userId}:${notificationKey}`;

//   const { data: existing, error: checkError } = await supabase.from('app_state').select('value').eq('key', dedupeKey).maybeSingle();
//   if (checkError || existing) return false;

//   const { data: subscriptions, error: subscriptionError } = await supabase.from('push_subscriptions').select('subscription').eq('user_id', userId);
//   if (subscriptionError || !subscriptions || subscriptions.length === 0) return false;

//   const finalPayload = { ...payload, icon: '/Deensphere_app_icon.png', url: '/' };
//   let delivered = false;

//   for (const row of subscriptions) {
//     try {
//       await webpush.sendNotification(row.subscription, JSON.stringify(finalPayload), { TTL: 60 });
//       delivered = true;
//     } catch (error) {
//       if (error.statusCode === 410 || error.statusCode === 404) {
//         await supabase.from('push_subscriptions').delete().eq('user_id', userId).eq('subscription', row.subscription);
//       }
//     }
//   }

//   if (!delivered) return false;

//   await supabase.from('app_state').upsert({ key: dedupeKey, value: 'sent' });
//   return true;
// }

// // ==========================================
// // NEWS
// // ==========================================
// async function handleNews(profiles) {
//   try {
//     const r = await fetch('https://deensphere1922.vercel.app/api/news');
//     if (!r.ok) return 0;
//     const data = await r.json();
//     if (!Array.isArray(data?.items) || data.items.length === 0) return 0;

//     const latest = data.items[0];
//     const articleId = latest.id || latest.link;
//     if (!articleId) return 0;

//     let count = 0;
//     for (const profile of profiles) {
//       const settings = profile.value || {};
//       if (settings.notif && settings.notif.news === false) continue;

//       const userKey = `seen_news:${profile.user_id}`;
//       const { data: row } = await supabase.from('app_state').select('value').eq('key', userKey).maybeSingle();
      
//       let seen = [];
//       if (row?.value) { try { seen = JSON.parse(row.value); } catch { seen = []; } }
//       if (seen.includes(articleId)) continue;

//       const { data: subs } = await supabase.from('push_subscriptions').select('subscription').eq('user_id', profile.user_id);
//       if (!subs || subs.length === 0) continue;

//       const payload = { title: '📰 Ummah Hub Update', body: latest.title, icon: '/Deensphere_app_icon.png', url: latest.link || '/', tag: 'news-update' };
//       let delivered = false;

//       for (const s of subs) {
//         try {
//           await webpush.sendNotification(s.subscription, JSON.stringify(payload), { TTL: 3600 });
//           delivered = true;
//         } catch (e) {
//           if (e.statusCode === 410 || e.statusCode === 404) {
//             await supabase.from('push_subscriptions').delete().eq('user_id', profile.user_id).eq('subscription', s.subscription);
//           }
//         }
//       }

//       if (delivered) {
//         seen.push(articleId);
//         if (seen.length > 100) seen = seen.slice(-100);
//         await supabase.from('app_state').upsert({ key: userKey, value: JSON.stringify(seen) });
//         count++;
//       }
//     }
//     return count;
//   } catch (err) { return 0; }
// }

// // ==========================================
// // MAIN HANDLER
// // ==========================================
// export default async function handler(req, res) {
//   try {
//     const now = new Date();
//     const { data: profiles, error: profilesError } = await supabase.from('user_sync').select('user_id, value').eq('key', 'settings');

//     if (profilesError || !profiles || profiles.length === 0) return res.status(200).send('No user settings found.');

//     let sentCount = 0;
//     sentCount += await handleNews(profiles);

//     for (const profile of profiles) {
//       try {
//         const settings = profile.value || {};
//         if (!settings.location) continue;

//         const lat = settings.location.lat;
//         const lng = settings.location.lng;
//         if (lat == null || lng == null) continue;

//         const calcMethod = settings.calcMethod || 'MWL';
//         const asrMethod = settings.asrMethod || 'standard';
//         const tzName = settings.location.timezone || settings.timezone || 'Asia/Kolkata';

//         let local;
//         try { local = localPartsFor(tzName, now); } catch { continue; }

//         const localDate = { year: local.year, month: local.month, day: local.day };
//         const at = local.minutes;
//         const today = dateStr(localDate);

//         const hit = (targetMinute) => isWithinOneMinuteWindow(targetMinute, at);
//         const allowed = (key) => !settings.notif || settings.notif[key] !== false;

//         let payload = null;
//         let notificationKey = null;

//         let userMin;
//         try { userMin = await getAladhanTimings(lat, lng, tzName, calcMethod, asrMethod, localDate); } catch { continue; }

//         // Helper to generate exact 00-second timestamp based on minute
//         const getTargetTime = (minuteOfDay) => {
//           const h = Math.floor(minuteOfDay / 60);
//           const m = minuteOfDay % 60;
//           return new Date(localDate.year, localDate.month - 1, localDate.day, h, m, 0).getTime();
//         };

//         // Helper to calculate which minute it actually hit (target or target+1)
//         const getExactHitMinute = (targetMinute) => {
//           return at === targetMinute ? targetMinute : targetMinute + 1;
//         };

//         // ==========================================
//         // 3. FIVE PRAYERS
//         // ==========================================
//         if (hit(userMin.fajr) && allowed('fajr')) {
//           const exactMin = getExactHitMinute(userMin.fajr);
//           payload = { title: '🕌 Fajr Prayer', body: 'Time for Fajr. Begin your day with prayer.', prayer: 'fajr', kind: 'time', targetTime: getTargetTime(exactMin) };
//           notificationKey = `fajr-${today}`;
//         } else if (hit(userMin.dhuhr) && allowed('dhuhr')) {
//           const exactMin = getExactHitMinute(userMin.dhuhr);
//           payload = { title: '🕌 Dhuhr Prayer', body: 'Time for Dhuhr. Take a break and reconnect with Allah.', prayer: 'dhuhr', kind: 'time', targetTime: getTargetTime(exactMin) };
//           notificationKey = `dhuhr-${today}`;
//         } else if (hit(userMin.asr) && allowed('asr')) {
//           const exactMin = getExactHitMinute(userMin.asr);
//           payload = { title: '🕌 Asr Prayer', body: 'Time for Asr. Pause your day to remember Him.', prayer: 'asr', kind: 'time', targetTime: getTargetTime(exactMin) };
//           notificationKey = `asr-${today}`;
//         } else if (hit(userMin.maghrib) && allowed('maghrib')) {
//           const exactMin = getExactHitMinute(userMin.maghrib);
//           payload = { title: '🕌 Maghrib Prayer', body: 'Time for Maghrib. The sun has set, time to pray.', prayer: 'maghrib', kind: 'time', targetTime: getTargetTime(exactMin) };
//           notificationKey = `maghrib-${today}`;
//         } else if (hit(userMin.isha) && allowed('isha')) {
//           const exactMin = getExactHitMinute(userMin.isha);
//           payload = { title: '🕌 Isha Prayer', body: 'Time for Isha. End your day with prayer and peace.', prayer: 'isha', kind: 'time', targetTime: getTargetTime(exactMin) };
//           notificationKey = `isha-${today}`;
//         }

//         // ==========================================
//         // 4. CHECKS (Calculated perfectly based on the actual prayer hit minute)
//         // ==========================================
//         if (!payload && hit((userMin.fajr + 30) % 1440) && allowed('fajr')) {
//           const exactMin = getExactHitMinute((userMin.fajr + 30) % 1440);
//           payload = { title: '🕌 Fajr Check', body: 'Did you offer Fajr? Tap to log your prayer now.', prayer: 'fajr', kind: 'check', targetTime: getTargetTime(exactMin) };
//           notificationKey = `fajr-check-${today}`;
//         } else if (!payload && hit((userMin.dhuhr + 30) % 1440) && allowed('dhuhr')) {
//           const exactMin = getExactHitMinute((userMin.dhuhr + 30) % 1440);
//           payload = { title: '🕌 Dhuhr Check', body: 'Did you offer Dhuhr? Tap to log your prayer now.', prayer: 'dhuhr', kind: 'check', targetTime: getTargetTime(exactMin) };
//           notificationKey = `dhuhr-check-${today}`;
//         } else if (!payload && hit((userMin.asr + 30) % 1440) && allowed('asr')) {
//           const exactMin = getExactHitMinute((userMin.asr + 30) % 1440);
//           payload = { title: '🕌 Asr Check', body: 'Did you offer Asr? Tap to log your prayer now.', prayer: 'asr', kind: 'check', targetTime: getTargetTime(exactMin) };
//           notificationKey = `asr-check-${today}`;
//         } else if (!payload && hit((userMin.maghrib + 30) % 1440) && allowed('maghrib')) {
//           const exactMin = getExactHitMinute((userMin.maghrib + 30) % 1440);
//           payload = { title: '🕌 Maghrib Check', body: 'Did you offer Maghrib? Tap to log your prayer now.', prayer: 'maghrib', kind: 'check', targetTime: getTargetTime(exactMin) };
//           notificationKey = `maghrib-check-${today}`;
//         } else if (!payload && hit((userMin.isha + 30) % 1440) && allowed('isha')) {
//           const exactMin = getExactHitMinute((userMin.isha + 30) % 1440);
//           payload = { title: '🕌 Isha Check', body: 'Did you offer Isha? Tap to log your prayer now.', prayer: 'isha', kind: 'check', targetTime: getTargetTime(exactMin) };
//           notificationKey = `isha-check-${today}`;
//         }

//         // ==========================================
//         // 5. ADHKAR / QURAN / BIRTHDAY (00-Sec Exact Timer)
//         // ==========================================
//         if (!payload && hit(7 * 60) && allowed('adhkar')) {
//           const exactMin = getExactHitMinute(7 * 60);
//           payload = { title: '🌅 Morning Adhkar', body: 'Start your day with the remembrance of Allah.', targetTime: getTargetTime(exactMin) };
//           notificationKey = `morning-adhkar-${today}`;
//         }

//         if (!payload && hit(18 * 60) && allowed('adhkar')) {
//           const exactMin = getExactHitMinute(18 * 60);
//           payload = { title: '🌇 Evening Adhkar', body: 'Take a moment to remember Allah before the day ends.', targetTime: getTargetTime(exactMin) };
//           notificationKey = `evening-adhkar-${today}`;
//         }

//         if (!payload && hit(20 * 60) && allowed('quran')) {
//           const exactMin = getExactHitMinute(20 * 60);
//           payload = { title: '📖 Qur\'an Reminder', body: 'A moment with the Qur\'an brings peace.', targetTime: getTargetTime(exactMin) };
//           notificationKey = `quran-${today}`;
//         }

//         if (!payload && hit(9 * 60) && settings.birthday && allowed('birthday')) {
//           try {
//             const [, birthdayMonth, birthdayDay] = String(settings.birthday).split('-').map(Number);
//             if (birthdayMonth === local.month && birthdayDay === local.day) {
//               const exactMin = getExactHitMinute(9 * 60);
//               payload = { title: '🎂 Happy Birthday', body: 'May Allah bless your year ahead. Take a moment for gratitude today.', targetTime: getTargetTime(exactMin) };
//               notificationKey = `birthday-${today}`;
//             }
//           } catch {}
//         }

//         // 9. SEND
//         if (payload && notificationKey) {
//           const delivered = await sendUserNotification(profile.user_id, payload, notificationKey);
//           if (delivered) sentCount++;
//         }

//       } catch (profileError) { }
//     }

//     if (sentCount > 0) return res.status(200).send(`Sent ${sentCount} notifications.`);
//     return res.status(200).send('No notifications to send right now.');
//   } catch (error) {
//     return res.status(500).send('Error: ' + error.message);
//   }
// }

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
      await webpush.sendNotification(row.subscription, JSON.stringify(finalPayload), { TTL: 60 });
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

        let payload = null;
        let notificationKey = null;

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

        // ==========================================
        // 3. FIVE PRAYERS (Instant / 1-min safe window)
        // ==========================================
        if (hit(userMin.fajr) && allowed('fajr')) {
          const exactMin = getExactHitMinute(userMin.fajr);
          payload = { title: '🕌 Fajr Prayer', body: 'Time for Fajr. Begin your day with prayer.', prayer: 'fajr', kind: 'time', targetTime: getTargetTime(exactMin) };
          notificationKey = `fajr-${today}`;
        } else if (hit(userMin.dhuhr) && allowed('dhuhr')) {
          const exactMin = getExactHitMinute(userMin.dhuhr);
          payload = { title: '🕌 Dhuhr Prayer', body: 'Time for Dhuhr. Take a break and reconnect with Allah.', prayer: 'dhuhr', kind: 'time', targetTime: getTargetTime(exactMin) };
          notificationKey = `dhuhr-${today}`;
        } else if (hit(userMin.asr) && allowed('asr')) {
          const exactMin = getExactHitMinute(userMin.asr);
          payload = { title: '🕌 Asr Prayer', body: 'Time for Asr. Pause your day to remember Him.', prayer: 'asr', kind: 'time', targetTime: getTargetTime(exactMin) };
          notificationKey = `asr-${today}`;
        } else if (hit(userMin.maghrib) && allowed('maghrib')) {
          const exactMin = getExactHitMinute(userMin.maghrib);
          payload = { title: '🕌 Maghrib Prayer', body: 'Time for Maghrib. The sun has set, time to pray.', prayer: 'maghrib', kind: 'time', targetTime: getTargetTime(exactMin) };
          notificationKey = `maghrib-${today}`;
        } else if (hit(userMin.isha) && allowed('isha')) {
          const exactMin = getExactHitMinute(userMin.isha);
          payload = { title: '🕌 Isha Prayer', body: 'Time for Isha. End your day with prayer and peace.', prayer: 'isha', kind: 'time', targetTime: getTargetTime(exactMin) };
          notificationKey = `isha-${today}`;
        }

        // ==========================================
        // 4. CHECKS (Instant / 1-min safe window)
        // ==========================================
        if (!payload && hit((userMin.fajr + 30) % 1440) && allowed('fajr')) {
          const exactMin = getExactHitMinute((userMin.fajr + 30) % 1440);
          payload = { title: '🕌 Fajr Check', body: 'Did you offer Fajr? Tap to log your prayer now.', prayer: 'fajr', kind: 'check', targetTime: getTargetTime(exactMin) };
          notificationKey = `fajr-check-${today}`;
        } else if (!payload && hit((userMin.dhuhr + 30) % 1440) && allowed('dhuhr')) {
          const exactMin = getExactHitMinute((userMin.dhuhr + 30) % 1440);
          payload = { title: '🕌 Dhuhr Check', body: 'Did you offer Dhuhr? Tap to log your prayer now.', prayer: 'dhuhr', kind: 'check', targetTime: getTargetTime(exactMin) };
          notificationKey = `dhuhr-check-${today}`;
        } else if (!payload && hit((userMin.asr + 30) % 1440) && allowed('asr')) {
          const exactMin = getExactHitMinute((userMin.asr + 30) % 1440);
          payload = { title: '🕌 Asr Check', body: 'Did you offer Asr? Tap to log your prayer now.', prayer: 'asr', kind: 'check', targetTime: getTargetTime(exactMin) };
          notificationKey = `asr-check-${today}`;
        } else if (!payload && hit((userMin.maghrib + 30) % 1440) && allowed('maghrib')) {
          const exactMin = getExactHitMinute((userMin.maghrib + 30) % 1440);
          payload = { title: '🕌 Maghrib Check', body: 'Did you offer Maghrib? Tap to log your prayer now.', prayer: 'maghrib', kind: 'check', targetTime: getTargetTime(exactMin) };
          notificationKey = `maghrib-check-${today}`;
        } else if (!payload && hit((userMin.isha + 30) % 1440) && allowed('isha')) {
          const exactMin = getExactHitMinute((userMin.isha + 30) % 1440);
          payload = { title: '🕌 Isha Check', body: 'Did you offer Isha? Tap to log your prayer now.', prayer: 'isha', kind: 'check', targetTime: getTargetTime(exactMin) };
          notificationKey = `isha-check-${today}`;
        }

        // ==========================================
        // 5. ADHKAR / QURAN / BIRTHDAY (Early Payload + 00-Sec Timer)
        // ==========================================

        // Morning Adhkar: Server hits at 06:59, phone shows exactly at 07:00
        if (!payload && hit(7 * 60 - 1) && allowed('adhkar')) {
          payload = { title: '🌅 Morning Adhkar', body: 'Start your day with the remembrance of Allah.', targetTime: getTargetTime(7 * 60) };
          notificationKey = `morning-adhkar-${today}`;
        }

        // Evening Adhkar: Server hits at 08:23, phone shows exactly at 08:24
        if (!payload && hit(8 * 60 + 24 - 1) && allowed('adhkar')) {
          payload = { title: '🌇 Evening Adhkar', body: 'Take a moment to remember Allah before the day ends.', targetTime: getTargetTime(8 * 60 + 24) };
          notificationKey = `evening-adhkar-${today}`;
        }

        // Quran: Server hits at 19:59, phone shows exactly at 20:00
        if (!payload && hit(20 * 60 - 1) && allowed('quran')) {
          payload = { title: '📖 Qur\'an Reminder', body: 'A moment with the Qur\'an brings peace.', targetTime: getTargetTime(20 * 60) };
          notificationKey = `quran-${today}`;
        }

        // Birthday: Server hits at 08:59, phone shows exactly at 09:00
        if (!payload && hit(9 * 60 - 1) && settings.birthday && allowed('birthday')) {
          try {
            const [, birthdayMonth, birthdayDay] = String(settings.birthday).split('-').map(Number);
            if (birthdayMonth === local.month && birthdayDay === local.day) {
              payload = { title: '🎂 Happy Birthday', body: 'May Allah bless your year ahead. Take a moment for gratitude today.', targetTime: getTargetTime(9 * 60) };
              notificationKey = `birthday-${today}`;
            }
          } catch {}
        }

        // 9. SEND
        if (payload && notificationKey) {
          const delivered = await sendUserNotification(profile.user_id, payload, notificationKey);
          if (delivered) sentCount++;
        }

      } catch (profileError) { }
    }

    if (sentCount > 0) return res.status(200).send(`Sent ${sentCount} notifications.`);
    return res.status(200).send('No notifications to send right now.');
  } catch (error) {
    return res.status(500).send('Error: ' + error.message);
  }
}
