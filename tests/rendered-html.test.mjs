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
  assert.match(html, /Start a project/);
  assert.match(html, /Slipstream Advocacy/);
  assert.match(html, /Albert Rozin/);
  assert.match(html, /Clear Policy Strategies/);
  assert.match(html, /René Johnson Piano Studio/);
  assert.match(html, /CPS/);
  assert.match(html, /SlipstreamAdvocacy-PortfolioPiece\.svg/);
  assert.match(html, /AlbertRozin-PortfolioPiece\.svg/);
  assert.match(html, /RJohnsonPiano-PortfolioPiece\.svg/);
  assert.match(html, /CPS-PortfolioPiece\.svg/);
  assert.match(html, /mailto:will@pebblesprings\.co/);
  assert.match(html, /class="scene-viewport"/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});

test("removes starter preview files and includes the social card", async () => {
  const [page, carousel, portfolioData, layout] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/PortfolioCarousel.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/portfolioData.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    access(new URL("../public/og.png", import.meta.url)),
    access(new URL("../public/pebblesprings-forest.png", import.meta.url)),
    access(new URL("../public/pebblesprings-sign.jpeg", import.meta.url)),
  ]);

  assert.match(page, /<PortfolioCarousel \/>/);
  assert.match(page, /We build websites that/);
  assert.match(page, /punch above their weight/);
  assert.match(page, /hold up under scrutiny/);
  assert.match(page, /We guarantee high performing websites/);
  assert.match(page, /Let&apos;s test your website/);
  assert.match(page, /What We Prioritize/);
  assert.match(page, /Sustainability/);
  assert.match(page, /Character/);
  assert.match(page, /animateScroll/);
  assert.doesNotMatch(page, /onWheel=\{handleSceneWheel\}/);
  assert.doesNotMatch(page, /onTouchStart=\{handleSceneTouchStart\}/);
  assert.doesNotMatch(page, /onTouchEnd=\{handleSceneTouchEnd\}/);
  assert.match(carousel, /carouselProjects/);
  assert.match(carousel, /Recent work\./);
  assert.match(carousel, /Small sites with sturdy bones/);
  assert.match(carousel, /ExpandedProjectState/);
  assert.match(carousel, /preventDefault/);
  assert.match(carousel, /isCarouselLocked/);
  assert.match(carousel, /aria-expanded/);
  assert.match(carousel, /mobile-project-sheet/);
  assert.match(carousel, /Close \$/);
  assert.match(carousel, /Visit Site/);
  assert.match(carousel, /openMobileProject/);
  assert.match(carousel, /is-next-project/);
  assert.doesNotMatch(carousel, /onRequestWork/);
  assert.doesNotMatch(carousel, /handlePreviewWheel/);
  assert.doesNotMatch(page, /WorkPortfolioReview/);
  assert.doesNotMatch(portfolioData, /portfolioReviewProjects/);
  assert.match(portfolioData, /ProjectMediaItem/);
  assert.match(portfolioData, /expandedLayout/);
  assert.match(portfolioData, /Clear Policy Strategies/);
  assert.match(portfolioData, /PortfolioPiece\.svg/);
  assert.match(carousel, /ROTATION_MS/);
  assert.match(carousel, /INTRO_ROTATION_MS/);
  assert.match(page, /className="studio-shell scene-panel"/);
  assert.match(layout, /title:\s*"Pebblesprings Studio"/);
  assert.match(layout, /url:\s*"\/og\.png"/);
  assert.doesNotMatch(page, /SkeletonPreview/);
  assert.doesNotMatch(layout, /Starter Project|codex-preview/);

  await assert.rejects(
    access(new URL("app/_sites-preview/SkeletonPreview.tsx", templateRoot)),
  );
});
