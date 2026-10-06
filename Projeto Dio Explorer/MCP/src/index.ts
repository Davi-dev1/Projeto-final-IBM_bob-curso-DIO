#!/usr/bin/env node
/**
 * index.ts — Geo-Explorer MCP Server
 *
 * Modos de transporte:
 *   stdio (padrão) : node build/index.js
 *   http           : node build/index.js --transport http
 *   https          : node build/index.js --transport http  (+ DIO_TLS_CERT + DIO_TLS_KEY)
 *
 * Variáveis de ambiente (modo HTTP/HTTPS):
 *   DIO_API_KEY          Chave de acesso via header/query (Bearer / X-API-Key / ?api_key=)
 *   DIO_PORT             Porta HTTP (padrão: 3000) ou HTTPS (padrão: 3443 se TLS configurado)
 *   DIO_AUTH_DISABLED    true → desativa autenticação (apenas dev local)
 *
 *   TLS (HTTPS):
 *   DIO_TLS_CERT         Caminho para o certificado PEM
 *   DIO_TLS_KEY          Caminho para a chave privada PEM
 *   DIO_TLS_CA           Caminho para CA intermediária (opcional)
 *   DIO_REDIRECT_HTTP    true → sobe servidor HTTP que redireciona para HTTPS
 *   DIO_HTTP_PORT        Porta do redirect HTTP (padrão: 3000)
 *
 *   SSO / OAuth 2.0:
 *   DIO_OAUTH_PROVIDER       URL base do provider (ex: https://accounts.google.com)
 *   DIO_OAUTH_CLIENT_ID      Client ID registrado no provider
 *   DIO_OAUTH_CLIENT_SECRET  Client Secret
 *   DIO_OAUTH_REDIRECT_URI   Callback URL (ex: https://meu-servidor.com/oauth/callback)
 *   DIO_OAUTH_SCOPES         Escopos (padrão: "openid profile email")
 *   DIO_JWT_SECRET           Segredo para assinar tokens internos (mín. 32 chars)
 *   DIO_TOKEN_TTL_SECONDS    TTL dos tokens (padrão: 3600)
 *
 * Ferramentas expostas:
 *   trilha_buscar        Busca trilhas por tecnologia
 *   desafio_gerar        Gera um desafio de código
 *   certificado_emitir   Emite um certificado de conclusão
 *
 * Recursos expostos:
 *   dio://trilhas                    Lista todas as trilhas (JSON)
 *   dio://trilha/{id}                Trilha por ID
 *
 * Prompts expostos:
 *   plano_de_estudos                 Gera um prompt de plano de estudos personalizado
 *
 * Endpoints HTTP extras:
 *   GET  /health                     Health-check público
 *   GET  /api/trilhas                Catálogo REST (autenticado)
 *   POST /mcp                        Endpoint MCP principal
 *   GET  /oauth/authorize            Inicia fluxo SSO
 *   GET  /oauth/callback             Callback OAuth
 *   POST /oauth/token                Client Credentials Grant
 *   POST /oauth/introspect           Introspecção de token
 *   POST /oauth/revoke               Revogação de token
 */

import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import express from "express";
import { getTrilhas } from "./dio-data.js";
import { toolTrilha, toolDesafio, toolCertificado } from "./tools.js";
import { authMiddleware } from "./auth.js";
import { buildOAuthRouter } from "./oauth.js";
import { startServer } from "./https-server.js";

// ─────────────────────────────────────────────────────────────────────────────
// Criação e configuração do servidor MCP
// ─────────────────────────────────────────────────────────────────────────────

const server = new McpServer({
  name: "geo-explorer-mcp",
  version: "1.0.0",
});

// ─────────────────────────────────────────────────────────────────────────────
// TOOL: trilha_buscar
// ─────────────────────────────────────────────────────────────────────────────

server.registerTool(
  "trilha_buscar",
  {
    description:
      "Busca trilhas de aprendizagem da DIO por tecnologia. Retorna plano de estudos, " +
      "módulos, badges, lives e promoções ativas. Equivalente ao comando /trilha.",
    inputSchema: z.object({
      tecnologia: z
        .string()
        .describe(
          "Nome ou parte do nome da tecnologia (ex: Java, Python, React, AWS, Kotlin)"
        ),
    }),
  },
  async ({ tecnologia }) => {
    try {
      const result = toolTrilha(tecnologia);
      return {
        content: [
          {
            type: "text",
            text: result.markdown,
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text",
            text: `Erro ao buscar trilha: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// TOOL: desafio_gerar
// ─────────────────────────────────────────────────────────────────────────────

server.registerTool(
  "desafio_gerar",
  {
    description:
      "Gera um desafio de código criativo para uma tecnologia e nível específicos. " +
      "Retorna descrição, exemplos, critérios de avaliação, XP e badge. " +
      "Equivalente ao comando /desafio.",
    inputSchema: z.object({
      tecnologia: z
        .string()
        .describe("Linguagem ou tecnologia do desafio (ex: Java, Python, TypeScript)"),
      nivel: z
        .enum(["iniciante", "intermediário", "intermediario", "avançado", "avancado"])
        .describe("Nível de dificuldade do desafio"),
    }),
  },
  async ({ tecnologia, nivel }) => {
    try {
      const result = toolDesafio(tecnologia, nivel);
      return {
        content: [
          {
            type: "text",
            text: result.markdown,
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text",
            text: `Erro ao gerar desafio: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// TOOL: certificado_emitir
// ─────────────────────────────────────────────────────────────────────────────

server.registerTool(
  "certificado_emitir",
  {
    description:
      "Emite um certificado de conclusão de trilha para um aluno. " +
      "Busca automaticamente os dados reais da trilha no catálogo DIO. " +
      "Equivalente ao comando /certificado.",
    inputSchema: z.object({
      nome_aluno: z
        .string()
        .describe("Nome completo do aluno que concluiu a trilha"),
      trilha: z
        .string()
        .describe(
          "Nome ou tecnologia da trilha concluída (ex: Java, Full Stack, Python)"
        ),
    }),
  },
  async ({ nome_aluno, trilha }) => {
    try {
      const result = toolCertificado(nome_aluno, trilha);
      return {
        content: [
          {
            type: "text",
            text: result.markdown,
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text",
            text: `Erro ao emitir certificado: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// RESOURCE: dio://trilhas  (lista completa em JSON)
// ─────────────────────────────────────────────────────────────────────────────

server.registerResource(
  "trilhas-catalogo",
  "dio://trilhas",
  {
    title: "Catálogo de Trilhas DIO",
    description: "Lista completa de todas as trilhas disponíveis no catálogo DIO em formato JSON.",
    mimeType: "application/json",
  },
  async () => {
    const trilhas = getTrilhas();
    return {
      contents: [
        {
          uri: "dio://trilhas",
          mimeType: "application/json",
          text: JSON.stringify(trilhas, null, 2),
        },
      ],
    };
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// RESOURCE TEMPLATE: dio://trilha/{id}
// ─────────────────────────────────────────────────────────────────────────────

server.registerResource(
  "trilha-por-id",
  new ResourceTemplate("dio://trilha/{id}", { list: undefined }),
  {
    title: "Trilha por ID",
    description: "Retorna os dados completos de uma trilha pelo seu ID numérico.",
    mimeType: "application/json",
  },
  async (uri, { id }) => {
    const trilhas = getTrilhas();
    const trilha = trilhas.find((t) => String(t.id) === String(id));
    if (!trilha) {
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify({ error: `Trilha com id=${id} não encontrada.` }),
          },
        ],
      };
    }
    return {
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(trilha, null, 2),
        },
      ],
    };
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// PROMPT: plano_de_estudos
// ─────────────────────────────────────────────────────────────────────────────

server.registerPrompt(
  "plano_de_estudos",
  {
    title: "Plano de Estudos Personalizado",
    description:
      "Gera um prompt estruturado para criar um plano de estudos personalizado baseado " +
      "em uma trilha DIO e no perfil do aluno.",
    argsSchema: {
      nome_aluno: z.string().describe("Nome do aluno"),
      tecnologia: z.string().describe("Tecnologia de interesse (ex: Java, Python, React)"),
      horas_por_semana: z
        .string()
        .describe("Horas disponíveis por semana para estudo (ex: 10, 20)"),
    },
  },
  async ({ nome_aluno, tecnologia, horas_por_semana }) => ({
    messages: [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text:
            `Crie um plano de estudos personalizado para ${nome_aluno} que deseja aprender ${tecnologia}.\n` +
            `O aluno tem disponibilidade de ${horas_por_semana} horas por semana.\n\n` +
            `Use a ferramenta \`trilha_buscar\` com a tecnologia "${tecnologia}" para obter os módulos e badges reais da DIO.\n\n` +
            `O plano deve incluir:\n` +
            `1. Cronograma semanal detalhado\n` +
            `2. Objetivos por semana\n` +
            `3. Recursos recomendados por módulo\n` +
            `4. Marcos de progresso (quando gerar o certificado)\n` +
            `5. Dicas de produtividade para o perfil descrito`,
        },
      },
    ],
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// TRANSPORTE: stdio vs HTTP/HTTPS
// ─────────────────────────────────────────────────────────────────────────────

const useHttp =
  process.argv.includes("--transport") &&
  process.argv[process.argv.indexOf("--transport") + 1] === "http";

async function startStdio(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[geo-explorer-mcp] Server running on stdio");
}

async function startHttp(): Promise<void> {
  const { StreamableHTTPServerTransport } = await import(
    "@modelcontextprotocol/sdk/server/streamableHttp.js"
  );

  const app = express();
  app.use(express.json());

  // ── Rotas OAuth / SSO ─────────────────────────────────────────────────────
  app.use("/oauth", buildOAuthRouter());

  // ── Health check público (sem autenticação) ───────────────────────────────
  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      server: "geo-explorer-mcp",
      version: "1.0.0",
      transport: "http",
      tls: !!(process.env.DIO_TLS_CERT && process.env.DIO_TLS_KEY),
      oauth: !!process.env.DIO_OAUTH_PROVIDER,
      endpoints: {
        mcp: "POST /mcp",
        health: "GET /health",
        catalog: "GET /api/trilhas",
        oauth: {
          authorize: "GET /oauth/authorize",
          callback: "GET /oauth/callback",
          token: "POST /oauth/token",
          introspect: "POST /oauth/introspect",
          revoke: "POST /oauth/revoke",
        },
      },
    });
  });

  // ── Endpoint de catálogo REST simples ─────────────────────────────────────
  app.get("/api/trilhas", authMiddleware, (_req, res) => {
    res.json({ trilhas: getTrilhas() });
  });

  // ── Endpoint MCP principal (Streamable HTTP Transport) ────────────────────
  app.post("/mcp", authMiddleware, async (req, res) => {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () =>
        `dio-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  // Delega ao módulo https-server (suporta TLS automático)
  startServer(app);
}

// ─────────────────────────────────────────────────────────────────────────────
// Entry-point
// ─────────────────────────────────────────────────────────────────────────────

(useHttp ? startHttp() : startStdio()).catch((err) => {
  console.error("[geo-explorer-mcp] Fatal error:", err);
  process.exit(1);
});
