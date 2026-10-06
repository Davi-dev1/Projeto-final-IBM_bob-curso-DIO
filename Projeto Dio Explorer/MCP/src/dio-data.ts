/**
 * dio-data.ts
 * Carrega e expõe os dados de trilhas do arquivo JSON local.
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Sobe dois níveis: build/ -> MCP/ -> "Projeto Dio Explorer"/
const DATA_PATH = resolve(
  __dirname,
  "..",   // MCP/
  "..",   // Projeto Dio Explorer/
  "data",
  "trilhas dio.json"
);

export interface Promocao {
  desconto_percentual: number;
  validade: string | null;
  cupom: string | null;
}

export interface Live {
  titulo: string;
  data: string;
  instrutor: string;
}

export interface Trilha {
  id: number;
  nome: string;
  tecnologia: string[];
  nivel: string;
  numero_de_modulos: number;
  xp_total: number;
  badges_disponiveis: string[];
  promocoes: Promocao;
  vitalicio: boolean;
  lives_ao_vivo: Live[];
}

let _cache: Trilha[] | null = null;

export function getTrilhas(): Trilha[] {
  if (_cache) return _cache;
  const raw = readFileSync(DATA_PATH, "utf-8");
  const data = JSON.parse(raw) as { trilhas: Trilha[] };
  _cache = data.trilhas ?? [];
  return _cache;
}

export function buscarPorTecnologia(termo: string): Trilha[] {
  const lower = termo.trim().toLowerCase();
  return getTrilhas().filter((t) =>
    t.tecnologia.some((tech) => tech.toLowerCase().includes(lower))
  );
}

export function buscarPorNome(nome: string): Trilha | undefined {
  const lower = nome.trim().toLowerCase();
  return (
    getTrilhas().find((t) => t.nome.toLowerCase().includes(lower)) ??
    getTrilhas().find((t) =>
      t.tecnologia.some((tech) => tech.toLowerCase().includes(lower))
    )
  );
}
