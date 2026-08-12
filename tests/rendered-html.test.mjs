import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("https://veil.example/", {
      headers: {
        accept: "text/html",
        host: "veil.example",
        "x-forwarded-host": "veil.example",
        "x-forwarded-proto": "https",
      },
    }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders Veil metadata and a private loading state", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>Veil — Your skincare, organized<\/title>/i);
  assert.match(html, /A private, local-first skincare routine tracker designed for iPhone\./i);
  assert.match(html, /rel="manifest" href="\/manifest\.webmanifest"/i);
  assert.match(html, /apple-mobile-web-app-capable/i);
  assert.match(html, /viewport-fit=cover/i);
  assert.match(html, /https:\/\/veil\.example\/og\.png/i);
  assert.match(html, /Opening your private shelf/i);
  assert.doesNotMatch(html, /codex-preview|Starter Project|Your site is taking shape/i);
});

test("ships required PWA and offline assets", async () => {
  const [manifest, serviceWorker] = await Promise.all([
    readFile(new URL("../public/manifest.webmanifest", import.meta.url), "utf8"),
    readFile(new URL("../public/sw.js", import.meta.url), "utf8"),
  ]);
  const parsed = JSON.parse(manifest);
  assert.equal(parsed.name, "Veil — Your skincare, organized");
  assert.equal(parsed.display, "standalone");
  assert.ok(parsed.icons.some((icon) => icon.sizes === "192x192"));
  assert.ok(parsed.icons.some((icon) => icon.sizes === "512x512" && icon.purpose === "maskable"));
  assert.match(serviceWorker, /veil-shell-v1/);
  assert.match(serviceWorker, /request\.mode === "navigate"/);
  await Promise.all([
    access(new URL("../public/icons/apple-touch-icon.png", import.meta.url)),
    access(new URL("../public/icons/icon-192.png", import.meta.url)),
    access(new URL("../public/icons/icon-512.png", import.meta.url)),
    access(new URL("../public/og.png", import.meta.url)),
  ]);
});
