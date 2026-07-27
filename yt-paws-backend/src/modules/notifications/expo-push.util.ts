// Fire-and-forget delivery to Expo's push gateway. Deliberately isolated
// from the in-app Notification row: a booking/payment status change must
// never fail (or even slow down) because a push token is stale or Expo's
// endpoint is unreachable — the in-app record is the source of truth,
// remote push is best-effort on top of it.
export async function sendExpoPushBestEffort(pushToken: string, title: string, body: string) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ to: pushToken, title, body }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    // Swallow: network failures / invalid tokens must not surface to the
    // caller (see comment above).
  }
}
