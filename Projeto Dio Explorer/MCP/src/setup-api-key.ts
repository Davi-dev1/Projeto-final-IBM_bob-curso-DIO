/**
 * setup-api-key.ts
 * Script de configuração inicial da API Key.
 * Execute uma vez antes de subir o servidor em modo HTTP:
 *   node build/setup-api-key.js
 */

import { randomBytes } from "crypto";
import { writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ENV_PATH = join(__dirname, "..", ".env");

function generate(): string {
  return randomBytes(32).toString("hex");
}

if (existsSync(ENV_PATH)) {
  console.log(`\n⚠️  Arquivo .env já existe em: ${ENV_PATH}`);
  console.log("   Delete-o manualmente se quiser regenerar a chave.\n");
  process.exit(0);
}

const key = generate();
const envContent = [
  `# Geo-Explorer MCP Server — Environment`,
  `# Gerado automaticamente em ${new Date().toISOString()}`,
  ``,
  `# Chave de acesso ao servidor MCP HTTP`,
  `# Forneça via: Authorization: Bearer <key> | X-API-Key: <key> | ?api_key=<key>`,
  `DIO_API_KEY=${key}`,
  ``,
  `# Porta do servidor HTTP (padrão: 3000)`,
  `DIO_PORT=3000`,
  ``,
  `# Defina como "true" APENAS em desenvolvimento local para desativar autenticação`,
  `# DIO_AUTH_DISABLED=true`,
].join("\n");

writeFileSync(ENV_PATH, envContent, "utf-8");

console.log("\n✅ Arquivo .env criado com sucesso!\n");
console.log(`📁 Localização: ${ENV_PATH}`);
console.log(`\n🔑 Sua API Key foi gerada:`);
console.log(`   ${key}`);
console.log(`\n⚠️  IMPORTANTE:`);
console.log(
  "   - Guarde esta chave em local seguro — ela não será exibida novamente."
);
console.log(
  "   - Nunca commite o arquivo .env no repositório (já está no .gitignore)."
);
console.log("\n🚀 Para iniciar o servidor HTTP:");
console.log("   DIO_API_KEY=$(grep DIO_API_KEY .env | cut -d= -f2) node build/index.js --transport http\n");
