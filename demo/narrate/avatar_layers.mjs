/**
 * demo/narrate/avatar_layers.mjs — gera as camadas raster da "Vera"
 * (apresentadora fictícia do vídeo narrado, estilo private banker).
 *
 * Avatar 2D estilizado construído 100% em código (SVG inline → PNG via
 * Playwright/Chromium com fundo transparente, deviceScaleFactor 2).
 * Nenhuma imagem externa. Saída em demo/narrate/avatar/:
 *   card.png            — cartão (fundo, borda, sombra interna, lower-third)
 *   mask.png            — máscara do cartão (alpha) p/ recortar o busto rotacionado
 *   base.png            — busto SEM olhos e SEM boca
 *   eyes_open.png / eyes_closed.png
 *   mouth_closed/semi/open/wide.png
 *
 * Coordenadas compartilhadas: viewBox "-20 0 340 340" (sangria de 20px nas
 * laterais para a rotação de ±1,5° não abrir fresta na borda do cartão).
 * O lower-third (nome) fica dos 300 aos 340px de altura.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "avatar");
fs.mkdirSync(OUT, { recursive: true });

/* paleta — blazer navy + acento Bradesco, pele quente, cabelo castanho */
const NAVY = "#1E2761";
const NAVY_LIGHT = "#2C3878";
const RED = "#CC092F";
const SKIN = "#EDBC93";
const SKIN_SHADE = "#DDA378";
const HAIR = "#3A2A20";
const HAIR_HI = "#5A4334";
const LIP = "#B4565E";
const LIP_DARK = "#8E3E46";

const VB = `viewBox="-20 0 340 340"`;
const SVG_OPEN = `<svg xmlns="http://www.w3.org/2000/svg" width="340" height="340" ${VB}>`;

const DEFS = `<defs>
  <linearGradient id="skinG" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${SKIN}"/><stop offset="1" stop-color="${SKIN_SHADE}"/>
  </linearGradient>
  <linearGradient id="hairG" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${HAIR_HI}"/><stop offset="0.55" stop-color="${HAIR}"/><stop offset="1" stop-color="#2A1D15"/>
  </linearGradient>
  <linearGradient id="blazerG" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${NAVY_LIGHT}"/><stop offset="1" stop-color="${NAVY}"/>
  </linearGradient>
  <linearGradient id="cardG" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#F4F5F9"/>
  </linearGradient>
</defs>`;

/* ------------------------------------------------------------------ card */
/* fundo do cartão (atrás do busto) */
const CARD_BG = `${SVG_OPEN}${DEFS}
  <rect x="2" y="2" width="296" height="336" rx="22" fill="url(#cardG)" stroke="#E2E5EE" stroke-width="2"/>
</svg>`;

/* lower-third (NA FRENTE do busto, como em TV) — recortado no raio do cartão */
const LOWER_THIRD = `${SVG_OPEN}${DEFS}
  <defs><clipPath id="cardClip"><rect x="2" y="2" width="296" height="336" rx="22"/></clipPath></defs>
  <g clip-path="url(#cardClip)">
    <rect x="2" y="296" width="296" height="42" fill="${NAVY}" opacity="0.97"/>
    <rect x="2" y="294" width="296" height="2.5" fill="${RED}"/>
    <circle cx="26" cy="317" r="4" fill="${RED}"/>
    <text x="40" y="322" font-family="'Segoe UI', Arial, sans-serif" font-size="14.5" font-weight="600" fill="#FFFFFF" letter-spacing="0.4">Vera · Projeto Vision</text>
  </g>
</svg>`;

/* máscara: alpha do cartão na área do retrato (recorta busto rotacionado) */
const MASK = `${SVG_OPEN}
  <rect x="2" y="2" width="296" height="336" rx="22" fill="#FFFFFF"/>
</svg>`;

/* ------------------------------------------------------------------ base */
/* Busto: ombros/blazer executivo, blusa de seda, lenço-acento, colar fino,
 * pescoço, rosto (sem olhos/boca), nariz, sobrancelhas, brincos, cabelo
 * preso em coque baixo com risca lateral — presença comercial, sorriso
 * "aberto ao cliente" fica por conta das camadas de boca. */
const BASE = `${SVG_OPEN}${DEFS}
  <!-- cabelo: massa de trás + coque baixo -->
  <path d="M88 132 C84 70 116 46 150 46 C184 46 216 70 212 132 C212 168 206 188 198 200 L102 200 C94 188 88 168 88 132 Z" fill="url(#hairG)"/>
  <ellipse cx="206" cy="196" rx="22" ry="26" fill="url(#hairG)"/>
  <path d="M196 176 C212 178 220 190 218 206 C216 220 204 226 196 222 Z" fill="${HAIR_HI}" opacity="0.35"/>

  <!-- pescoço -->
  <path d="M132 178 L132 218 C132 230 168 230 168 218 L168 178 Z" fill="url(#skinG)"/>
  <path d="M132 186 C140 196 160 196 168 186 L168 178 L132 178 Z" fill="${SKIN_SHADE}" opacity="0.55"/>

  <!-- ombros / blazer -->
  <path d="M44 340 C44 268 86 240 122 230 L150 252 L178 230 C214 240 256 268 256 340 Z" fill="url(#blazerG)"/>
  <!-- lapelas -->
  <path d="M122 230 L150 252 L136 282 L114 246 Z" fill="${NAVY}"/>
  <path d="M178 230 L150 252 L164 282 L186 246 Z" fill="${NAVY}"/>
  <path d="M122 230 L150 252 L143 268 L120 240 Z" fill="${NAVY_LIGHT}" opacity="0.8"/>
  <path d="M178 230 L150 252 L157 268 L180 240 Z" fill="${NAVY_LIGHT}" opacity="0.8"/>
  <!-- blusa de seda no V -->
  <path d="M136 246 L150 236 L164 246 L160 300 L140 300 Z" fill="#F6F1EA"/>
  <!-- lenço-acento no bolso -->
  <path d="M84 286 L110 286 L106 272 L96 278 L92 270 Z" fill="${RED}"/>
  <rect x="82" y="286" width="30" height="4" fill="${NAVY_LIGHT}" opacity="0.7"/>
  <!-- colar fino com pingente -->
  <path d="M138 240 C144 252 156 252 162 240" stroke="#D8B25A" stroke-width="1.8" fill="none"/>
  <circle cx="150" cy="252" r="2.6" fill="#D8B25A"/>

  <!-- orelhas + brincos -->
  <ellipse cx="97" cy="138" rx="8" ry="12" fill="url(#skinG)"/>
  <ellipse cx="203" cy="138" rx="8" ry="12" fill="url(#skinG)"/>
  <circle cx="97" cy="146" r="3.4" fill="#D8B25A"/>
  <circle cx="203" cy="146" r="3.4" fill="#D8B25A"/>

  <!-- rosto -->
  <path d="M96 122 C96 78 118 58 150 58 C182 58 204 78 204 122 C204 156 184 186 150 186 C116 186 96 156 96 122 Z" fill="url(#skinG)"/>
  <!-- sombra da franja/risca lateral -->
  <path d="M98 116 C100 84 118 62 150 62 C124 70 110 92 108 124 C104 138 100 132 98 116 Z" fill="${SKIN_SHADE}" opacity="0.25"/>

  <!-- cabelo da frente: risca lateral esquerda, varrido p/ trás -->
  <path d="M94 124 C90 76 116 52 150 52 C186 52 210 76 206 124 C206 110 200 96 192 88 C196 102 196 112 194 120 C188 96 174 80 150 76 C160 72 170 72 178 76 C166 64 138 62 122 74 C106 86 98 104 98 126 C96 130 94 128 94 124 Z" fill="url(#hairG)"/>
  <path d="M122 74 C112 84 104 100 102 118 C100 104 106 88 116 78 Z" fill="${HAIR_HI}" opacity="0.5"/>

  <!-- sobrancelhas -->
  <path d="M114 106 C120 100 132 99 139 103" stroke="#4A352A" stroke-width="3.4" stroke-linecap="round" fill="none"/>
  <path d="M161 103 C168 99 180 100 186 106" stroke="#4A352A" stroke-width="3.4" stroke-linecap="round" fill="none"/>

  <!-- nariz -->
  <path d="M150 122 C149 132 146 140 143 145 C146 148 154 148 157 145 C154 140 151 132 150 122" fill="${SKIN_SHADE}" opacity="0.6"/>

  <!-- blush sutil -->
  <ellipse cx="119" cy="146" rx="9" ry="5" fill="${RED}" opacity="0.10"/>
  <ellipse cx="181" cy="146" rx="9" ry="5" fill="${RED}" opacity="0.10"/>
</svg>`;

/* ------------------------------------------------------------------ eyes */
const EYE_L = 127, EYE_R = 173, EYE_Y = 119;
const EYES_OPEN = `${SVG_OPEN}
  <g>
    <path d="M${EYE_L - 11} ${EYE_Y} C${EYE_L - 6} ${EYE_Y - 7} ${EYE_L + 6} ${EYE_Y - 7} ${EYE_L + 11} ${EYE_Y} C${EYE_L + 6} ${EYE_Y + 6} ${EYE_L - 6} ${EYE_Y + 6} ${EYE_L - 11} ${EYE_Y} Z" fill="#FFFFFF"/>
    <circle cx="${EYE_L}" cy="${EYE_Y}" r="4.6" fill="#5A3A22"/>
    <circle cx="${EYE_L}" cy="${EYE_Y}" r="2.1" fill="#1C120A"/>
    <circle cx="${EYE_L + 1.5}" cy="${EYE_Y - 1.6}" r="1.1" fill="#FFFFFF"/>
    <path d="M${EYE_L - 11} ${EYE_Y} C${EYE_L - 6} ${EYE_Y - 7} ${EYE_L + 6} ${EYE_Y - 7} ${EYE_L + 11} ${EYE_Y}" stroke="#2E2018" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <path d="M${EYE_L + 9} ${EYE_Y - 4} L${EYE_L + 13} ${EYE_Y - 6}" stroke="#2E2018" stroke-width="1.6" stroke-linecap="round"/>
  </g>
  <g>
    <path d="M${EYE_R - 11} ${EYE_Y} C${EYE_R - 6} ${EYE_Y - 7} ${EYE_R + 6} ${EYE_Y - 7} ${EYE_R + 11} ${EYE_Y} C${EYE_R + 6} ${EYE_Y + 6} ${EYE_R - 6} ${EYE_Y + 6} ${EYE_R - 11} ${EYE_Y} Z" fill="#FFFFFF"/>
    <circle cx="${EYE_R}" cy="${EYE_Y}" r="4.6" fill="#5A3A22"/>
    <circle cx="${EYE_R}" cy="${EYE_Y}" r="2.1" fill="#1C120A"/>
    <circle cx="${EYE_R + 1.5}" cy="${EYE_Y - 1.6}" r="1.1" fill="#FFFFFF"/>
    <path d="M${EYE_R - 11} ${EYE_Y} C${EYE_R - 6} ${EYE_Y - 7} ${EYE_R + 6} ${EYE_Y - 7} ${EYE_R + 11} ${EYE_Y}" stroke="#2E2018" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <path d="M${EYE_R - 9} ${EYE_Y - 4} L${EYE_R - 13} ${EYE_Y - 6}" stroke="#2E2018" stroke-width="1.6" stroke-linecap="round"/>
  </g>
</svg>`;

const EYES_CLOSED = `${SVG_OPEN}
  <path d="M${EYE_L - 10} ${EYE_Y} C${EYE_L - 5} ${EYE_Y + 4} ${EYE_L + 5} ${EYE_Y + 4} ${EYE_L + 10} ${EYE_Y}" stroke="#2E2018" stroke-width="2.6" fill="none" stroke-linecap="round"/>
  <path d="M${EYE_R - 10} ${EYE_Y} C${EYE_R - 5} ${EYE_Y + 4} ${EYE_R + 5} ${EYE_Y + 4} ${EYE_R + 10} ${EYE_Y}" stroke="#2E2018" stroke-width="2.6" fill="none" stroke-linecap="round"/>
</svg>`;

/* ----------------------------------------------------------------- bocas */
const MX = 150, MY = 163;
const MOUTHS = {
  closed: `${SVG_OPEN}
    <path d="M${MX - 14} ${MY} C${MX - 6} ${MY + 6} ${MX + 6} ${MY + 6} ${MX + 14} ${MY}" stroke="${LIP_DARK}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    <path d="M${MX - 13} ${MY - 1} C${MX - 5} ${MY + 4} ${MX + 5} ${MY + 4} ${MX + 13} ${MY - 1} C${MX + 6} ${MY - 4} ${MX - 6} ${MY - 4} ${MX - 13} ${MY - 1} Z" fill="${LIP}" opacity="0.85"/>
  </svg>`,
  semi: `${SVG_OPEN}
    <path d="M${MX - 13} ${MY} C${MX - 6} ${MY - 4} ${MX + 6} ${MY - 4} ${MX + 13} ${MY} C${MX + 6} ${MY + 7} ${MX - 6} ${MY + 7} ${MX - 13} ${MY} Z" fill="${LIP}"/>
    <path d="M${MX - 8} ${MY} C${MX - 3} ${MY - 1} ${MX + 3} ${MY - 1} ${MX + 8} ${MY} C${MX + 3} ${MY + 3.5} ${MX - 3} ${MY + 3.5} ${MX - 8} ${MY} Z" fill="#5E2228"/>
  </svg>`,
  open: `${SVG_OPEN}
    <path d="M${MX - 14} ${MY - 1} C${MX - 7} ${MY - 6} ${MX + 7} ${MY - 6} ${MX + 14} ${MY - 1} C${MX + 9} ${MY + 12} ${MX - 9} ${MY + 12} ${MX - 14} ${MY - 1} Z" fill="${LIP}"/>
    <path d="M${MX - 10} ${MY - 1} C${MX - 4} ${MY - 4} ${MX + 4} ${MY - 4} ${MX + 10} ${MY - 1} C${MX + 6} ${MY + 8} ${MX - 6} ${MY + 8} ${MX - 10} ${MY - 1} Z" fill="#5E2228"/>
    <path d="M${MX - 9} ${MY - 1} C${MX - 3} ${MY - 3.5} ${MX + 3} ${MY - 3.5} ${MX + 9} ${MY - 1} L${MX + 8} ${MY + 1.5} C${MX + 3} ${MY - 0.5} ${MX - 3} ${MY - 0.5} ${MX - 8} ${MY + 1.5} Z" fill="#FFFFFF"/>
  </svg>`,
  wide: `${SVG_OPEN}
    <path d="M${MX - 17} ${MY - 2} C${MX - 8} ${MY - 8} ${MX + 8} ${MY - 8} ${MX + 17} ${MY - 2} C${MX + 11} ${MY + 16} ${MX - 11} ${MY + 16} ${MX - 17} ${MY - 2} Z" fill="${LIP}"/>
    <path d="M${MX - 12} ${MY - 2} C${MX - 5} ${MY - 5.5} ${MX + 5} ${MY - 5.5} ${MX + 12} ${MY - 2} C${MX + 8} ${MY + 11} ${MX - 8} ${MY + 11} ${MX - 12} ${MY - 2} Z" fill="#5E2228"/>
    <path d="M${MX - 11} ${MY - 2} C${MX - 4} ${MY - 5} ${MX + 4} ${MY - 5} ${MX + 11} ${MY - 2} L${MX + 9.5} ${MY + 1.5} C${MX + 4} ${MY - 1} ${MX - 4} ${MY - 1} ${MX - 9.5} ${MY + 1.5} Z" fill="#FFFFFF"/>
    <path d="M${MX - 8} ${MY + 9} C${MX - 3} ${MY + 11.5} ${MX + 3} ${MY + 11.5} ${MX + 8} ${MY + 9} L${MX + 6} ${MY + 6.5} C${MX + 2} ${MY + 8.5} ${MX - 2} ${MY + 8.5} ${MX - 6} ${MY + 6.5} Z" fill="#E8A3A8" opacity="0.85"/>
  </svg>`,
};

/* ----------------------------------------------------------------- render */
const LAYERS = {
  "card_bg.png": CARD_BG,
  "lower_third.png": LOWER_THIRD,
  "mask.png": MASK,
  "base.png": BASE,
  "eyes_open.png": EYES_OPEN,
  "eyes_closed.png": EYES_CLOSED,
  "mouth_closed.png": MOUTHS.closed,
  "mouth_semi.png": MOUTHS.semi,
  "mouth_open.png": MOUTHS.open,
  "mouth_wide.png": MOUTHS.wide,
};

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 340, height: 340 },
  deviceScaleFactor: 2,
});
for (const [file, svg] of Object.entries(LAYERS)) {
  await page.setContent(
    `<!doctype html><html><body style="margin:0;background:transparent">${svg}</body></html>`,
  );
  await page.locator("svg").screenshot({ path: path.join(OUT, file), omitBackground: true });
  console.log(`  ✓ ${file}`);
}
await browser.close();
console.log(`✓ avatar layers → ${OUT}`);
