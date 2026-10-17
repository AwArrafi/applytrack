// Cloudflare Email Worker: receives mail for *@<INBOUND_EMAIL_DOMAIN> (via Cloudflare Email
// Routing's catch-all rule) and posts each raw email to ApplyTrack's backend.
//
// Setup (once the domain is on Cloudflare):
//   1. Email Routing -> enable for the inbound domain (e.g. inbound.applytrack.id).
//   2. Create this Worker; add secrets API_URL (https://api.<domain>/api) and
//      INBOUND_EMAIL_SECRET (same value as the backend's).
//   3. Email Routing -> Routing rules -> Catch-all -> "Send to a Worker" -> this Worker.

export default {
  async email(message, env) {
    const response = await fetch(`${env.API_URL}/inbound-email/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.INBOUND_EMAIL_SECRET}`,
        "Content-Type": "message/rfc822",
        "X-Envelope-To": message.to,
      },
      body: await new Response(message.raw).arrayBuffer(),
    });
    // Make failures (a wrong secret, the backend down) visible in the Worker's logs.
    if (!response.ok) throw new Error(`ApplyTrack answered ${response.status}`);
  },
};
