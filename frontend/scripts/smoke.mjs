// Smoke test against a running app: every page under every sign-in state, followed like a
// browser follows redirects. Fails on redirect loops, server errors, pages that never finish,
// or a visitor ending up somewhere they shouldn't (e.g. signed in but bounced to /login).
//
//   node scripts/smoke.mjs <valid session token>      (BASE_URL defaults to http://127.0.0.1:3000)
const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const VALID = process.argv[2];
if (!VALID) throw new Error("Pass a valid session token: node scripts/smoke.mjs <token>");

const PUBLIC = ["/login", "/register", "/forgot-password", "/reset-password", "/privacy"];
const SIGNED_OUT_ONLY = ["/login", "/register"];
const PAGES = [
  "/", "/applications", "/applications?page=999", "/applications?q=zzz&status=offer&sort=company",
  "/applications/999999", "/applications/abc", "/interviews", "/interviews?past_page=99",
  "/interviews?edit=999999", "/interviews?schedule=2026-10-20", "/analytics", "/analytics?period=all",
  "/analytics?period=bogus", "/settings", "/login", "/login?deleted=1", "/register", "/forgot-password",
  "/reset-password?uid=x&token=y", "/privacy",
];
const STATES = { "signed out": null, "stale cookie": "stale-token-from-another-device", "signed in": VALID };

/** Where a visitor in this state should land after all redirects. */
function expectedEnd(path, state) {
  const pathname = path.split("?")[0];
  if (state === "signed in") return SIGNED_OUT_ONLY.includes(pathname) ? "/" : pathname;
  // proxy.ts can't tell a stale cookie from a valid one, so /register first goes via the
  // dashboard, which clears the cookie on /login; the next click on "sign up" works.
  if (state === "stale cookie" && SIGNED_OUT_ONLY.includes(pathname)) return "/login";
  return PUBLIC.includes(pathname) ? pathname : "/login";
}

async function visit(path, cookie) {
  const hops = [];
  let url = BASE + path;
  const jar = new Map(cookie ? [["session", cookie]] : []);
  for (let hop = 0; hop < 6; hop++) {
    const response = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(30_000),
      headers: { cookie: [...jar].map(([name, value]) => `${name}=${value}`).join("; ") },
    });
    for (const header of response.headers.getSetCookie()) {
      const [name, value] = header.split(";")[0].split("=");
      if (value === "" || header.includes("Expires=Thu, 01 Jan 1970")) jar.delete(name);
      else jar.set(name, value);
    }
    const body = response.status >= 300 && response.status < 400 ? "" : await response.text();
    // A redirect thrown inside a streamed <Suspense> arrives as a 200 carrying this marker.
    const location = response.headers.get("location") ?? body.match(/NEXT_REDIRECT;(?:replace|push);([^;]+);/)?.[1];
    hops.push(location ? `${response.status}→${location}` : String(response.status));
    if (response.status >= 500) return { error: "server error", hops };
    if (!location) return { end: new URL(url).pathname, hops };
    url = new URL(location, url).href;
  }
  return { error: "redirect loop", hops };
}

let failures = 0;
for (const [state, cookie] of Object.entries(STATES)) {
  console.log(`\n== ${state}`);
  for (const path of PAGES) {
    const result = await visit(path, cookie).catch((error) => ({ error: error.message, hops: [] }));
    const want = expectedEnd(path, state);
    const problem = result.error ?? (result.end === want ? null : `ended at ${result.end}, expected ${want}`);
    if (problem) failures++;
    console.log(`${problem ? "FAIL" : "ok  "} ${path.padEnd(48)} ${problem ?? result.end} [${result.hops.join(" ")}]`);
  }
}
console.log(`\n${failures} failure(s)`);
process.exit(failures ? 1 : 0);
