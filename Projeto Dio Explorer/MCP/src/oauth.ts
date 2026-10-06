/**
 * oauth.ts
 * Implementação de SSO via OAuth 2.0 Authorization Code Flow para o DIO Explorer MCP.
 *
 * Fluxo suportado:
 *   1. GET  /oauth/authorize  → redireciona o usuário para o provider OAuth externo
 *   2. GET  /oauth/callback   → recebe o code, troca por access_token
 *   3. POST /oauth/token      → Client Credentials Grant (M2M / API → API)
 *   4. POST /oauth/introspect → valida um token emitido localmente
 *   5. POST /oauth/revoke     → revoga um token
 *
 * Variáveis de ambiente:
 *   DIO_OAUTH_PROVIDER        URL base do provider (ex: https://accounts.google.com)
 *   DIO_OAUTH_CLIENT_ID       Client ID registrado no provider
 *   DIO_OAUTH_CLIENT_SECRET   Client Secret (nunca expor em logs)
 *   DIO_OAUTH_REDIRECT_URI    Callback URL registrada (ex: https://meu-servidor.com/oauth/callback)
 *   DIO_OAUTH_SCOPES          Escopos separados por espaço (padrão: "openid profile email")
 *   DIO_JWT_SECRET            Segredo para assinar tokens internos (mín. 32 chars)
 *   DIO_TOKEN_TTL_SECONDS     TTL dos tokens internos (padrão: 3600)
 *
 * Modo local (sem provider externo):
 *   Se DIO_OAUTH_PROVIDER não estiver definido, as rotas respondem com tokens
 *   "demo" assinados localmente — útil para desenvolvimento offline.
 */

import { Router, type Request, type Response } from "express";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getEnv(key: string): string {
  return process.env[key] ?? "";
}

function base64url(data: string | Buffer): string {
  const buf = typeof data === "string" ? Buffer.from(data) : data;
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

/**
 * Assina e gera um JWT mínimo (HS256) sem dependência externa.
 * Para produção, substitua por uma biblioteca como `jose` (já instalada).
 */
function signJwt(payload: Record<string, unknown>, secret: string, ttl: number): string {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const body = base64url(
    JSON.stringify({ ...payload, iat: now, exp: now + ttl })
  );
  const sig = base64url(
    createHmac("sha256", secret).update(`${header}.${body}`).digest()
  );
  return `${header}.${body}.${sig}`;
}

function verifyJwt(
  token: string,
  secret: string
): Record<string, unknown> | null {
  try {
    const [header, body, sig] = token.split(".");
    if (!header || !body || !sig) return null;
    const expected = base64url(
      createHmac("sha256", secret).update(`${header}.${body}`).digest()
    );
    const a = Buffer.from(sig, "base64");
    const b = Buffer.from(expected, "base64");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const claims = JSON.parse(Buffer.from(body, "base64").toString()) as Record<
      string,
      unknown
    >;
    if (typeof claims.exp === "number" && claims.exp < Math.floor(Date.now() / 1000)) {
      return null; // expirado
    }
    return claims;
  } catch {
    return null;
  }
}

// Token store em memória (substitua por Redis/DB em produção)
const revokedTokens = new Set<string>();
const pendingStates = new Map<string, { codeVerifier?: string; redirectAfter?: string }>();

// ─── Router ───────────────────────────────────────────────────────────────────

export function buildOAuthRouter(): Router {
  const router = Router();

  const PROVIDER = getEnv("DIO_OAUTH_PROVIDER");
  const CLIENT_ID = getEnv("DIO_OAUTH_CLIENT_ID");
  const CLIENT_SECRET = getEnv("DIO_OAUTH_CLIENT_SECRET");
  const REDIRECT_URI = getEnv("DIO_OAUTH_REDIRECT_URI");
  const SCOPES = getEnv("DIO_OAUTH_SCOPES") || "openid profile email";
  const JWT_SECRET = getEnv("DIO_JWT_SECRET") || randomBytes(32).toString("hex");
  const TOKEN_TTL = parseInt(getEnv("DIO_TOKEN_TTL_SECONDS") || "3600", 10);

  const demoMode = !PROVIDER || !CLIENT_ID;

  // ── GET /oauth/authorize ────────────────────────────────────────────────────
  router.get("/authorize", (req: Request, res: Response) => {
    if (demoMode) {
      // Modo demo: gera token local imediatamente sem redirect externo
      const token = signJwt(
        { sub: "demo-user", scope: SCOPES, mode: "demo" },
        JWT_SECRET,
        TOKEN_TTL
      );
      res.json({
        note: "DIO_OAUTH_PROVIDER not configured — demo token issued",
        access_token: token,
        token_type: "Bearer",
        expires_in: TOKEN_TTL,
        scope: SCOPES,
      });
      return;
    }

    const state = randomBytes(16).toString("hex");
    pendingStates.set(state, { redirectAfter: req.query.redirect_after as string });

    const params = new URLSearchParams({
      response_type: "code",
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      scope: SCOPES,
      state,
    });

    const authorizeUrl = `${PROVIDER}/oauth2/authorize?${params.toString()}`;
    res.redirect(302, authorizeUrl);
  });

  // ── GET /oauth/callback ─────────────────────────────────────────────────────
  router.get("/callback", async (req: Request, res: Response) => {
    const { code, state, error } = req.query as Record<string, string>;

    if (error) {
      res.status(400).json({ error, description: "Provider rejected the authorization request." });
      return;
    }

    if (!code || !state || !pendingStates.has(state)) {
      res.status(400).json({ error: "invalid_request", description: "Missing code or invalid state." });
      return;
    }

    pendingStates.delete(state);

    if (demoMode) {
      const token = signJwt(
        { sub: "demo-user", scope: SCOPES, mode: "demo" },
        JWT_SECRET,
        TOKEN_TTL
      );
      res.json({ access_token: token, token_type: "Bearer", expires_in: TOKEN_TTL });
      return;
    }

    // Troca code por access_token
    try {
      const tokenUrl = `${PROVIDER}/oauth2/token`;
      const body = new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      });

      const upstream = await fetch(tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });

      if (!upstream.ok) {
        const text = await upstream.text();
        res.status(upstream.status).json({ error: "upstream_token_error", description: text });
        return;
      }

      const tokenData = (await upstream.json()) as Record<string, unknown>;

      // Emite token interno DIO assinado (envelopa o sub do provider)
      const sub = typeof tokenData.sub === "string" ? tokenData.sub : "unknown";
      const dioToken = signJwt(
        { sub, scope: SCOPES, upstream_token: tokenData.access_token },
        JWT_SECRET,
        TOKEN_TTL
      );

      res.json({
        access_token: dioToken,
        token_type: "Bearer",
        expires_in: TOKEN_TTL,
        scope: SCOPES,
      });
    } catch (err) {
      res.status(502).json({
        error: "upstream_unreachable",
        description: err instanceof Error ? err.message : String(err),
      });
    }
  });

  // ── POST /oauth/token — Client Credentials Grant ────────────────────────────
  router.post("/token", (req: Request, res: Response) => {
    const { grant_type, client_id, client_secret, scope } = req.body as Record<string, string>;

    if (grant_type !== "client_credentials") {
      res.status(400).json({
        error: "unsupported_grant_type",
        description: "Only 'client_credentials' is supported on this endpoint.",
      });
      return;
    }

    // Valida client_id + client_secret
    const expectedId = getEnv("DIO_OAUTH_CLIENT_ID");
    const expectedSecret = getEnv("DIO_OAUTH_CLIENT_SECRET");

    if (!expectedId || !expectedSecret) {
      if (demoMode) {
        const token = signJwt(
          { sub: client_id || "m2m-client", scope: scope || SCOPES, mode: "demo" },
          JWT_SECRET,
          TOKEN_TTL
        );
        res.json({ access_token: token, token_type: "Bearer", expires_in: TOKEN_TTL });
        return;
      }
      res.status(500).json({ error: "server_misconfigured", description: "OAuth credentials not set." });
      return;
    }

    const idMatch = Buffer.from(client_id ?? "").equals(Buffer.from(expectedId));
    const secretMatch = timingSafeEqual(
      Buffer.from(client_secret ?? ""),
      Buffer.from(expectedSecret)
    );

    if (!idMatch || !secretMatch) {
      res.status(401).json({ error: "invalid_client", description: "Invalid client_id or client_secret." });
      return;
    }

    const token = signJwt(
      { sub: client_id, scope: scope || SCOPES, grant: "client_credentials" },
      JWT_SECRET,
      TOKEN_TTL
    );

    res.json({
      access_token: token,
      token_type: "Bearer",
      expires_in: TOKEN_TTL,
      scope: scope || SCOPES,
    });
  });

  // ── POST /oauth/introspect ──────────────────────────────────────────────────
  router.post("/introspect", (req: Request, res: Response) => {
    const { token } = req.body as { token?: string };

    if (!token) {
      res.status(400).json({ error: "invalid_request", description: "Missing token parameter." });
      return;
    }

    if (revokedTokens.has(token)) {
      res.json({ active: false });
      return;
    }

    const claims = verifyJwt(token, JWT_SECRET);
    if (!claims) {
      res.json({ active: false });
      return;
    }

    res.json({ active: true, ...claims });
  });

  // ── POST /oauth/revoke ──────────────────────────────────────────────────────
  router.post("/revoke", (req: Request, res: Response) => {
    const { token } = req.body as { token?: string };
    if (token) revokedTokens.add(token);
    // RFC 7009 — sempre responde 200
    res.status(200).json({ revoked: !!token });
  });

  return router;
}

/**
 * Valida um Bearer token JWT emitido pelo servidor OAuth local.
 * Retorna os claims decodificados ou null se inválido/expirado/revogado.
 */
export function validateOAuthToken(token: string): Record<string, unknown> | null {
  if (revokedTokens.has(token)) return null;
  const secret = getEnv("DIO_JWT_SECRET") || "";
  if (!secret) return null;
  return verifyJwt(token, secret);
}
