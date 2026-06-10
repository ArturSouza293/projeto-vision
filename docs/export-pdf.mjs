/** One-off: render docs/*.md to styled PDFs (Chromium print) preserving visuals. */
import fs from "node:fs";
import path from "node:path";
import { marked } from "marked";
import { chromium } from "playwright";

const ROOT = "C:/Users/artur/projeto-vision/docs";
const OUT = "C:/Users/artur/OneDrive/Desktop/Project Vision";

marked.setOptions({ gfm: true, breaks: false });

const CSS = `
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  body { font-family: "Nunito Sans", "Segoe UI", system-ui, sans-serif;
         font-size: 10.5pt; line-height: 1.55; color: #1c1c22; margin: 0; }
  .doc { padding: 0 4mm; }
  h1 { font-size: 21pt; line-height: 1.2; margin: 0 0 4mm; padding-bottom: 3mm;
       border-bottom: 3px solid #CE2A47; color: #15151a; }
  h2 { font-size: 14.5pt; margin: 8mm 0 3mm; color: #CE2A47; page-break-after: avoid; }
  h3 { font-size: 12pt; margin: 6mm 0 2mm; page-break-after: avoid; }
  p { margin: 0 0 2.5mm; }
  strong { color: #15151a; }
  a { color: #CE2A47; text-decoration: none; }
  ul, ol { margin: 0 0 3mm; padding-left: 6mm; }
  li { margin-bottom: 1mm; }
  table { border-collapse: collapse; width: 100%; margin: 2mm 0 4mm;
          font-size: 9.3pt; page-break-inside: auto; }
  th, td { border: 0.5pt solid #c9c9d0; padding: 1.6mm 2.2mm; text-align: left;
           vertical-align: top; }
  th { background: #f3f3f6; font-weight: 700; }
  tr { page-break-inside: avoid; }
  code { font-family: Consolas, "Courier New", monospace; font-size: 9pt;
         background: #f4f4f7; border-radius: 3px; padding: 0.3mm 1mm; }
  pre { background: #f4f4f7; border: 0.5pt solid #e2e2e8; border-radius: 6px;
        padding: 3mm; overflow: hidden; page-break-inside: avoid; }
  pre code { background: none; padding: 0; white-space: pre-wrap; word-break: break-word; }
  blockquote { margin: 3mm 0; padding: 2mm 4mm; border-left: 3px solid #CE2A47;
               background: #faf4f5; color: #44444c; }
  blockquote p { margin: 0 0 1.5mm; }
  hr { border: none; border-top: 0.5pt solid #c9c9d0; margin: 6mm 0; }
  .page-break { page-break-before: always; }
`;

const FOOTER = `
  <div style="width:100%; font-size:7.5pt; font-family:'Segoe UI',sans-serif;
              color:#8a8a93; padding: 0 12mm; display:flex; justify-content:space-between;">
    <span>Projeto Vision · Financial Planning — valores ilustrativos</span>
    <span><span class="pageNumber"></span> / <span class="totalPages"></span></span>
  </div>`;

function htmlFor(mdFiles) {
  const parts = mdFiles.map((f, i) => {
    const md = fs.readFileSync(path.join(ROOT, f), "utf8");
    const body = marked.parse(md);
    return `<div class="doc ${i > 0 ? "page-break" : ""}">${body}</div>`;
  });
  return `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head>
          <body>${parts.join("\n")}</body></html>`;
}

const JOBS = [
  { files: ["BACKLOG_FUNCIONAL_V4.md", "DEPARA_BACKLOG.md"], out: "VISION_Backlog_Funcional_v4_e_DePara.pdf" },
  { files: ["ENGINE_SPEC.md"], out: "VISION_Engine_Spec.pdf" },
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const job of JOBS) {
  await page.setContent(htmlFor(job.files), { waitUntil: "networkidle" });
  await page.pdf({
    path: path.join(OUT, job.out),
    format: "A4",
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: "<span></span>",
    footerTemplate: FOOTER,
    margin: { top: "14mm", bottom: "16mm", left: "12mm", right: "12mm" },
  });
  console.log("✓", job.out);
}
await browser.close();
