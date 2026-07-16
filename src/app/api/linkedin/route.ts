import { NextResponse } from "next/server";

/**
 * POST /api/linkedin  { url }
 *
 * LinkedIn has no public profile API, so we do the honest best-effort: fetch the
 * public profile page server-side (no CORS limits here) and return the readable
 * text - Open Graph tags, any embedded JSON-LD Person schema, and the stripped
 * body. The client hands that to the same AI extractor the resume upload uses,
 * so it reads the candidate's REAL details rather than inventing any. A private
 * or login-walled profile yields nothing usable and the caller falls back.
 */

/** Accepts linkedin.com/in/<handle> (optionally with a country subdomain). */
const PROFILE_RE = /^https?:\/\/([a-z]{2,3}\.)?linkedin\.com\/in\/[^/\s?#]+/i;

/** Pull the content of a specific Open Graph meta tag out of the page HTML. */
function ogTag(html: string, property: string): string {
  const re = new RegExp(
    `<meta[^>]+property=["']og:${property}["'][^>]+content=["']([^"']+)["']`,
    "i"
  );
  const m = html.match(re);
  return m ? decodeEntities(m[1]) : "";
}

/** Minimal HTML-entity decode for the few that show up in meta content. */
function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}

/** Strip tags/scripts to leave the visible text (capped, so the model isn't flooded). */
function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function POST(request: Request) {
  let url = "";
  try {
    const body = (await request.json()) as { url?: string };
    url = String(body?.url ?? "").trim();
  } catch {
    /* empty / invalid body handled below */
  }

  if (!PROFILE_RE.test(url)) {
    return NextResponse.json(
      { error: "Enter a valid LinkedIn profile link, like linkedin.com/in/username." },
      { status: 400 }
    );
  }

  let html = "";
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    clearTimeout(timer);
    html = await res.text();
  } catch {
    return NextResponse.json(
      { error: "Couldn't reach LinkedIn. Check the link and try again." },
      { status: 502 }
    );
  }

  const ogTitle = ogTag(html, "title"); // "First Last - Headline | LinkedIn"
  const ogDescription = ogTag(html, "description");

  // LinkedIn embeds a Person schema in a JSON-LD script on public profiles.
  const ld = html.match(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i
  );
  const ldText = ld ? decodeEntities(ld[1]).trim() : "";

  const bodyText = stripHtml(html).slice(0, 12_000);
  const text = [ogTitle, ogDescription, ldText, bodyText]
    .filter(Boolean)
    .join("\n\n")
    .trim();

  // A login wall / private profile carries no real name in the OG title and only
  // a generic "sign up" body - not enough to extract a resume from.
  const readable =
    (ogTitle && !/^linkedin$/i.test(ogTitle) && / - | \| /.test(ogTitle)) ||
    ldText.includes('"Person"');
  if (!readable) {
    return NextResponse.json(
      { error: "This profile isn't publicly readable." },
      { status: 422 }
    );
  }

  return NextResponse.json({ text });
}
