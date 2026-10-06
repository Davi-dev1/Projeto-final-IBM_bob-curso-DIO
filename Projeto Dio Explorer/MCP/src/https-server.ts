/**
 * https-server.ts
 * Wrapper HTTPS (TLS) para o servidor Express do DIO Explorer MCP.
 *
 * Variáveis de ambiente:
 *   DIO_TLS_CERT   Caminho para o certificado PEM (ex: /certs/server.crt)
 *   DIO_TLS_KEY    Caminho para a chave privada PEM (ex: /certs/server.key)
 *   DIO_TLS_CA     (opcional) Caminho para CA intermediária / chain
 *   DIO_PORT       Porta HTTPS (padrão: 3443)
 *   DIO_HTTP_PORT  Porta HTTP redirect (padrão: 3000) — apenas se DIO_REDIRECT_HTTP=true
 *   DIO_REDIRECT_HTTP  true → sobe um servidor HTTP simples que redireciona para HTTPS
 *
 * Sem certificados configurados, o servidor opera em HTTP puro (modo dev).
 */

import https from "https";
import http from "http";
import { readFileSync } from "fs";
import type { Express } from "express";

export interface TlsConfig {
  cert: string;
  key: string;
  ca?: string;
}

/**
 * Tenta carregar a configuração TLS das variáveis de ambiente.
 * Retorna null se DIO_TLS_CERT ou DIO_TLS_KEY não estiverem definidos.
 */
export function loadTlsConfig(): TlsConfig | null {
  const certPath = process.env.DIO_TLS_CERT;
  const keyPath = process.env.DIO_TLS_KEY;

  if (!certPath || !keyPath) return null;

  try {
    const config: TlsConfig = {
      cert: readFileSync(certPath, "utf-8"),
      key: readFileSync(keyPath, "utf-8"),
    };
    if (process.env.DIO_TLS_CA) {
      config.ca = readFileSync(process.env.DIO_TLS_CA, "utf-8");
    }
    return config;
  } catch (err) {
    console.error(
      "[tls] Erro ao carregar certificados TLS:",
      err instanceof Error ? err.message : err
    );
    return null;
  }
}

/**
 * Inicia o servidor Express em HTTPS (se TLS disponível) ou HTTP simples.
 * Opcionalmente, sobe um servidor HTTP de redirecionamento para HTTPS.
 */
export function startServer(app: Express): void {
  const httpsPort = parseInt(process.env.DIO_PORT ?? "3443", 10);
  const httpPort = parseInt(process.env.DIO_HTTP_PORT ?? "3000", 10);
  const tls = loadTlsConfig();

  if (tls) {
    // ── Servidor HTTPS ────────────────────────────────────────────────────────
    const httpsServer = https.createServer(
      { cert: tls.cert, key: tls.key, ca: tls.ca },
      app
    );
    httpsServer.listen(httpsPort, "0.0.0.0", () => {
      console.error(
        `[dio-explorer-mcp] HTTPS server listening on https://0.0.0.0:${httpsPort}`
      );
      console.error(
        `[dio-explorer-mcp] MCP endpoint: POST https://0.0.0.0:${httpsPort}/mcp`
      );
    });

    // ── Redirecionamento HTTP → HTTPS (opcional) ──────────────────────────────
    if (process.env.DIO_REDIRECT_HTTP === "true") {
      http
        .createServer((req, res) => {
          const host = (req.headers.host ?? "localhost").split(":")[0];
          res.writeHead(301, {
            Location: `https://${host}:${httpsPort}${req.url ?? "/"}`,
          });
          res.end();
        })
        .listen(httpPort, "0.0.0.0", () => {
          console.error(
            `[dio-explorer-mcp] HTTP→HTTPS redirect on http://0.0.0.0:${httpPort}`
          );
        });
    }
  } else {
    // ── Fallback HTTP (sem TLS) ───────────────────────────────────────────────
    app.listen(httpPort, "0.0.0.0", () => {
      console.error(
        `[dio-explorer-mcp] HTTP server listening on http://0.0.0.0:${httpPort}`
      );
      console.error(
        `[dio-explorer-mcp] MCP endpoint: POST http://0.0.0.0:${httpPort}/mcp`
      );
      console.error(
        "[dio-explorer-mcp] TLS not configured — running in plain HTTP mode"
      );
    });
  }
}
