/**
 * OPTIONAL: Cloudflare Worker that serves the Instagram feed to the website
 * without exposing your access token, and keeps the token refreshed.
 *
 * Use this INSTEAD of a third-party feed service (Behold etc.).
 * Full steps are in README.md ("Option B").
 *
 * Bindings you need to create in Cloudflare:
 *   - KV namespace bound as  IG_KV
 *   - Secret  IG_TOKEN        (your first long-lived Instagram access token)
 *   - Var     ALLOW_ORIGIN    (e.g. https://brickslayers.co.nz  - your site's address)
 *   - Cron trigger, e.g. "0 3 * * 1" (weekly) to refresh the token before it expires
 *
 * Then paste this Worker's URL into  feed.url  in js/config.js.
 *
 * NOTE: Written against Instagram's documented API (graph.instagram.com).
 * Meta changes this stuff periodically, so if it stops working check the
 * current Instagram API docs. It has NOT been run against a live account.
 */

const FIELDS = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp';

async function getToken(env) {
  return (await env.IG_KV.get('token')) || env.IG_TOKEN;
}

function cors(env) {
  return {
    'Access-Control-Allow-Origin': env.ALLOW_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Vary': 'Origin'
  };
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors(env) });

    // Edge-cache for 15 minutes so Instagram is barely hit.
    const cache = caches.default;
    const cacheKey = new Request(new URL(request.url).origin + '/feed', request);
    const hit = await cache.match(cacheKey);
    if (hit) return hit;

    const token = await getToken(env);
    if (!token) return new Response('{"error":"no token"}', { status: 500, headers: { ...cors(env), 'Content-Type': 'application/json' } });

    const api = `https://graph.instagram.com/me/media?fields=${FIELDS}&limit=24&access_token=${encodeURIComponent(token)}`;
    const upstream = await fetch(api);
    if (!upstream.ok) {
      return new Response(JSON.stringify({ error: 'instagram', status: upstream.status }), {
        status: 502, headers: { ...cors(env), 'Content-Type': 'application/json' }
      });
    }
    const body = await upstream.text();
    const res = new Response(body, {
      headers: { ...cors(env), 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=900' }
    });
    ctx.waitUntil(cache.put(cacheKey, res.clone()));
    return res;
  },

  // Runs on the cron trigger: swaps the token for a fresh 60-day one.
  async scheduled(event, env, ctx) {
    const token = await getToken(env);
    if (!token) return;
    const r = await fetch(`https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token)}`);
    if (!r.ok) return;
    const j = await r.json();
    if (j.access_token) await env.IG_KV.put('token', j.access_token);
  }
};
