# Geo-Explorer — Projeto Final IBM Bob × DIO

> Projeto final do curso **IBM Bob** promovido pela [Digital Innovation One (DIO)](https://dio.me).
> Integração completa entre IBM Bob, comandos personalizados, skills e um servidor MCP em TypeScript.

## 🆕 Novidade — Interface Visual (Front-End de Amostra)

> **✨ Melhoria adicionada:** Este projeto ganhou uma interface web moderna e responsiva, desenvolvida como **demonstração visual** do funcionamento do software. O front-end é uma **página estática de amostra** — ele não se conecta ao servidor MCP real nem executa os comandos de verdade. Seu objetivo é ilustrar de forma clara e acessível o que o projeto faz, permitindo que qualquer pessoa explore o catálogo de trilhas e entenda a proposta sem precisar instalar nada.

---

## 🌐 Acesse a Interface Web

<div align="center">

### 🔗 [https://davi-dev1.github.io/Projeto-final-IBM_bob-curso-DIO/](https://davi-dev1.github.io/Projeto-final-IBM_bob-curso-DIO/)

**Clique no link acima para abrir a interface diretamente no navegador — sem instalação.**

</div>

---

### 📌 O que é e o que NÃO é este front-end

| ✅ O que ele É | ❌ O que ele NÃO é |
|---|---|
| Uma vitrine visual do projeto | Um cliente real do servidor MCP |
| Demonstração dos comandos com saídas reais simuladas | Uma interface que executa `/trilha`, `/desafio` ou `/certificado` de verdade |
| Explorador interativo das 20+ trilhas do catálogo JSON | Um painel conectado a um back-end ao vivo |
| Página estática hospedada via GitHub Pages | Um sistema que requer servidor rodando |

> 💡 Para usar as funcionalidades reais, consulte a seção [Modos de Uso](#7-modos-de-uso) abaixo.

---

### 🖥️ O que você encontra na interface

- 🔍 **Explorador de Trilhas** — busca e filtragem das 20+ trilhas DIO com modal de detalhes completos
- ⚡ **Demo dos Comandos** — saída simulada dos comandos `/trilha`, `/desafio`, `/certificado`
- 🔌 **Demo MCP HTTP** — exemplo visual de chamada `curl` ao servidor
- 🧪 **Relatório de Testes** — cobertura visual das 10 suites e 53 testes unitários
- 🏗️ **Arquitetura** — visão geral das camadas e stack tecnológica do projeto

---


## 📋 Índice

1. [Visão Geral](#1-visão-geral)
2. [Arquitetura e Estrutura de Arquivos](#2-arquitetura-e-estrutura-de-arquivos)
3. [Comandos Bob](#3-comandos-bob)
4. [Skills Bob](#4-skills-bob)
5. [Servidor MCP](#5-servidor-mcp)
6. [Prompts Usados no Projeto](#6-prompts-usados-no-projeto)
7. [Modos de Uso](#7-modos-de-uso)
8. [Testes Unitários](#8-testes-unitários)
9. [Dicas de Uso](#9-dicas-de-uso)
10. [Insights para Futuros Profissionais](#10-insights-para-futuros-profissionais)

---

## 1. Visão Geral

O **Geo-Explorer** expõe três funcionalidades principais — busca de trilhas, geração de desafios de código e emissão de certificados — acessíveis de múltiplas formas:

| Camada | Tecnologia | Descrição |
|---|---|---|
| Comandos Bob | `.bob/commands/*.md` | Slash commands `/trilha`, `/desafio`, `/certificado` |
| Skills Bob | `.bob/skills/*/SKILL.md` | Skills invocáveis automaticamente pelo Bob |
| MCP Server | TypeScript + Node.js | 3 tools, 2 resources, 1 prompt via protocolo MCP |
| Testes | Python + pytest | 53 testes, 99% de cobertura |

---

## 2. Arquitetura e Estrutura de Arquivos

```
Projeto-final-IBM_bob-curso-DIO/
│
├── README.md                          ← Esta documentação
├── .bob/
│   ├── commands/
│   │   ├── trilha.md                  ← Slash command /trilha
│   │   ├── desafio.md                 ← Slash command /desafio
│   │   └── certificado.md             ← Slash command /certificado
│   └── skills/
│       ├── trilha/SKILL.md            ← Skill invocável pelo Bob
│       └── certificado/SKILL.md       ← Skill invocável pelo Bob
│
└── Projeto Dio Explorer/
    ├── data/
    │   └── trilhas dio.json           ← Catálogo com 20+ trilhas DIO
    ├── docs/
    │   └── resultado_testes.txt       ← Relatório de testes unitários
    ├── src/
    │   ├── dio_commands.py            ← Implementação Python dos comandos
    │   └── test_dio_commands.py       ← Suite de 53 testes pytest
    └── MCP/
        ├── src/
        │   ├── index.ts               ← Entry-point do servidor MCP
        │   ├── tools.ts               ← Lógica das 3 ferramentas
        │   ├── dio-data.ts            ← Carregamento do catálogo JSON
        │   ├── auth.ts                ← Middleware de autenticação
        │   ├── oauth.ts               ← Rotas SSO/OAuth 2.0
        │   ├── https-server.ts        ← Wrapper TLS Express
        │   └── setup-api-key.ts       ← Script de geração de API Key
        ├── build/                     ← JS compilado (npm run build)
        ├── package.json
        └── tsconfig.json
```

### Stack Tecnológica

| Camada | Tecnologia | Versão |
|---|---|---|
| MCP SDK | @modelcontextprotocol/sdk | ^1.12.0 |
| Runtime | Node.js (ESM) | ≥ 18 |
| Linguagem | TypeScript | ^5.4.5 |
| Framework HTTP | Express | ^4.19.2 |
| Validação | Zod | ^3.23.8 |
| Testes | Python + pytest + pytest-cov | 3.13 / 9.1.1 / 7.1.0 |
| AI Assistant | IBM Bob | — |

---

## 3. Comandos Bob

Slash commands disponíveis diretamente no chat do IBM Bob. Definidos como arquivos Markdown com frontmatter YAML.

### `/trilha <tecnologia>`

Busca trilhas de aprendizagem no catálogo DIO por tecnologia. Exibe nível, módulos, XP, badges, lives ao vivo e promoções ativas.

```
/trilha Java
/trilha React
/trilha Data Science
/trilha AWS
/trilha Python
```

### `/desafio <tecnologia> <nivel>`

Gera um desafio de código criativo com descrição, exemplos, template de código, critérios de avaliação, XP e badge desbloqueável.

Níveis aceitos: `iniciante` | `intermediário` / `intermediario` | `avançado` / `avancado`

```
/desafio Java intermediário
/desafio Python iniciante
/desafio TypeScript avançado
/desafio Kotlin intermediario
/desafio Go avancado
```

### `/certificado <nome> <trilha>`

Emite um certificado de conclusão com dados reais da trilha, competências adquiridas, badges conquistadas e código de verificação único.

```
/certificado "Ana Silva" "Java"
/certificado "Carlos Dev" "React"
/certificado "Maria Santos" "Python"
```

### Estrutura de um arquivo de comando

```markdown
---
description: Descrição curta exibida no autocomplete
argument-hint: <arg1> <arg2>
---

Instrução em linguagem natural para o Bob.
Use $1, $2 ... para referenciar os argumentos posicionais.
```

---

## 4. Skills Bob

Skills estendem os comandos com metadados que controlam o comportamento do Bob. O campo `disable-model-invocation: true` instrui o Bob a executar o prompt diretamente.

| Skill | Arquivo | user-invocable | Argumentos |
|---|---|---|---|
| `trilha` | `.bob/skills/trilha/SKILL.md` | ✅ sim | `<tecnologia>` |
| `certificado` | `.bob/skills/certificado/SKILL.md` | ✅ sim | `<nome> <trilha>` |

### Estrutura de um arquivo SKILL.md

```markdown
---
name: nome-da-skill
description: Descrição curta (usada pelo Bob para auto-seleção)
metadata:
  user-invocable: true               # pode ser chamada pelo usuário
  disable-model-invocation: true     # executa diretamente sem re-invocar o modelo
  argument-hint: <arg1> <arg2>
---

Conteúdo da instrução com $1, $2 ...
```

> **Dica:** Skills com `disable-model-invocation: true` produzem saídas mais previsíveis e estruturadas — ideal para certificados e tabelas formatadas.

---

## 5. Servidor MCP

O servidor MCP em TypeScript expõe as funcionalidades via protocolo MCP com suporte a stdio, HTTP, HTTPS e OAuth 2.0.

### Tools Registradas

| Tool | Parâmetros | Descrição |
|---|---|---|
| `trilha_buscar` | `tecnologia: string` | Busca trilhas por tecnologia. Retorna plano de estudos, badges, lives e promoções. |
| `desafio_gerar` | `tecnologia: string`, `nivel: enum` | Gera desafio de código com XP e badge. |
| `certificado_emitir` | `nome_aluno: string`, `trilha: string` | Emite certificado com dados reais da trilha. |

### Resources Registrados

| URI | Tipo | Descrição |
|---|---|---|
| `dio://trilhas` | Static Resource | Catálogo completo de trilhas em JSON |
| `dio://trilha/{id}` | Resource Template | Trilha individual pelo ID numérico |

### Prompt Registrado

| Prompt | Parâmetros | Descrição |
|---|---|---|
| `plano_de_estudos` | `nome_aluno`, `tecnologia`, `horas_por_semana` | Plano de estudos semanal personalizado |

### Instalação

```bash
cd "Projeto Dio Explorer/MCP"
npm install
npm run build
```

### Scripts disponíveis

```bash
npm run build          # Compila TypeScript → build/
npm run dev            # Modo watch (recarrega ao salvar)
npm run start:stdio    # Inicia em modo stdio (padrão Bob)
npm run start:http     # Inicia em modo HTTP (requer DIO_API_KEY)
npm run setup-key      # Gera API Key e cria .env
```

### Variáveis de Ambiente

| Variável | Obrigatório | Descrição |
|---|---|---|
| `DIO_API_KEY` | HTTP/HTTPS | Chave estática de acesso |
| `DIO_JWT_SECRET` | OAuth | Segredo para assinar tokens JWT (mín. 32 chars) |
| `DIO_PORT` | HTTP | Porta do servidor (padrão: 3000) |
| `DIO_TLS_CERT` | HTTPS | Caminho do certificado PEM |
| `DIO_TLS_KEY` | HTTPS | Caminho da chave privada PEM |
| `DIO_REDIRECT_HTTP` | HTTPS | `true` para redirecionar HTTP → HTTPS |
| `DIO_OAUTH_PROVIDER` | SSO | URL base do provider OAuth |
| `DIO_OAUTH_CLIENT_ID` | SSO | Client ID do provider |
| `DIO_OAUTH_CLIENT_SECRET` | SSO | Client Secret |
| `DIO_AUTH_DISABLED` | Dev | `true` desativa autenticação (apenas dev local) |

### Endpoints HTTP

| Método | Endpoint | Auth | Descrição |
|---|---|---|---|
| GET | `/health` | ❌ | Health-check público |
| POST | `/mcp` | ✅ | Endpoint MCP principal |
| GET | `/api/trilhas` | ✅ | Catálogo REST em JSON |
| GET | `/oauth/authorize` | ❌ | Inicia fluxo SSO |
| GET | `/oauth/callback` | ❌ | Callback OAuth 2.0 |
| POST | `/oauth/token` | ❌ | Client Credentials Grant |
| POST | `/oauth/introspect` | ❌ | Introspecção de token JWT |
| POST | `/oauth/revoke` | ❌ | Revogação de token |

---

## 6. Prompts Usados no Projeto

Registro completo dos prompts utilizados ao longo do desenvolvimento, organizados por fase.

### Fase 1 — Catálogo de Dados

```
"Crie um arquivo JSON chamado 'trilhas dio.json' com pelo menos 20 trilhas de
aprendizagem da DIO. Cada trilha deve ter: id, nome, tecnologia (array), nivel,
numero_de_modulos, xp_total, badges_disponiveis (array), promocoes (objeto com
desconto_percentual, validade, cupom), vitalicio (boolean) e lives_ao_vivo (array
com titulo, data, instrutor). Use tecnologias populares como Java, Python, React, AWS..."
```

### Fase 2 — Comandos Bob

```
"Crie o arquivo .bob/commands/trilha.md com um slash command /trilha que receba
o nome da tecnologia como argumento, leia o arquivo trilhas dio.json e exiba
o plano de estudos formatado com tabela de detalhes, badges, lives ao vivo e
promoções ativas. Use emojis e formatação Markdown."
```

```
"Crie o arquivo .bob/commands/desafio.md com um slash command /desafio que receba
tecnologia e nível e gere um desafio de código criativo com descrição, exemplos
de entrada/saída, restrições, template inicial, critérios de avaliação e recompensa
em XP + badge."
```

```
"Crie o arquivo .bob/commands/certificado.md com um slash command /certificado
que receba nome do aluno e nome da trilha, busque os dados reais no JSON e emita
um certificado formatado com ASCII art, detalhes da trilha, competências adquiridas,
badges conquistadas, assinaturas e link de verificação. Gere código DIO-[ano]-[8chars]."
```

### Fase 3 — Skills Bob

```
"Crie as skills em .bob/skills/trilha/SKILL.md e .bob/skills/certificado/SKILL.md
com frontmatter YAML incluindo name, description, metadata.user-invocable: true e
metadata.disable-model-invocation: true."
```

### Fase 4 — MCP Server TypeScript

```
"Crie um servidor MCP em TypeScript usando @modelcontextprotocol/sdk com as três
ferramentas (trilha_buscar, desafio_gerar, certificado_emitir), dois recursos
(dio://trilhas e dio://trilha/{id}), um prompt (plano_de_estudos), suporte a
transporte stdio e HTTP com Express e middleware de autenticação por API Key."
```

```
"Adicione suporte HTTPS/TLS ao servidor MCP com certificado configurável via
variáveis de ambiente e implementação completa de OAuth 2.0 Authorization Code Flow
e Client Credentials Grant com JWT HS256, introspecção e revogação de tokens.
Suporte a modo demo offline quando DIO_OAUTH_PROVIDER não estiver configurado."
```

### Fase 5 — Testes Unitários Python

```
"Crie o arquivo dio_commands.py com a lógica Python dos três comandos e
test_dio_commands.py com testes unitários usando pytest cobrindo todos os fluxos:
busca positiva e negativa, todos os níveis de desafio, certificado com trilha
encontrada e não encontrada, validações, helpers. Meta de cobertura: ≥ 70%."
```

### Fase 6 — Documentação

```
"Bob gostaria que voce documentasse todo o projeto feito até o momento, com todos
os prompts usados, modos de uso, dicas de uso e insights para futuros profissionais
que vão aprender com nosso projeto."
```

---

## 7. Modos de Uso

### Modo 1 — Slash Commands no Bob

```
/trilha Java
/desafio Python intermediário
/certificado "Seu Nome" "Java"
```

### Modo 2 — MCP stdio (integração nativa Bob)

Registre o servidor no `mcp.json` do Bob:

```json
{
  "mcpServers": {
    "geo-explorer": {
      "command": "node",
      "args": ["C:/caminho/absoluto/MCP/build/index.js"]
    }
  }
}
```

### Modo 3 — MCP HTTP

```bash
# Gerar API Key
node build/setup-api-key.js

# Iniciar servidor
DIO_API_KEY=sua-chave node build/index.js --transport http

# Chamar via curl
curl -X POST http://localhost:3000/mcp \
  -H "Authorization: Bearer sua-chave" \
  -H "Content-Type: application/json" \
  -d '{"method":"tools/call","params":{"name":"trilha_buscar","arguments":{"tecnologia":"Java"}}}'
```

### Modo 4 — MCP HTTPS/TLS

```bash
# Gerar certificado auto-assinado
openssl req -x509 -newkey rsa:4096 -keyout server.key -out server.crt -days 365 -nodes

# Iniciar com TLS
DIO_API_KEY=chave DIO_TLS_CERT=./server.crt DIO_TLS_KEY=./server.key \
DIO_PORT=3443 node build/index.js --transport http
```

### Modo 5 — OAuth 2.0 (Client Credentials)

```bash
curl -X POST https://seu-servidor.com/oauth/token \
  -H "Content-Type: application/json" \
  -d '{"grant_type":"client_credentials","client_id":"SEU_ID","client_secret":"SEU_SECRET"}'
```

Use o `access_token` retornado como Bearer token nas chamadas ao `/mcp`.

### Modo 6 — Ferramentas via IBM Bob Tool Calls

Com o servidor registrado no Bob, as tools são chamadas automaticamente por linguagem natural:

```
Você: "Busca a trilha de AWS pra mim"
Bob:  → chama mcp__geo-explorer__trilha_buscar(tecnologia="AWS")
```

---

## 8. Testes Unitários

### Resultado

| Métrica | Valor |
|---|---|
| Total de testes | 53 |
| Aprovados | 53 (100%) |
| Falhos | 0 |
| Cobertura de código | 99% (meta: 70%) ✅ |

### Distribuição por Suite

| Suite | Testes | Status |
|---|---|---|
| TestLoadTrilhas | 3 | ✅ PASSOU |
| TestBuscarTrilhasPorTecnologia | 6 | ✅ PASSOU |
| TestFormatarTrilha | 10 | ✅ PASSOU |
| TestComandoTrilha | 3 | ✅ PASSOU |
| TestComandoDesafio | 9 | ✅ PASSOU |
| TestFormatarDesafio | 3 | ✅ PASSOU |
| TestBuscarTrilhaPorNome | 4 | ✅ PASSOU |
| TestComandoCertificado | 8 | ✅ PASSOU |
| TestFormatarCertificado | 4 | ✅ PASSOU |
| TestHelpers | 3 | ✅ PASSOU |

### Executar os testes

```bash
cd "Projeto Dio Explorer/src"
python -m pytest test_dio_commands.py -v --cov=dio_commands --cov-report=term-missing
```

---

## 9. Dicas de Uso

### Comandos Bob

- **Busca parcial:** `/trilha java` e `/trilha Java` retornam o mesmo resultado — a busca é case-insensitive.
- **Acento opcional:** `intermediário` e `intermediario` são equivalentes no `/desafio`.
- **Nomes com espaço:** Use aspas: `/certificado "Ana Paula" "Full Stack Java"`.
- **Fluxo completo:** `/trilha` → estude → `/desafio` → resolva → `/certificado` → LinkedIn!

### MCP Server

- Use `DIO_AUTH_DISABLED=true` para desenvolvimento local sem autenticação.
- Não configure `DIO_OAUTH_PROVIDER` para ativar o modo demo OAuth offline.
- O catálogo JSON é carregado uma vez em memória. Reinicie o servidor para recarregar.
- O `GET /health` é público — use para monitoramento sem exposição de credenciais.

### Testes

- Use `--cov-report=html` para um relatório navegável com destaque linha a linha.
- Cada suite usa dados mock independentes — seguro para execução em paralelo.

---

## 10. Insights para Futuros Profissionais

### 1. MCP é o futuro das integrações com IA
O Model Context Protocol padroniza como aplicações expõem ferramentas para assistentes de IA. Aprender MCP hoje é equivalente a aprender REST em 2010 — quem souber isso vai ter vantagem no mercado.

### 2. Separação de camadas ainda importa
O projeto separa claramente dados, lógica de domínio, protocolo, segurança e interface. Essa separação facilita testes, manutenção e evolução independente de cada camada — mesmo em projetos com IA.

### 3. Prompt Engineering é engenharia, não mágica
Os arquivos `.md` de commands e skills são prompts de sistema estruturados e versionáveis no git. Cada um define: contexto, instruções passo-a-passo, formato de saída, caso de sucesso e caso de falha. Isso é reproduzível e auditável.

### 4. Testes unitários valem para código gerado por IA também
99% de cobertura prova que qualidade de testes não depende de quem escreveu o código. Defina casos de borda antes de implementar — TDD funciona com IA.

### 5. Entenda o protocolo antes de usar a biblioteca
O projeto implementa JWT HS256 e OAuth 2.0 do zero usando Node.js crypto. Entender o mecanismo faz você depurar problemas de produção muito mais rápido.

### 6. Construa para múltiplos ambientes desde o início
Variáveis de ambiente e flags de argumento permitem rodar em laptop (stdio), staging (HTTP) e produção (HTTPS + OAuth) sem mudar o código.

### Próximos Passos Recomendados

- [ ] Adicionar persistência ao catálogo (PostgreSQL ou SQLite)
- [ ] Implementar PKCE no Authorization Code Flow
- [ ] Criar dashboard web em React consumindo `GET /api/trilhas`
- [ ] Publicar o MCP Server no npm (`npx geo-explorer-mcp`)
- [ ] Adicionar testes de integração TypeScript com vitest
- [ ] Configurar CI/CD com GitHub Actions: lint → testes → build → deploy

---

*Projeto desenvolvido com [IBM Bob](https://ibm.com) durante o curso DIO — Transformando talentos em protagonistas da tecnologia.*
