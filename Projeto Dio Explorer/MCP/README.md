# Geo-Explorer — MCP Server

Servidor MCP do projeto **Geo-Explorer**, expondo as ferramentas `/trilha`, `/desafio` e `/certificado` via protocolo MCP (Model Context Protocol).

Suporta três modos de acesso:
- **stdio** — integração direta com o Bob (IBM Bob / Claude Desktop)
- **HTTP** — API REST + endpoint MCP acessível via rede
- **HTTPS (TLS)** — mesmo que HTTP, com criptografia ponta a ponta
- **SSO / OAuth 2.0** — autenticação federada via provider externo (Google, Keycloak, Okta, Azure AD…)

---

## Estrutura

```
MCP/
├── src/
│   ├── index.ts          # Entry-point do servidor
│   ├── auth.ts           # Middleware de autenticação (API Key + JWT OAuth)
│   ├── oauth.ts          # Rotas SSO/OAuth 2.0
│   ├── https-server.ts   # Wrapper TLS para o Express
│   ├── tools.ts          # Lógica das ferramentas MCP
│   ├── dio-data.ts       # Carregamento do catálogo de trilhas
│   └── setup-api-key.ts  # Script de geração de API Key
├── build/                # Compilado TypeScript (gerado por npm run build)
├── .env.example          # Template de variáveis de ambiente
├── package.json
└── tsconfig.json
```

---

## Instalação

```bash
cd "Projeto Dio Explorer/MCP"
npm install
npm run build
```

---

## Modo 1 — stdio (Bob / Claude Desktop)

Modo padrão. O processo é gerenciado diretamente pelo cliente MCP (Bob).

```bash
node build/index.js
```

### Registro no Bob (mcp.json)

```json
{
  "mcpServers": {
    "geo-explorer": {
      "command": "node",
      "args": ["<caminho-absoluto>/MCP/build/index.js"]
    }
  }
}
```

---

## Modo 2 — HTTP

```bash
# Gera a API Key e cria o .env
node build/setup-api-key.js

# Inicia o servidor HTTP na porta 3000
DIO_API_KEY=<sua-chave> node build/index.js --transport http
```

### Endpoints disponíveis

| Método | Endpoint            | Auth | Descrição                              |
|--------|---------------------|------|----------------------------------------|
| GET    | `/health`           | ❌   | Health-check                           |
| POST   | `/mcp`              | ✅   | Endpoint MCP (Streamable HTTP)         |
| GET    | `/api/trilhas`      | ✅   | Catálogo de trilhas em JSON            |
| GET    | `/oauth/authorize`  | ❌   | Inicia fluxo SSO                       |
| GET    | `/oauth/callback`   | ❌   | Callback OAuth 2.0                     |
| POST   | `/oauth/token`      | ❌   | Client Credentials Grant               |
| POST   | `/oauth/introspect` | ❌   | Introspecção de token                  |
| POST   | `/oauth/revoke`     | ❌   | Revogação de token                     |

### Formas de autenticação aceitas

```http
Authorization: Bearer <chave-ou-jwt>
X-API-Key: <chave>
GET /api/trilhas?api_key=<chave>
```

---

## Modo 3 — HTTPS (TLS)

Gere (ou forneça) um certificado e configure as variáveis antes de iniciar:

```bash
# Auto-assinado para desenvolvimento
openssl req -x509 -newkey rsa:4096 -keyout server.key -out server.crt \
  -days 365 -nodes -subj "/CN=localhost"

# Inicia o servidor HTTPS na porta 3443
DIO_API_KEY=<chave> \
DIO_TLS_CERT=./server.crt \
DIO_TLS_KEY=./server.key \
DIO_PORT=3443 \
node build/index.js --transport http
```

Para redirecionar HTTP → HTTPS automaticamente:

```bash
DIO_REDIRECT_HTTP=true DIO_HTTP_PORT=3000 DIO_PORT=3443 \
DIO_TLS_CERT=./server.crt DIO_TLS_KEY=./server.key \
DIO_API_KEY=<chave> node build/index.js --transport http
```

### Registro no Bob (acesso remoto HTTPS)

```json
{
  "mcpServers": {
    "geo-explorer-remote": {
      "url": "https://seu-servidor.com:3443/mcp",
      "headers": {
        "Authorization": "Bearer ${env:DIO_API_KEY}"
      }
    }
  }
}
```

---

## Modo 4 — SSO / OAuth 2.0

### Authorization Code Flow (browser/usuário)

1. O usuário acessa `GET /oauth/authorize`
2. É redirecionado para o provider externo
3. Após consentimento, o callback (`GET /oauth/callback`) troca o `code` pelo token interno DIO
4. O token JWT é usado nas requisições subsequentes com `Authorization: Bearer <jwt>`

### Client Credentials Grant (M2M / API→API)

```bash
curl -X POST https://seu-servidor.com/oauth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "client_credentials",
    "client_id": "<DIO_OAUTH_CLIENT_ID>",
    "client_secret": "<DIO_OAUTH_CLIENT_SECRET>"
  }'
```

Resposta:
```json
{
  "access_token": "<jwt>",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

Use o `access_token` como Bearer token nas chamadas ao `/mcp`.

### Introspecção de token

```bash
curl -X POST https://seu-servidor.com/oauth/introspect \
  -H "Content-Type: application/json" \
  -d '{"token": "<jwt>"}'
```

### Providers suportados (Authorization Code Flow)

Qualquer provider OAuth 2.0 compatível com `response_type=code`. Exemplos:

| Provider    | DIO_OAUTH_PROVIDER                              |
|-------------|------------------------------------------------|
| Google      | `https://accounts.google.com`                  |
| Keycloak    | `https://keycloak.exemplo.com/realms/minha`    |
| Okta        | `https://dev-xxxxx.okta.com/oauth2/default`    |
| Azure AD    | `https://login.microsoftonline.com/<tenant-id>/v2.0` |

### Modo demo (sem provider externo)

Se `DIO_OAUTH_PROVIDER` não estiver configurado, as rotas OAuth respondem com tokens gerados localmente — útil para desenvolvimento e testes sem provider real.

---

## Variáveis de ambiente

Copie `.env.example` para `.env` e preencha:

| Variável                | Obrigatório | Descrição                                              |
|-------------------------|-------------|--------------------------------------------------------|
| `DIO_API_KEY`           | HTTP/HTTPS  | Chave estática de acesso                               |
| `DIO_JWT_SECRET`        | OAuth       | Segredo para assinar/validar tokens JWT                |
| `DIO_PORT`              | HTTP/HTTPS  | Porta do servidor (padrão: 3000 / 3443 com TLS)        |
| `DIO_TLS_CERT`          | HTTPS       | Caminho do certificado PEM                             |
| `DIO_TLS_KEY`           | HTTPS       | Caminho da chave privada PEM                           |
| `DIO_TLS_CA`            | HTTPS       | Caminho da CA intermediária (opcional)                 |
| `DIO_REDIRECT_HTTP`     | HTTPS       | `true` para redirecionar HTTP → HTTPS                  |
| `DIO_HTTP_PORT`         | HTTPS       | Porta HTTP de redirecionamento (padrão: 3000)          |
| `DIO_OAUTH_PROVIDER`    | SSO         | URL base do provider OAuth                             |
| `DIO_OAUTH_CLIENT_ID`   | SSO         | Client ID                                              |
| `DIO_OAUTH_CLIENT_SECRET` | SSO       | Client Secret                                          |
| `DIO_OAUTH_REDIRECT_URI` | SSO        | Callback URL registrada no provider                    |
| `DIO_OAUTH_SCOPES`      | SSO         | Escopos (padrão: `openid profile email`)               |
| `DIO_TOKEN_TTL_SECONDS` | OAuth       | TTL do token em segundos (padrão: 3600)                |
| `DIO_AUTH_DISABLED`     | Dev         | `true` desativa toda autenticação                      |

---

## Ferramentas MCP expostas

| Ferramenta           | Descrição                                            |
|----------------------|------------------------------------------------------|
| `trilha_buscar`      | Busca trilhas por tecnologia (Java, Python, React…)  |
| `desafio_gerar`      | Gera desafio de código com XP e badge                |
| `certificado_emitir` | Emite certificado de conclusão de trilha             |

## Recursos MCP expostos

| URI                   | Descrição                              |
|-----------------------|----------------------------------------|
| `dio://trilhas`       | Catálogo completo de trilhas em JSON   |
| `dio://trilha/{id}`   | Trilha individual pelo ID              |

## Prompts MCP expostos

| Prompt               | Descrição                                            |
|----------------------|------------------------------------------------------|
| `plano_de_estudos`   | Plano semanal personalizado para uma trilha e aluno  |

---

## Build e scripts

```bash
npm run build          # Compila TypeScript → build/
npm run dev            # Modo watch (recarrega ao salvar)
npm run start:stdio    # Inicia em modo stdio
npm run start:http     # Inicia em modo HTTP (requer DIO_API_KEY)
npm run setup-key      # Gera API Key e cria .env
```
