import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const templateRoot = new URL("../", import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the Pebblesprings Studio portfolio", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Pebblesprings Studio<\/title>/i);
  assert.match(html, /Pebblesprings Studio/);
  assert.match(html, /Start a Project/);
  assert.match(html, /We build websites/);
  assert.match(html, /people actually/);
  assert.match(html, /enjoy using/);
  assert.match(html, /Slipstream Advocacy/);
  assert.match(html, /Albert Rozin/);
  assert.match(html, /See how we work/);
  assert.match(html, /SlipstreamAdvocacy-Expanded-Hero\.png/);
  assert.match(html, /AlbertRozin-Portfolio-2\.png/);
  assert.match(html, /mailto:will@pebblesprings\.co/);
  assert.match(html, /class="scene-viewport"/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});

test("removes starter preview files and includes the social card", async () => {
  const [page, css, expandedLayouts, portfolioData, layout] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/expandedCardLayouts.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/portfolioData.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    access(new URL("../public/og.png", import.meta.url)),
    access(new URL("../public/pebblesprings-forest.png", import.meta.url)),
    access(new URL("../public/pebblesprings-sign.jpeg", import.meta.url)),
  ]);

  assert.match(page, /We build websites that/);
  assert.match(page, /load fast and stay fast/);
  assert.match(page, /you can actually update yourself/);
  assert.match(page, /look like nobody else's/);
  assert.match(page, /High-performing websites, guaranteed/);
  assert.match(page, /Want to see how your website compares/);
  assert.match(page, /What We Prioritize/);
  assert.match(page, /Sustainability/);
  assert.match(page, /Character/);
  assert.match(page, /animateScroll/);
  assert.doesNotMatch(page, /onWheel=\{handleSceneWheel\}/);
  assert.doesNotMatch(page, /onTouchStart=\{handleSceneTouchStart\}/);
  assert.doesNotMatch(page, /onTouchEnd=\{handleSceneTouchEnd\}/);
  assert.match(css, /TreeFarmHero\.png/);
  assert.match(css, /WhiteBorder\.svg/);
  assert.match(expandedLayouts, /SlipstreamAdvocacy-Expanded-Hero\.png/);
  assert.match(expandedLayouts, /AlbertRozin-Expanded-Hero\.png/);
  assert.match(expandedLayouts, /RJohnsonPiano-Expanded-Secondary\.png/);
  assert.match(expandedLayouts, /CPS-Expanded-Secondary\.png/);
  assert.doesNotMatch(page, /WorkPortfolioReview/);
  assert.doesNotMatch(portfolioData, /portfolioReviewProjects/);
  assert.match(portfolioData, /ProjectMediaItem/);
  assert.match(portfolioData, /expandedLayout/);
  assert.match(portfolioData, /Clear Policy Strategies/);
  assert.match(portfolioData, /René Johnson Piano Studio/);
  assert.match(portfolioData, /SlipstreamAdvocacy-Portfolio-1\.png/);
  assert.match(portfolioData, /RJohnsonPiano-Portfolio-3\.png/);
  assert.match(portfolioData, /CPS-Portfolio-4\.png/);
  assert.match(page, /className="studio-shell illustrated-hero scene-panel"/);
  assert.match(page, /<PortfolioCarousel \/>/);
  assert.doesNotMatch(page, /TestHeroGallery/);
  assert.match(layout, /title:\s*"Pebblesprings Studio"/);
  assert.match(layout, /url:\s*"\/og\.png"/);
  assert.doesNotMatch(page, /SkeletonPreview/);
  assert.doesNotMatch(layout, /Starter Project|codex-preview/);

  await assert.rejects(
    access(new URL("app/_sites-preview/SkeletonPreview.tsx", templateRoot)),
  );
});
