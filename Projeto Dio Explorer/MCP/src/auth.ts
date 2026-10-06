/**
 * auth.ts
 * Middleware de autenticação para o transporte HTTP.
 *
 * Ordem de verificação:
 *   1. JWT Bearer emitido pelo servidor OAuth local (DIO_JWT_SECRET)
 *   2. Static API Key (DIO_API_KEY) via Bearer / X-API-Key header / ?api_key= query
 *
 * Variáveis de ambiente:
 *   DIO_API_KEY         Chave estática de acesso
 *   DIO_JWT_SECRET      Segredo para validar JWTs emitidos via /oauth/*
 *   DIO_AUTH_DISABLED   true → desativa autenticação (apenas para desenvolvimento local)
 */

import type { Request, Response, NextFunction } from "express";
import { createHmac, timingSafeEqual } from "crypto";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function base64url(data: Buffer): string {
  return data.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function verifyJwt(token: string, secret: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const [header, body, sig] = parts as [string, string, string];

    const expected = base64url(
      createHmac("sha256", secret).update(`${header}.${body}`).digest()
    );
    const a = Buffer.from(sig, "base64");
    const b = Buffer.from(expected, "base64");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return false;

    const claims = JSON.parse(Buffer.from(body, "base64url").toString()) as Record<
      string,
      unknown
    >;
    if (typeof claims.exp === "number" && claims.exp < Math.floor(Date.now() / 1000)) {
      return false; // token expirado
    }
    return true;
  } catch {
    return false;
  }
}

// ─── Middleware ───────────────────────────────────────────────────────────────

const API_KEY = process.env.DIO_API_KEY ?? "";
const JWT_SECRET = process.env.DIO_JWT_SECRET ?? "";
const AUTH_DISABLED = process.env.DIO_AUTH_DISABLED === "true";

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Permite desativar auth em desenvolvimento local
  if (AUTH_DISABLED) {
    console.error(
      "[auth] WARNING: authentication is DISABLED (DIO_AUTH_DISABLED=true)"
    );
    next();
    return;
  }

  if (!API_KEY && !JWT_SECRET) {
    res.status(500).json({
      error:
        "Server misconfigured: set DIO_API_KEY (static key) or DIO_JWT_SECRET (OAuth JWT) — or both.",
    });
    return;
  }

  // Extrai token de: Authorization header OU X-API-Key header OU query string
  const authHeader = req.headers["authorization"];
  const apiKeyHeader = req.headers["x-api-key"] as string | undefined;
  const apiKeyQuery = req.query["api_key"] as string | undefined;

  let provided: string | undefined;

  if (authHeader?.startsWith("Bearer ")) {
    provided = authHeader.slice(7);
  } else if (apiKeyHeader) {
    provided = apiKeyHeader;
  } else if (apiKeyQuery) {
    provided = apiKeyQuery;
  }

  if (!provided) {
    res.status(401).json({
      error: "Unauthorized",
      hint: "Provide credentials via:\n" +
        "  Authorization: Bearer <jwt-or-key>\n" +
        "  X-API-Key: <key>\n" +
        "  ?api_key=<key>\n" +
        "To obtain a JWT, call GET /oauth/authorize",
    });
    return;
  }

  // ── 1. Tentar validar como JWT OAuth ─────────────────────────────────────
  if (JWT_SECRET && verifyJwt(provided, JWT_SECRET)) {
    next();
    return;
  }

  // ── 2. Validar como API Key estática ─────────────────────────────────────
  if (API_KEY) {
    try {
      const a = Buffer.from(provided);
      const b = Buffer.from(API_KEY);
      if (a.length === b.length && timingSafeEqual(a, b)) {
        next();
        return;
      }
    } catch {
      // buffers de tamanhos diferentes → falha silenciosa, cai no 401 abaixo
    }
  }

  res.status(401).json({
    error: "Unauthorized",
    hint: "Token inválido, expirado ou API Key incorreta.",
  });
}
