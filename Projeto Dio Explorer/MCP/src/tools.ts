/**
 * tools.ts
 * Lógica de negócio das três ferramentas MCP:
 *   - trilha_buscar
 *   - desafio_gerar
 *   - certificado_emitir
 */

import { buscarPorTecnologia, buscarPorNome, Trilha } from "./dio-data.js";

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function randomAlpha(length: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({ length }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

function today(): string {
  return new Date().toLocaleDateString("pt-BR");
}

function year(): number {
  return new Date().getFullYear();
}

// ─────────────────────────────────────────────
// /trilha
// ─────────────────────────────────────────────

export interface TrilhaResult {
  encontradas: number;
  markdown: string;
}

function formatarTrilha(t: Trilha): string {
  const techs = t.tecnologia.map((x) => `\`${x}\``).join(" ");
  const vitalicio = t.vitalicio ? "Sim" : "Não";
  const { desconto_percentual, cupom, validade } = t.promocoes;

  const modulos = Array.from({ length: t.numero_de_modulos }, (_, i) => {
    const tech = t.tecnologia[i % t.tecnologia.length];
    return `${i + 1}. Módulo ${i + 1}: Tópico avançado de ${tech}`;
  }).join("\n");

  const badges = t.badges_disponiveis.map((b) => `🥇 ${b}`).join("\n");

  const lives =
    t.lives_ao_vivo.length > 0
      ? t.lives_ao_vivo
          .map(
            (l) =>
              `- **${l.titulo}** — 📅 ${l.data} com 👨‍🏫 ${l.instrutor}`
          )
          .join("\n")
      : "_Nenhuma live agendada_";

  const promo =
    desconto_percentual > 0
      ? `> 🔥 **${desconto_percentual}% de desconto** com o cupom \`${cupom}\` — válido até ${validade}`
      : "> ℹ️ Nenhuma promoção ativa no momento.";

  return `## 🎓 ${t.nome}

| Campo | Detalhe |
|---|---|
| 🏷️ Nível | ${t.nivel} |
| 📦 Módulos | ${t.numero_de_modulos} módulos |
| ⭐ XP Total | ${t.xp_total} XP |
| ♾️ Vitalício | ${vitalicio} |

### 🛠️ Tecnologias da Trilha
${techs}

### 📚 Plano de Estudos — Módulos
${modulos}

### 🏅 Badges Disponíveis
${badges}

### 🔴 Lives ao Vivo
${lives}

### 🎟️ Promoção Ativa
${promo}`;
}

export function toolTrilha(tecnologia: string): TrilhaResult {
  const found = buscarPorTecnologia(tecnologia);
  if (found.length === 0) {
    return {
      encontradas: 0,
      markdown: `> ❌ Nenhuma trilha encontrada para a tecnologia **"${tecnologia}"** no catálogo DIO.\n> Tente: \`Java\`, \`Python\`, \`React\`, \`AWS\`, \`Kotlin\`, \`C#\`, \`Go\`, \`Flutter\`, \`Node.js\` ou \`Data Science\`.`,
    };
  }
  return {
    encontradas: found.length,
    markdown: found.map(formatarTrilha).join("\n\n---\n\n"),
  };
}

// ─────────────────────────────────────────────
// /desafio
// ─────────────────────────────────────────────

const XP_MAP: Record<string, number> = {
  iniciante: 500,
  intermediário: 1000,
  intermediario: 1000,
  avançado: 2000,
  avancado: 2000,
};

const DESC_MAP: Record<string, string> = {
  iniciante:
    "Implemente uma função que receba uma lista de números inteiros e retorne a soma de todos os elementos pares.",
  intermediário:
    "Implemente um sistema de fila de prioridade para gerenciar tickets de suporte, ordenando por urgência (1-crítico, 2-alto, 3-baixo).",
  intermediario:
    "Implemente um sistema de fila de prioridade para gerenciar tickets de suporte, ordenando por urgência (1-crítico, 2-alto, 3-baixo).",
  avançado:
    "Implemente o algoritmo de Dijkstra para encontrar o caminho mais curto entre dois nós em um grafo ponderado representando rotas de entrega logística.",
  avancado:
    "Implemente o algoritmo de Dijkstra para encontrar o caminho mais curto entre dois nós em um grafo ponderado representando rotas de entrega logística.",
};

export interface DesafioResult {
  tecnologia: string;
  nivel: string;
  xp: number;
  badge: string;
  codigo: string;
  markdown: string;
}

export function toolDesafio(tecnologia: string, nivel: string): DesafioResult {
  const nivelNorm = nivel.trim().toLowerCase();
  const xp = XP_MAP[nivelNorm];
  if (!xp) {
    throw new Error(
      `Nível "${nivel}" inválido. Use: iniciante, intermediário ou avançado.`
    );
  }
  const descricao = DESC_MAP[nivelNorm]!;
  const codigo = `CHALLENGE-${xp}-${randomAlpha(6)}`;
  const badge = `${tecnologia} ${nivel.charAt(0).toUpperCase() + nivel.slice(1)} Challenger`;

  const markdown = `## ⚔️ Desafio de Código — DIO Challenge

> 🎯 **Tecnologia:** ${tecnologia} | 🏆 **Nível:** ${nivel}

### 📋 Descrição do Desafio

${descricao}

### 🏅 Recompensa
- ⭐ XP ao completar: **${xp} XP**
- 🏆 Badge desbloqueável: **"${badge}"**

### 🔑 Código do Desafio
\`${codigo}\`

---
> 💡 **Dica:** Use \`certificado_emitir\` com seu nome e trilha para gerar seu certificado!`;

  return { tecnologia, nivel, xp, badge, codigo, markdown };
}

// ─────────────────────────────────────────────
// /certificado
// ─────────────────────────────────────────────

export interface CertificadoResult {
  nome_aluno: string;
  trilha_nome: string;
  codigo: string;
  trilha_encontrada: boolean;
  markdown: string;
}

export function toolCertificado(
  nomeAluno: string,
  nomeTrilha: string
): CertificadoResult {
  if (!nomeAluno.trim()) throw new Error("O nome do aluno não pode ser vazio.");
  if (!nomeTrilha.trim()) throw new Error("O nome da trilha não pode ser vazio.");

  const trilha = buscarPorNome(nomeTrilha);
  const codigo = `DIO-${year()}-${randomAlpha(8)}`;
  const dataHoje = today();

  if (!trilha) {
    const markdown = `## 📜 CERTIFICADO DE CONCLUSÃO\n\n**Aluno(a):** ${nomeAluno}\n**Trilha:** ${nomeTrilha}\n**Código:** \`${codigo}\`\n**Data:** ${dataHoje}\n\n> ⚠️ Trilha não encontrada no catálogo — certificado emitido com dados informados pelo usuário.`;
    return {
      nome_aluno: nomeAluno,
      trilha_nome: nomeTrilha,
      codigo,
      trilha_encontrada: false,
      markdown,
    };
  }

  const competencias = trilha.tecnologia
    .map((t) => `- ✅ **${t}** — Competência adquirida em ${t}`)
    .join("\n");
  const badges = trilha.badges_disponiveis
    .map((b) => `🥇 \`${b}\``)
    .join("  ");

  const markdown = `## 📜 CERTIFICADO DE CONCLUSÃO

\`\`\`
╔══════════════════════════════════════════════════════════════════╗
║                  🎓  CERTIFICADO DE CONCLUSÃO  🎓                ║
║                     Digital Innovation One                       ║
╚══════════════════════════════════════════════════════════════════╝
\`\`\`

## 📜 Certificamos que

# 🏅 ${nomeAluno}

concluiu com êxito a trilha de aprendizagem:

## 🎯 "${trilha.nome}"

---

### 📊 Detalhes da Conquista

| Campo | Informação |
|---|---|
| 👤 Aluno(a) | **${nomeAluno}** |
| 🎓 Trilha | ${trilha.nome} |
| 🏷️ Nível | ${trilha.nivel} |
| 📦 Módulos Concluídos | ${trilha.numero_de_modulos} módulos |
| ⭐ XP Conquistado | ${trilha.xp_total} XP |
| 📅 Data de Conclusão | ${dataHoje} |
| 🔑 Código do Certificado | \`${codigo}\` |

---

### 🛠️ Competências Adquiridas

${competencias}

---

### 🏆 Badges Conquistadas

${badges}

---

> 🔐 **Autenticidade:** Verifique em \`dio.me/certificate/${codigo}\`
> 📢 **Compartilhe:** Adicione ao seu LinkedIn! #DIO #${trilha.tecnologia[0]}`;

  return {
    nome_aluno: nomeAluno,
    trilha_nome: trilha.nome,
    codigo,
    trilha_encontrada: true,
    markdown,
  };
}
