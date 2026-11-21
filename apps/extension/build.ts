import { cp, mkdir, rm } from "node:fs/promises";

const out = "dist";

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

const result = await Bun.build({
  entrypoints: ["src/background/background.ts", "src/popup/popup.ts"],
  outdir: out,
  naming: "[name].js",
  target: "browser",
  format: "esm",
  minify: false,
});

if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}

await cp("manifest.json", `${out}/manifest.json`);
await cp("src/popup/popup.html", `${out}/popup.html`);
await cp("src/popup/popup.css", `${out}/popup.css`);
await cp("icons", `${out}/icons`, { recursive: true });
