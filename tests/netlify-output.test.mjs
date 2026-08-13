import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const output = (...parts) => resolve(root, ...parts);

test("generates Netlify's server function and required PWA assets", async () => {
  const requiredFiles = [
    [".netlify", "functions-internal", "server", "server.mjs"],
    [".netlify", "functions-internal", "server", "main.mjs"],
    [".netlify", "functions-internal", "nitro.json"],
    ["dist", "manifest.webmanifest"],
    ["dist", "sw.js"],
    ["dist", "icons", "icon-192.png"],
    ["dist", "icons", "icon-512.png"],
  ];

  await Promise.all(requiredFiles.map((parts) => access(output(...parts))));

  const functionEntry = await readFile(
    output(".netlify", "functions-internal", "server", "server.mjs"),
    "utf8",
  );
  assert.match(functionEntry, /path:\s*"\/\*"/);
  assert.match(functionEntry, /preferStatic:\s*true/);
});

test("serves Veil from the generated Netlify function", async () => {
  const entryUrl = pathToFileURL(
    output(".netlify", "functions-internal", "server", "server.mjs"),
  ).href;
  const { default: handler } = await import(entryUrl);
  const response = await handler(new Request("https://veil.example/"), {});
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html/);
  assert.match(html, /Veil/);
  assert.match(html, /\/manifest\.webmanifest/);
  assert.match(html, /\/icons\/apple-touch-icon\.png/);
});
