// Fire-and-forget delivery to Expo's push gateway. Deliberately isolated
// from the in-app Notification row: a booking/payment status change must
// never fail (or even slow down) because a push token is stale or Expo's
// endpoint is unreachable — the in-app record is the source of truth,
// remote push is best-effort on top of it.
export async function sendExpoPushBestEffort(pushToken: string, title: string, body: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ to: pushToken, title, body }),
        signal: controller.signal,
      });
      const payload = await response.json() as { data?: { status?: string; id?: string } };
      return response.ok && payload.data?.status === 'ok' ? payload.data.id ?? null : null;
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    // Swallow: network failures / invalid tokens must not surface to the
    // caller (see comment above).
    return null;
  }
}
