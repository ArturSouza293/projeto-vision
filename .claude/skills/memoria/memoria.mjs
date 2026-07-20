#!/usr/bin/env node
// CLI do Segundo Cérebro — único ponto de escrita do grafo .claude/memory/graph.json.
// Uso: node .claude/skills/memoria/memoria.mjs <comando> [opções]
// Comandos: query | add-node | add-edge | vizinhos | resumo | validate

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const GRAPH_PATH = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "memory", "graph.json");
const TIPOS = ["projeto", "decisao", "reuniao", "nota"];
const PREFIXOS = { projeto: "proj", decisao: "dec", reuniao: "reun", nota: "nota" };

function lerGrafo() {
  return JSON.parse(readFileSync(GRAPH_PATH, "utf8"));
}

function gravarGrafo(graph) {
  graph.atualizado_em = hoje();
  writeFileSync(GRAPH_PATH, JSON.stringify(graph, null, 2) + "\n");
}

function hoje() {
  return new Date().toISOString().slice(0, 10);
}

function parseArgs(argv) {
  const opts = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      const chave = argv[i].slice(2);
      const valor = argv[i + 1] !== undefined && !argv[i + 1].startsWith("--") ? argv[++i] : "true";
      opts[chave] = valor;
    }
  }
  return opts;
}

function slugify(texto) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function falhar(msg) {
  console.error(`erro: ${msg}`);
  process.exit(1);
}

function imprimirNo(graph, node, comArestas = true) {
  console.log(`[${node.id}] (${node.tipo}) ${node.titulo} — ${node.data}${node.tags?.length ? " #" + node.tags.join(" #") : ""}`);
  console.log(`  ${node.corpo}`);
  if (!comArestas) return;
  const titulos = new Map(graph.nodes.map((n) => [n.id, n.titulo]));
  for (const e of graph.edges) {
    if (e.de === node.id) console.log(`  → ${e.relacao} → [${e.para}] ${titulos.get(e.para) ?? "?"}`);
    if (e.para === node.id) console.log(`  ← ${e.relacao} ← [${e.de}] ${titulos.get(e.de) ?? "?"}`);
  }
}

function cmdQuery(opts) {
  const graph = lerGrafo();
  const texto = opts.texto?.toLowerCase();
  const achados = graph.nodes.filter((n) => {
    if (opts.tipo && n.tipo !== opts.tipo) return false;
    if (opts.tag && !(n.tags ?? []).some((t) => t.toLowerCase() === opts.tag.toLowerCase())) return false;
    if (opts.desde && n.data < opts.desde) return false;
    if (texto) {
      const alvo = `${n.titulo} ${n.corpo} ${(n.tags ?? []).join(" ")}`.toLowerCase();
      if (!alvo.includes(texto)) return false;
    }
    return true;
  });
  if (!achados.length) {
    console.log("nenhum nó encontrado.");
    return;
  }
  console.log(`${achados.length} nó(s):\n`);
  for (const n of achados) {
    imprimirNo(graph, n);
    console.log("");
  }
}

function cmdAddNode(opts) {
  const graph = lerGrafo();
  if (!opts.tipo || !TIPOS.includes(opts.tipo)) falhar(`--tipo obrigatório: ${TIPOS.join(" | ")}`);
  if (!opts.titulo) falhar("--titulo obrigatório");
  if (!opts.corpo) falhar("--corpo obrigatório");
  const id = opts.id ?? `${PREFIXOS[opts.tipo]}-${slugify(opts.titulo)}`;
  if (graph.nodes.some((n) => n.id === id)) falhar(`id já existe: ${id}`);
  const node = {
    id,
    tipo: opts.tipo,
    titulo: opts.titulo,
    corpo: opts.corpo,
    data: hoje(),
    tags: opts.tags ? opts.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
  };
  graph.nodes.push(node);
  gravarGrafo(graph);
  console.log(`nó criado: [${id}]`);
  imprimirNo(graph, node, false);
}

function cmdAddEdge(opts) {
  const graph = lerGrafo();
  for (const chave of ["de", "para", "relacao"]) {
    if (!opts[chave]) falhar(`--${chave} obrigatório`);
  }
  for (const id of [opts.de, opts.para]) {
    if (!graph.nodes.some((n) => n.id === id)) falhar(`nó não existe: ${id}`);
  }
  if (graph.edges.some((e) => e.de === opts.de && e.para === opts.para && e.relacao === opts.relacao)) {
    falhar("aresta duplicada");
  }
  graph.edges.push({ de: opts.de, para: opts.para, relacao: opts.relacao });
  gravarGrafo(graph);
  console.log(`aresta criada: [${opts.de}] → ${opts.relacao} → [${opts.para}]`);
}

function cmdVizinhos(opts) {
  const graph = lerGrafo();
  if (!opts.id) falhar("--id obrigatório");
  if (!graph.nodes.some((n) => n.id === opts.id)) falhar(`nó não existe: ${opts.id}`);
  const profundidade = Number(opts.profundidade ?? 1);
  const visitados = new Set([opts.id]);
  let fronteira = [opts.id];
  for (let nivel = 0; nivel < profundidade; nivel++) {
    const proxima = [];
    for (const id of fronteira) {
      for (const e of graph.edges) {
        for (const vizinho of [e.de === id ? e.para : null, e.para === id ? e.de : null]) {
          if (vizinho && !visitados.has(vizinho)) {
            visitados.add(vizinho);
            proxima.push(vizinho);
          }
        }
      }
    }
    fronteira = proxima;
  }
  for (const n of graph.nodes.filter((n) => visitados.has(n.id))) {
    imprimirNo(graph, n);
    console.log("");
  }
}

function cmdResumo(opts) {
  const graph = lerGrafo();
  const limite = Number(opts.n ?? 5);
  const recentes = [...graph.nodes].sort((a, b) => b.data.localeCompare(a.data)).slice(0, limite);
  console.log(`Segundo Cérebro — ${graph.nodes.length} nós, ${graph.edges.length} arestas. Recentes:`);
  for (const n of recentes) {
    console.log(`- [${n.id}] (${n.tipo}) ${n.titulo} — ${n.data}`);
  }
  console.log("Consulta: node .claude/skills/memoria/memoria.mjs query --texto \"...\"");
}

function cmdValidate() {
  const graph = lerGrafo();
  const erros = [];
  const ids = new Set();
  for (const n of graph.nodes) {
    if (!n.id || !n.titulo || !n.corpo || !n.data) erros.push(`nó incompleto: ${JSON.stringify(n.id ?? n)}`);
    if (!TIPOS.includes(n.tipo)) erros.push(`tipo inválido em ${n.id}: ${n.tipo}`);
    if (ids.has(n.id)) erros.push(`id duplicado: ${n.id}`);
    ids.add(n.id);
  }
  for (const e of graph.edges) {
    if (!e.relacao) erros.push(`aresta sem relacao: ${e.de} → ${e.para}`);
    for (const id of [e.de, e.para]) {
      if (!ids.has(id)) erros.push(`aresta órfã, nó não existe: ${id}`);
    }
  }
  if (erros.length) {
    for (const erro of erros) console.error(`inválido: ${erro}`);
    process.exit(1);
  }
  console.log(`grafo válido: ${graph.nodes.length} nós, ${graph.edges.length} arestas.`);
}

const [comando, ...resto] = process.argv.slice(2);
const opts = parseArgs(resto);
const comandos = {
  query: cmdQuery,
  "add-node": cmdAddNode,
  "add-edge": cmdAddEdge,
  vizinhos: cmdVizinhos,
  resumo: cmdResumo,
  validate: cmdValidate,
};
const fn = comandos[comando];
if (!fn) {
  console.error(`uso: memoria.mjs <${Object.keys(comandos).join(" | ")}> [opções]`);
  process.exit(1);
}
fn(opts);
