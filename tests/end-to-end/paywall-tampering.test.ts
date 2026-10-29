import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { chromium, type Browser, type Page } from "playwright";
import { baseUrl } from "../e2e-setup";

/**
 * Paywall tampering, in a real browser.
 *
 * This is the one thing that genuinely cannot be tested without one. The audit
 * phrased the acceptance criterion as a browser action: "With localStorage
 * hand-edited to premium, the gated action still fails." Premium WAS a
 * localStorage flag - `usePaywall.setState({premium:true})` in the console
 * unlocked everything - and the download allowance was a localStorage array
 * that clearing site data reset.
 *
 * Driven through the `playwright` library under vitest rather than
 * @playwright/test: the library and its browsers are already present, so this
 * adds no dependency and no second test runner, and it runs in the same command
 * as everything else.
 */

const URL = baseUrl();

let browser: Browser;

beforeAll(async () => {
  browser = await chromium.launch();
});

afterAll(async () => {
  await browser?.close();
});

/** A fresh, isolated browser context - its own cookies and localStorage. */
async function newPage(): Promise<Page> {
  const context = await browser.newContext();
  return context.newPage();
}

describe("a tampered client cannot grant itself premium", () => {
  it("does not let a forged paywall flag unlock the export API", async () => {
    const page = await newPage();
    await page.goto(`${URL}/login`, { waitUntil: "domcontentloaded" });

    // Exactly the console one-liner the audit called out.
    await page.evaluate(() => {
      localStorage.setItem(
        "resume-co:paywall",
        JSON.stringify({ state: { premium: true }, version: 1 })
      );
      localStorage.setItem(
        "resume-co:downloads",
        JSON.stringify({
          state: { downloadedIds: { resume: [], coverLetter: [], resignationLetter: [] } },
          version: 0,
        })
      );
    });

    // The server is the authority now, and it has no session for this browser.
    const result = await page.evaluate(async () => {
      const res = await fetch("/api/export/authorize", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: "resume", documentId: "forged" }),
      });
      return { status: res.status, body: await res.json().catch(() => null) };
    });

    expect(result.status).toBe(401);
    expect((result.body as { allowed?: boolean })?.allowed).toBeFalsy();
    await page.close();
  });

  it("does not let a forged entitlement flag survive a server check", async () => {
    const page = await newPage();
    await page.goto(`${URL}/login`, { waitUntil: "domcontentloaded" });

    await page.evaluate(() => {
      localStorage.setItem(
        "resume-co:paywall",
        JSON.stringify({ state: { premium: true }, version: 1 })
      );
    });

    const entitlement = await page.evaluate(async () => {
      const res = await fetch("/api/entitlement");
      return res.json();
    });

    // Whatever the browser believes, the server says no.
    expect((entitlement as { premium?: boolean }).premium).toBe(false);
    await page.close();
  });

  it("keeps a signed-out visitor out of the editor even with storage set", async () => {
    const page = await newPage();
    await page.goto(`${URL}/login`, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => {
      localStorage.setItem(
        "resume-co:paywall",
        JSON.stringify({ state: { premium: true }, version: 1 })
      );
    });

    await page.goto(`${URL}/dashboard`, { waitUntil: "domcontentloaded" });
    // The route gate reads a verified session cookie, which localStorage
    // cannot fabricate.
    expect(page.url()).toContain("/login");
    await page.close();
  });
});

describe("the consent gate in a real browser", () => {
  it("sends NO analytics request before a choice is made", async () => {
    // The compliance-critical case. With a PostHog key configured and consent
    // undecided, nothing may be requested. This watches actual network traffic
    // rather than trusting the gate function.
    const page = await newPage();
    const tracking: string[] = [];
    page.on("request", (req) => {
      const u = req.url();
      if (/posthog|googletagmanager|google-analytics/i.test(u)) tracking.push(u);
    });

    await page.goto(`${URL}/`, { waitUntil: "networkidle" });
    await page.goto(`${URL}/login`, { waitUntil: "networkidle" });

    expect(tracking).toEqual([]);
    await page.close();
  });
});

describe("accessibility basics", () => {
  it("makes the skip link the first thing a keyboard reaches", async () => {
    const page = await newPage();
    await page.goto(`${URL}/login`, { waitUntil: "domcontentloaded" });
    await page.keyboard.press("Tab");

    const focused = await page.evaluate(() => ({
      text: document.activeElement?.textContent?.trim() ?? "",
      href: (document.activeElement as HTMLAnchorElement | null)?.getAttribute(
        "href"
      ),
    }));

    expect(focused.text).toBe("Skip to main content");
    expect(focused.href).toBe("#main-content");
    await page.close();
  });

  it("has a main landmark for the skip link to land on", async () => {
    const page = await newPage();
    await page.goto(`${URL}/login`, { waitUntil: "domcontentloaded" });
    const main = await page.locator("#main-content").count();
    expect(main).toBeGreaterThan(0);
    await page.close();
  });

  it("gives every page a single h1", async () => {
    // More than one h1, or none, breaks heading navigation for screen readers.
    for (const path of ["/login", "/privacy", "/terms", "/forgot-password"]) {
      const page = await newPage();
      await page.goto(`${URL}${path}`, { waitUntil: "domcontentloaded" });
      const count = await page.locator("h1").count();
      expect(count, `${path} should have exactly one h1`).toBe(1);
      await page.close();
    }
  });
});
