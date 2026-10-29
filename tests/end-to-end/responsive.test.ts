import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { chromium, type Browser } from "playwright";
import { baseUrl } from "../e2e-setup";

/**
 * Responsive behaviour at the three breakpoints that matter.
 *
 * The audit listed "Responsive across breakpoints" as BLOCKED - not measured.
 * This measures the one failure that is both the most common and the most
 * visible: horizontal overflow. A page that scrolls sideways on a phone looks
 * broken to every visitor on it, and it is invisible on a developer's desktop,
 * which is exactly why it ships.
 *
 * Public pages only. The authenticated surface needs a session and is covered
 * by the HTTP suites; this is about layout, and layout breaks hardest on the
 * pages strangers see first.
 */

const URL = baseUrl();

const VIEWPORTS = [
  // iPhone SE - the narrowest screen still worth supporting. If anything
  // overflows, it overflows here first.
  { name: "mobile", width: 375, height: 667 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
];

const PAGES = ["/", "/login", "/privacy", "/terms", "/forgot-password"];

let browser: Browser;

beforeAll(async () => {
  browser = await chromium.launch();
});

afterAll(async () => {
  await browser?.close();
});

describe("no horizontal overflow", () => {
  for (const vp of VIEWPORTS) {
    for (const path of PAGES) {
      it(`${path} fits at ${vp.name} (${vp.width}px)`, async () => {
        const context = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
        });
        const page = await context.newPage();
        await page.goto(`${URL}${path}`, { waitUntil: "networkidle" });

        const overflow = await page.evaluate(() => {
          const doc = document.documentElement;
          return {
            scrollWidth: doc.scrollWidth,
            clientWidth: doc.clientWidth,
            // Name the widest offender, so a failure says WHICH element rather
            // than only that something is too wide.
            widest: (() => {
              let worst = { tag: "", cls: "", width: 0 };
              for (const el of Array.from(document.body.querySelectorAll("*"))) {
                const r = (el as HTMLElement).getBoundingClientRect();
                if (r.right > worst.width) {
                  worst = {
                    tag: el.tagName.toLowerCase(),
                    cls: (el.className || "").toString().slice(0, 80),
                    width: Math.round(r.right),
                  };
                }
              }
              return worst;
            })(),
          };
        });

        // A pixel of slack absorbs sub-pixel rounding, which is noise rather
        // than a layout bug.
        expect(
          overflow.scrollWidth,
          `${path} at ${vp.width}px overflows to ${overflow.scrollWidth}px; ` +
            `widest element: <${overflow.widest.tag} class="${overflow.widest.cls}"> ` +
            `reaching ${overflow.widest.width}px`
        ).toBeLessThanOrEqual(overflow.clientWidth + 1);

        await context.close();
      });
    }
  }
});

describe("tap targets on mobile", () => {
  it("gives the login form controls a usable height", async () => {
    // WCAG 2.5.8 asks for 24px; 44px is the long-standing iOS guidance and
    // what this design system already uses (h-11/h-12). Anything materially
    // under that is a mis-sized control rather than a deliberate choice.
    const context = await browser.newContext({
      viewport: { width: 375, height: 667 },
    });
    const page = await context.newPage();
    await page.goto(`${URL}/login`, { waitUntil: "networkidle" });

    const tooSmall = await page.evaluate(() =>
      Array.from(document.querySelectorAll("button, input, a[href]"))
        .map((el) => {
          const r = (el as HTMLElement).getBoundingClientRect();
          return {
            h: Math.round(r.height),
            w: Math.round(r.width),
            text: (el.textContent || "").trim().slice(0, 40),
            // Screen-reader-only elements are 1x1 until focused. They are not
            // pointer targets, so measuring them would be measuring the wrong
            // thing - the skip link becomes a 44px button once focused.
            hidden: (el as HTMLElement).className.toString().includes("sr-only"),
          };
        })
        .filter((x) => !x.hidden && x.w > 0 && x.h > 0 && x.h < 24)
        .map((x) => `${x.text || "(no text)"} = ${x.h}px`)
    );

    expect(
      tooSmall,
      `controls under the WCAG 2.5.8 minimum of 24px: ${tooSmall.join("; ")}`
    ).toEqual([]);
    await context.close();
  });
});
