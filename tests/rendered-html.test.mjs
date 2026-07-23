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
  assert.match(html, /Simple sites with a point of view\./);
  assert.match(html, /Pebblesprings Studio/);
  assert.match(html, /Start a project/);
  assert.match(html, /Slipstream Advocacy/);
  assert.match(html, /Meet Albert/);
  assert.match(html, /Field &amp; Ledger/);
  assert.match(html, /mailto:hello@pebblesprings\.studio/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});

test("removes starter preview files and includes the social card", async () => {
  const [page, layout] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    access(new URL("../public/og.png", import.meta.url)),
  ]);

  assert.match(page, /const projects = \[/);
  assert.match(page, /className="studio-shell"/);
  assert.match(layout, /title:\s*"Pebblesprings Studio"/);
  assert.match(layout, /url:\s*"\/og\.png"/);
  assert.doesNotMatch(page, /SkeletonPreview/);
  assert.doesNotMatch(layout, /Starter Project|codex-preview/);

  await assert.rejects(
    access(new URL("app/_sites-preview/SkeletonPreview.tsx", templateRoot)),
  );
});
