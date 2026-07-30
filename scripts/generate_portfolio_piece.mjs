import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const templatePath = "PORTFOLIOPIECE.svg";
const websiteBox = {
  x: 0,
  y: 85.22,
  width: 2690.53,
  height: 1383.02,
};
const defaultWebsiteInsetTop = 0;
const logoBox = {
  x: 325.21,
  y: 33.75,
  width: 34.58,
  height: 34.58,
};
const urlBox = {
  x: 370.13,
  y: 37.72,
  width: 319.03,
  height: 30.6,
};

const mimeTypes = new Map([
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".webp", "image/webp"],
]);

function usage() {
  console.error(
    [
      "Usage:",
      "  node scripts/generate_portfolio_piece.mjs --screenshot <path> --url <site-url> --logo <path> --out <path> [--website-inset-top <px>]",
      "",
      "Example:",
      "  node scripts/generate_portfolio_piece.mjs --screenshot public/example.png --url https://example.com --logo public/logo.svg --out public/example-portfolio.svg",
    ].join("\n"),
  );
}

function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];

    if (!key?.startsWith("--") || value === undefined) {
      usage();
      process.exit(1);
    }

    args[key.slice(2)] = value;
  }

  for (const required of ["screenshot", "url", "logo", "out"]) {
    if (!args[required]) {
      usage();
      process.exit(1);
    }
  }

  args.websiteInsetTop = Number(args["website-inset-top"] ?? defaultWebsiteInsetTop);

  if (!Number.isFinite(args.websiteInsetTop) || args.websiteInsetTop < 0 || args.websiteInsetTop >= websiteBox.height) {
    throw new Error("--website-inset-top must be a number from 0 up to the website layer height");
  }

  return args;
}

function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function getMimeType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const mimeType = mimeTypes.get(extension);

  if (!mimeType) {
    throw new Error(`Unsupported image type: ${extension}`);
  }

  return mimeType;
}

async function imageToDataUri(filePath) {
  const absolutePath = path.resolve(filePath);
  const image = await readFile(absolutePath);
  return `data:${getMimeType(filePath)};base64,${image.toString("base64")}`;
}

function replaceElementById(svg, id, replacement) {
  const pattern = new RegExp(`<[^>]+id="${id}"[^>]*/>`);

  if (!pattern.test(svg)) {
    throw new Error(`Could not find SVG element with id="${id}"`);
  }

  return svg.replace(pattern, replacement);
}

function ensurePortfolioDefs(svg) {
  const defs = `
    <filter id="website-shadow" x="-2%" y="-2%" width="106%" height="106%" color-interpolation-filters="sRGB">
      <feDropShadow dx="18" dy="22" stdDeviation="16" flood-color="#000000" flood-opacity="0.24"/>
    </filter>
    <clipPath id="website-clip">
      <rect x="${websiteBox.x}" y="${websiteBox.y}" width="${websiteBox.width}" height="${websiteBox.height}"/>
    </clipPath>
    <clipPath id="logo-clip">
      <rect x="${logoBox.x}" y="${logoBox.y}" width="${logoBox.width}" height="${logoBox.height}" rx="3.5" ry="3.5"/>
    </clipPath>
    <clipPath id="url-clip">
      <rect x="${urlBox.x}" y="${urlBox.y}" width="${urlBox.width}" height="${urlBox.height}"/>
    </clipPath>
  `;

  return svg.replace("</defs>", `${defs}\n  </defs>`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const [template, screenshotUri, logoUri] = await Promise.all([
    readFile(templatePath, "utf8"),
    imageToDataUri(args.screenshot),
    imageToDataUri(args.logo),
  ]);

  const websiteReplacement = `
  <g id="WEBSITE">
    <rect x="${websiteBox.x}" y="${websiteBox.y}" width="${websiteBox.width}" height="${websiteBox.height}" fill="#ffffff" filter="url(#website-shadow)"/>
    <image x="${websiteBox.x}" y="${websiteBox.y + args.websiteInsetTop}" width="${websiteBox.width}" height="${websiteBox.height - args.websiteInsetTop}" href="${screenshotUri}" preserveAspectRatio="xMidYMin slice" clip-path="url(#website-clip)"/>
  </g>`;

  const logoReplacement = `
  <g id="LOGO">
    <rect x="${logoBox.x}" y="${logoBox.y}" width="${logoBox.width}" height="${logoBox.height}" rx="3.5" ry="3.5" fill="#ffffff"/>
    <image x="${logoBox.x}" y="${logoBox.y}" width="${logoBox.width}" height="${logoBox.height}" href="${logoUri}" preserveAspectRatio="xMidYMid meet" clip-path="url(#logo-clip)"/>
  </g>`;

  const urlReplacement = `
  <text id="URL" x="${urlBox.x}" y="${urlBox.y + 22.5}" fill="#231f20" font-family="Manrope, Arial, Helvetica, sans-serif" font-size="21" font-weight="700" letter-spacing="0" clip-path="url(#url-clip)">${escapeXml(args.url)}</text>`;

  let output = ensurePortfolioDefs(template);
  output = output.replace(
    "</style>",
    `
      #URL {
        dominant-baseline: alphabetic;
      }
    </style>
    `,
  );
  output = replaceElementById(output, "WEBSITE", websiteReplacement);
  output = replaceElementById(output, "LOGO", logoReplacement);
  output = replaceElementById(output, "URL", urlReplacement);

  await mkdir(path.dirname(path.resolve(args.out)), { recursive: true });
  await writeFile(args.out, output);
  console.log(`Generated ${args.out}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
