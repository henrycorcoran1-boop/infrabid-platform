/**
 * Egis Ireland Project Radar — harvest and the 07:00 email.
 *
 * One function, three jobs, so that "what did it find" and "what did it send"
 * cannot drift apart:
 *
 *   mode 'harvest'  — sweep the news and notice feeds, keep anything naming
 *                     Egis, dedupe it, and try to attach it to a scheme in the
 *                     register. Runs at 05:00 UTC.
 *   mode 'digest'   — email each active subscriber the mentions they have not
 *                     been sent yet. Fired at 06:00 and 07:00 UTC and sends on
 *                     whichever of those is 07:00 in Dublin, so it lands at the
 *                     same local time either side of the DST boundary.
 *   mode 'status'   — what the dashboard shows about itself. No side effects.
 *
 * Nothing is emailed twice: an item is only in the queue while emailed_at is
 * null, and the stamp is written per send. Running the job twice is a no-op.
 *
 * Deploy:
 *   supabase functions deploy egis-radar --no-verify-jwt --project-ref uksvfvhikjjznjhfesjc
 * Secrets are the ones the tender digest already uses — RESEND_API_KEY, and
 * DIGEST_FROM for the sender. Job auth reuses the vault's digest_key.
 *
 * The watch terms live in internal_config under 'egis_watch_terms' (comma
 * separated). Egis grows by acquisition, so the name to watch for in Ireland
 * can change without this file changing.
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

type Admin = ReturnType<typeof createClient>;

const SITE = 'https://henrycorcoran1-boop.github.io/infrabid-platform';
const RADAR_URL = `${SITE}/egis-radar.html`;

/** Always watched. internal_config.egis_watch_terms adds to this, never replaces it. */
const BASE_TERMS = ['egis'];

/** Google News queries. Each is independent — one failing does not stop the sweep. */
const NEWS_QUERIES = [
  '"Egis" Ireland roads',
  '"Egis" Ireland transport',
  '"Egis" Ireland infrastructure',
  '"Egis Group" Ireland',
  '"Egis" engineering consultancy Ireland',
  '"Egis" Northern Ireland roads',
  '"Egis" TII OR "Transport Infrastructure Ireland"',
  '"Egis" "National Transport Authority"',
];

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-digest-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'content-type': 'application/json' } });
}

function dublinHour(now = new Date()): number {
  return Number(new Intl.DateTimeFormat('en-IE', { hour: 'numeric', hour12: false, timeZone: 'Europe/Dublin' }).format(now));
}

function esc(x: string): string {
  return String(x ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);
}

/** RSS carries entity-encoded markup inside CDATA. Unwrap both before storing. */
function decodeEntities(s: string): string {
  return String(s ?? '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function tag(block: string, name: string): string {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'));
  return m ? decodeEntities(m[1]) : '';
}

/**
 * Fingerprint on the normalised URL, not the title: the same story syndicated
 * under two headlines is one item, and tracking parameters are not identity.
 */
async function fingerprint(url: string, title: string): Promise<string> {
  let key = url;
  try {
    const u = new URL(url);
    u.hash = '';
    for (const p of [...u.searchParams.keys()]) {
      if (/^(utm_|fbclid|gclid|oc$|hl$|gl$|ceid$)/i.test(p)) u.searchParams.delete(p);
    }
    key = `${u.host}${u.pathname}${u.search}`.toLowerCase();
  } catch {
    key = url.toLowerCase();
  }
  const seed = key.length > 12 ? key : `${key}|${title.toLowerCase().slice(0, 80)}`;
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(seed));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 40);
}

interface Item {
  title: string;
  url: string;
  summary: string;
  publisher: string;
  source_type: string;
  published_on: string | null;
}

function parseRss(xml: string, sourceType: string): Item[] {
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) ?? [];
  const out: Item[] = [];
  for (const b of blocks) {
    const title = tag(b, 'title');
    const linkMatch = b.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
    const url = linkMatch ? decodeEntities(linkMatch[1]) : '';
    if (!title || !url) continue;
    const pub = tag(b, 'pubDate');
    let published_on: string | null = null;
    if (pub) {
      const d = new Date(pub);
      if (!Number.isNaN(d.getTime())) published_on = d.toISOString().slice(0, 10);
    }
    const srcMatch = b.match(/<source[^>]*>([\s\S]*?)<\/source>/i);
    out.push({
      title,
      url,
      summary: tag(b, 'description').slice(0, 600),
      publisher: srcMatch ? decodeEntities(srcMatch[1]) : 'Google News',
      source_type: sourceType,
      published_on,
    });
  }
  return out;
}

/** Significant tokens from a scheme name, used to attach a story to a project. */
function schemeTokens(name: string): string[] {
  return String(name ?? '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 3 && !['road','scheme','project','the','and','for','bypass','phase','route','link'].includes(t));
}

/** Road designations (n2, m20, r132) are short but highly identifying. */
function designations(name: string): string[] {
  return (String(name ?? '').toLowerCase().match(/\b[nmr]\d{1,3}\b/g) ?? []);
}

/** TED returns multilingual values as {eng:[...]} or nested arrays. Flatten to text. */
function flattenTed(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (Array.isArray(v)) return v.map(flattenTed).filter(Boolean).join(' | ');
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return flattenTed(o.eng ?? Object.values(o)[0]);
  }
  return String(v);
}

/** Egis is a global group, so most news naming it is not Irish. */
const IRELAND_RE =
  /\b(ireland|irish|dublin|cork|galway|limerick|waterford|belfast|donegal|kerry|mayo|louth|monaghan|kildare|meath|wicklow|tii|transport infrastructure ireland|national transport authority|iarnr[o\u00f3]d|busconnects|metrolink|luas|dart\+|an coimisi[u\u00fa]n|jb barry|j\.b\. barry)\b/i;

async function harvest(admin: Admin, terms: string[]): Promise<Record<string, unknown>> {
  const failures: string[] = [];
  const collected: Item[] = [];

  for (const q of NEWS_QUERIES) {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-IE&gl=IE&ceid=IE:en`;
    try {
      const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; EgisRadar/1.0)' } });
      if (!res.ok) {
        failures.push(`news "${q}": HTTP ${res.status}`);
        continue;
      }
      collected.push(...parseRss(await res.text(), 'News'));
    } catch (e) {
      failures.push(`news "${q}": ${(e as Error).message}`);
    }
  }

  // TED, for Irish contract and award notices naming Egis.
  //
  // The country clause must be organisation-country-buyer. TED silently ignores
  // a filter it cannot parse rather than erroring, so an invalid clause does not
  // fail — it quietly returns every Egis notice on earth. That is how the first
  // run of this job stamped a Belgian water notice as an Irish Egis mention.
  // There are only ~10 Irish notices naming Egis in total, so one page is the
  // whole result set and no sorting is needed (the API rejects sort params).
  try {
    const res = await fetch('https://api.ted.europa.eu/v3/notices/search', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query: 'FT~"Egis" AND organisation-country-buyer IN (IRL)',
        fields: ['publication-number', 'notice-title', 'publication-date', 'buyer-name', 'organisation-name-tenderer'],
        limit: 100,
        scope: 'ALL',
      }),
    });
    if (res.ok) {
      const data = (await res.json()) as { notices?: Array<Record<string, unknown>> };
      for (const n of data.notices ?? []) {
        const num = String(n['publication-number'] ?? '');
        if (!num) continue;
        const title = flattenTed(n['notice-title']) || 'TED notice';
        const buyer = flattenTed(n['buyer-name']);
        const tenderers = flattenTed(n['organisation-name-tenderer']);
        collected.push({
          title: `TED ${num}: ${title}`.slice(0, 400),
          url: `https://ted.europa.eu/en/notice/-/detail/${num}`,
          summary: [buyer && `Buyer: ${buyer}`, tenderers && `Tenderers: ${tenderers}`]
            .filter(Boolean)
            .join(' \u2014 ')
            .slice(0, 600),
          publisher: 'Tenders Electronic Daily',
          source_type: 'TED',
          published_on: n['publication-date'] ? String(n['publication-date']).slice(0, 10) : null,
        });
      }
    } else {
      failures.push(`TED: HTTP ${res.status}`);
    }
  } catch (e) {
    failures.push(`TED: ${(e as Error).message}`);
  }

  // Attach to a scheme where the story clearly names one.
  const { data: projects } = await admin.from('egis_projects').select('id,name,slug');
  const index = ((projects ?? []) as Array<{ id: string; name: string; slug: string }>).map((p) => ({
    id: p.id,
    tokens: schemeTokens(p.name),
    codes: designations(p.name),
  }));

  const termRe = new RegExp(`\\b(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'i');

  let inserted = 0;
  let egisHits = 0;
  for (const it of collected) {
    const hay = `${it.title} ${it.summary}`;
    const matched = hay.match(termRe);
    // A TED row is already an Egis full-text hit on an Irish notice by
    // construction of the query, so it needs no second test.
    const mentions = Boolean(matched) || it.source_type === 'TED';
    const irish = it.source_type === 'TED' || IRELAND_RE.test(hay);
    if (mentions) egisHits += 1;

    let project_id: string | null = null;
    const lower = hay.toLowerCase();
    for (const p of index) {
      const codeHit = p.codes.some((c) => new RegExp(`\\b${c}\\b`, 'i').test(lower));
      const tokenHits = p.tokens.filter((t) => lower.includes(t)).length;
      if ((codeHit && tokenHits >= 1) || tokenHits >= 2) {
        project_id = p.id;
        break;
      }
    }

    const fp = await fingerprint(it.url, it.title);
    const { error } = await admin.from('egis_feed_items').upsert(
      {
        fingerprint: fp,
        title: it.title.slice(0, 400),
        url: it.url,
        summary: it.summary || null,
        publisher: it.publisher || null,
        source_type: it.source_type,
        published_on: it.published_on,
        mentions_egis: mentions,
        ireland_related: irish,
        project_id,
        matched_terms: matched ? [matched[0].toLowerCase()] : [],
      },
      { onConflict: 'fingerprint', ignoreDuplicates: true },
    );
    if (!error) inserted += 1;
  }

  const detail = { queries: NEWS_QUERIES.length, collected: collected.length, egisHits, failures };
  await admin.from('egis_digest_runs').insert({ kind: 'harvest', items_found: collected.length, emails_sent: 0, detail });
  return { collected: collected.length, upserted: inserted, egisHits, failures };
}

interface Sub {
  user_id: string;
  email: string;
  include_egis_mentions: boolean;
  send_hour_dublin: number;
}

interface FeedRow {
  id: string;
  title: string;
  url: string;
  summary: string | null;
  publisher: string | null;
  source_type: string;
  published_on: string | null;
  ireland_related?: boolean;
}

/**
 * The message. Table-based and inline-styled because that is what mail clients
 * render, and in the same house as the existing 7am tender email so the two
 * read as one product rather than two.
 */
function html(items: FeedRow[]): string {
  const FONT = "'Avenir Next', 'Segoe UI', Helvetica, Arial, sans-serif";
  const today = new Date().toLocaleDateString('en-IE', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Dublin' });
  const rows = items
    .map(
      (t, i) => `
      <tr><td style="padding:18px 0;${i ? 'border-top:1px solid #dbe2ec;' : ''}font-family:${FONT};">
        <a href="${esc(t.url)}" style="font-size:17px;line-height:24px;font-weight:700;color:#10233f;text-decoration:none;">${esc(t.title)}</a>
        ${t.summary ? `<div style="margin-top:6px;font-size:14px;line-height:21px;color:#46566d;">${esc(t.summary.slice(0, 240))}</div>` : ''}
        <div style="margin-top:8px;">
          <span style="display:inline-block;padding:3px 9px;border-radius:999px;background:#eef5ff;color:#0f4a92;font-size:12px;font-weight:700;">${esc(t.source_type)}</span>
          ${t.ireland_related ? '<span style="display:inline-block;padding:3px 9px;border-radius:999px;background:#e8f7ef;color:#0b6b43;font-size:12px;font-weight:700;">Ireland</span>' : ''}
          ${t.publisher ? `<span style="display:inline-block;padding:3px 9px;border-radius:999px;background:#f5f7fb;color:#46566d;font-size:12px;font-weight:600;">${esc(t.publisher)}</span>` : ''}
          ${t.published_on ? `<span style="display:inline-block;padding:3px 9px;border-radius:999px;background:#f5f7fb;color:#46566d;font-size:12px;font-weight:600;">${esc(t.published_on)}</span>` : ''}
        </div>
        <div style="margin-top:8px;font-size:13px;"><a href="${esc(t.url)}" style="color:#0f4a92;font-weight:700;text-decoration:none;">Read the source &rarr;</a></div>
      </td></tr>`,
    )
    .join('');

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"><title>Egis radar</title>
<style>body{margin:0;padding:0;background:#f5f7fb;}table{border-collapse:collapse;}@media (max-width:620px){.container{width:100% !important;}.pad{padding-left:24px !important;padding-right:24px !important;}}</style>
</head>
<body style="margin:0;padding:0;background:#f5f7fb;">
<div style="display:none;font-size:1px;color:#f5f7fb;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${items.length} new Egis mention${items.length === 1 ? '' : 's'} in Irish roads and transport.&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fb;"><tr><td align="center" style="padding:32px 16px;">
  <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;">
    <tr><td style="background:#111832;border-top:5px solid #f4c430;border-radius:14px 14px 0 0;padding:26px 36px;" class="pad">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr>
        <td style="vertical-align:middle;font-family:${FONT};">
          <div style="font-size:22px;font-weight:800;letter-spacing:-0.02em;line-height:1;color:#ffffff;">Egis <span style="color:#f4c430;">Radar</span></div>
          <div style="margin-top:7px;padding-top:6px;border-top:2px solid #f4c430;font-size:9px;font-weight:700;letter-spacing:0.22em;color:rgba(255,255,255,0.85);">ROADS &amp; URBAN TRANSPORT &middot; IRELAND</div>
        </td>
        <td style="vertical-align:middle;text-align:right;font-family:${FONT};font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#f4c430;">Daily</td>
      </tr></table>
    </td></tr>
    <tr><td style="background:#ffffff;padding:32px 36px 8px;font-family:${FONT};" class="pad">
      <div style="font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#68768a;">${esc(today)}</div>
      <h1 style="margin:8px 0 6px;font-size:27px;line-height:34px;font-weight:800;letter-spacing:-0.02em;color:#10233f;">${items.length} new Egis mention${items.length === 1 ? '' : 's'}</h1>
      <p style="margin:0 0 6px;font-size:14px;line-height:22px;color:#46566d;">Roads, highways and urban transport on the island of Ireland. Everything below names Egis in the headline or the notice.</p>
    </td></tr>
    <tr><td style="background:#ffffff;padding:8px 36px 12px;" class="pad">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
    </td></tr>
    <tr><td style="background:#ffffff;padding:8px 36px 34px;border-radius:0 0 14px 14px;font-family:${FONT};" class="pad">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:10px;background:#0f4a92;">
        <a href="${RADAR_URL}" style="display:inline-block;padding:14px 26px;font-family:${FONT};font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">Open the project radar</a>
      </td></tr></table>
    </td></tr>
    <tr><td style="padding:22px 36px 0;font-family:${FONT};font-size:12px;line-height:19px;color:#68768a;" class="pad">
      <p style="margin:0 0 8px;">You get this at 7am on mornings when something new names Egis. Silence means nothing new was found, not that the sweep failed.</p>
      <p style="margin:0;">Sources are Google News and Tenders Electronic Daily. Neither is exhaustive — treat the radar as a prompt to look, not as the record.</p>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;
}

async function sendDigest(
  admin: Admin,
  resendKey: string,
  from: string,
  only: string | null,
): Promise<Record<string, unknown>> {
  // Only recent unsent items. An item that ages out of this window is never
  // emailed — correct for a daily digest, and it stops a first run or an
  // outage from producing a hundred-item catch-up message.
  const since = new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString();
  const { data: itemsRaw, error: feedErr } = await admin
    .from('egis_feed_items')
    .select('id,title,url,summary,publisher,source_type,published_on,ireland_related')
    .eq('mentions_egis', true)
    .is('emailed_at', null)
    .gte('discovered_at', since)
    .order('ireland_related', { ascending: false })
    .order('published_on', { ascending: false, nullsFirst: false })
    .limit(25);
  if (feedErr) return { error: feedErr.message };
  const items = (itemsRaw ?? []) as unknown as FeedRow[];

  let q = admin
    .from('egis_watch_subscriptions')
    .select('user_id,email,include_egis_mentions,send_hour_dublin')
    .eq('active', true)
    .eq('include_egis_mentions', true);
  if (only) q = q.eq('user_id', only);
  const { data: subsRaw, error: subErr } = await q;
  if (subErr) return { error: subErr.message };
  const subs = (subsRaw ?? []) as unknown as Sub[];

  if (!items.length) {
    await admin.from('egis_digest_runs').insert({ kind: 'digest', items_found: 0, emails_sent: 0, detail: { note: 'nothing new' } });
    return { items: 0, sent: 0, note: 'Nothing new named Egis — no email sent.' };
  }

  const irishCount = items.filter((i) => i.ireland_related).length;
  let sent = 0;
  const failures: string[] = [];
  for (const sub of subs) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${resendKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [sub.email],
        subject: `Egis radar: ${items.length} new mention${items.length === 1 ? '' : 's'}${
          irishCount ? ` (${irishCount} Ireland)` : ''
        } — ${items[0].title.slice(0, 60)}`,
        html: html(items),
      }),
    });
    if (res.ok) {
      sent += 1;
      await admin.from('egis_watch_subscriptions').update({ last_sent_at: new Date().toISOString() }).eq('user_id', sub.user_id);
    } else {
      failures.push(`${res.status} ${(await res.text().catch(() => '')).slice(0, 200)}`);
    }
  }

  // Stamp only on a real send. A test send to one person must not silently
  // consume the queue for everyone else.
  if (sent > 0 && !only) {
    await admin
      .from('egis_feed_items')
      .update({ emailed_at: new Date().toISOString() })
      .in('id', items.map((i) => i.id));
  }

  await admin.from('egis_digest_runs').insert({
    kind: only ? 'digest-test' : 'digest',
    items_found: items.length,
    emails_sent: sent,
    detail: { failures, subscribers: subs.length },
  });
  return { items: items.length, subscribers: subs.length, sent, failures };
}

async function authorise(req: Request, admin: Admin): Promise<{ kind: 'job' } | { kind: 'user'; id: string } | Response> {
  const sent = req.headers.get('x-digest-key');
  if (sent) {
    const envKey = Deno.env.get('DIGEST_KEY');
    if (envKey && sent === envKey) return { kind: 'job' };
    const { data } = await admin.from('internal_config').select('value').eq('key', 'digest_key').maybeSingle();
    const stored = (data as { value?: string } | null)?.value;
    if (stored && sent === stored) return { kind: 'job' };
    return json({ error: 'Not allowed' }, 401);
  }
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  // A publishable key presented as a bearer token proves nothing.
  if (!token || !url || !anonKey || token === anonKey) return json({ error: 'Sign in to use the radar.' }, 401);
  const auth = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data, error } = await auth.auth.getUser(token);
  if (error || !data.user) return json({ error: 'Sign in to use the radar.' }, 401);
  return { kind: 'user', id: data.user.id };
}

async function watchTerms(admin: Admin): Promise<string[]> {
  const { data } = await admin.from('internal_config').select('value').eq('key', 'egis_watch_terms').maybeSingle();
  const extra = String((data as { value?: string } | null)?.value ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set([...BASE_TERMS, ...extra])];
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return json({ error: 'Function is not configured' }, 500);
  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const caller = await authorise(req, admin);
  if (caller instanceof Response) return caller;

  const body = (await req.json().catch(() => ({}))) as { mode?: string; force?: boolean };
  const mode = body.mode ?? 'digest';
  const resendKey = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('DIGEST_FROM') ?? 'InfraBid <alerts@infrabid.ie>';

  if (mode === 'status') {
    const [{ count: unsent }, { count: confirmed }, { count: tracked }, lastRun, sub] = await Promise.all([
      admin.from('egis_feed_items').select('id', { count: 'exact', head: true }).eq('mentions_egis', true).is('emailed_at', null),
      admin.from('egis_projects').select('id', { count: 'exact', head: true }).eq('involvement', 'confirmed'),
      admin.from('egis_projects').select('id', { count: 'exact', head: true }),
      admin.from('egis_digest_runs').select('ran_at,kind,items_found,emails_sent').order('ran_at', { ascending: false }).limit(1).maybeSingle(),
      caller.kind === 'user'
        ? admin.from('egis_watch_subscriptions').select('email,active,last_sent_at,send_hour_dublin').eq('user_id', caller.id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    return json({
      emailConfigured: Boolean(resendKey),
      from: resendKey ? from : null,
      unsentMentions: unsent ?? 0,
      confirmedProjects: confirmed ?? 0,
      trackedProjects: tracked ?? 0,
      lastRun: (lastRun as { data?: unknown }).data ?? null,
      subscription: (sub as { data?: unknown }).data ?? null,
      watchTerms: await watchTerms(admin),
    });
  }

  if (mode === 'harvest') {
    const result = await harvest(admin, await watchTerms(admin));
    return json(result);
  }

  // A signed-in user asking for their own copy now.
  if (mode === 'test') {
    if (caller.kind !== 'user') return json({ error: 'Not allowed' }, 401);
    if (!resendKey) return json({ error: 'RESEND_API_KEY is not set on this project, so nothing can be sent.', emailConfigured: false }, 503);
    return json(await sendDigest(admin, resendKey, from, caller.id));
  }

  if (caller.kind === 'job' && !body.force && dublinHour() !== 7) {
    return json({ skipped: 'not 07:00 in Dublin' });
  }
  if (!resendKey) {
    return json({ error: 'RESEND_API_KEY is not set on this project, so nothing can be sent.', emailConfigured: false }, 503);
  }
  return json(await sendDigest(admin, resendKey, from, caller.kind === 'user' ? caller.id : null));
});
