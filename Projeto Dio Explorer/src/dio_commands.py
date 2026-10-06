"""
dio_commands.py
Módulo principal que simula a lógica dos comandos do Bob:
  /trilha  <tecnologia>
  /desafio <tecnologia> <nivel>
  /certificado <nome> <trilha>
"""

import json
import os
import re
import random
import string
from datetime import date

# ──────────────────────────────────────────────
# Caminho do JSON de dados
# ──────────────────────────────────────────────
_BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_PATH = os.path.join(_BASE_DIR, "data", "trilhas dio.json")


def load_trilhas(path: str = DATA_PATH) -> list:
    """Carrega e retorna a lista de trilhas do arquivo JSON."""
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    return data.get("trilhas", [])


# ──────────────────────────────────────────────
# /trilha
# ──────────────────────────────────────────────

def buscar_trilhas_por_tecnologia(tecnologia: str, trilhas: list) -> list:
    """
    Retorna todas as trilhas cujo array 'tecnologia' contenha o termo
    informado (case-insensitive, correspondência parcial).
    """
    termo = tecnologia.strip().lower()
    resultado = []
    for trilha in trilhas:
        for tech in trilha.get("tecnologia", []):
            if termo in tech.lower():
                resultado.append(trilha)
                break
    return resultado


def formatar_trilha(trilha: dict) -> str:
    """Formata uma trilha no template markdown do comando /trilha."""
    techs = " ".join(f"`{t}`" for t in trilha.get("tecnologia", []))
    modulos = trilha.get("numero_de_modulos", 0)
    promo = trilha.get("promocoes", {})
    desconto = promo.get("desconto_percentual", 0)

    linhas = [
        f"## 🎓 {trilha['nome']}",
        "",
        "| Campo | Detalhe |",
        "|---|---|",
        f"| 🏷️ Nível | {trilha.get('nivel', '-')} |",
        f"| 📦 Módulos | {modulos} módulos |",
        f"| ⭐ XP Total | {trilha.get('xp_total', 0)} XP |",
        f"| ♾️ Vitalício | {'Sim' if trilha.get('vitalicio') else 'Não'} |",
        "",
        "### 🛠️ Tecnologias da Trilha",
        techs,
        "",
        "### 📚 Plano de Estudos — Módulos",
    ]

    techs_list = trilha.get("tecnologia", ["Tecnologia"])
    for i in range(1, modulos + 1):
        tech_ref = techs_list[(i - 1) % len(techs_list)]
        linhas.append(f"{i}. Módulo {i}: Tópico avançado de {tech_ref}")

    badges = trilha.get("badges_disponiveis", [])
    linhas += ["", "### 🏅 Badges Disponíveis"]
    for b in badges:
        linhas.append(f"🥇 {b}")

    lives = trilha.get("lives_ao_vivo", [])
    linhas += ["", "### 🔴 Lives ao Vivo"]
    for live in lives:
        linhas.append(
            f"- **{live['titulo']}** — 📅 {live['data']} com 👨‍🏫 {live['instrutor']}"
        )

    linhas += ["", "### 🎟️ Promoção Ativa"]
    if desconto > 0:
        linhas.append(
            f"> 🔥 **{desconto}% de desconto** com o cupom `{promo.get('cupom')}` "
            f"— válido até {promo.get('validade')}"
        )
    else:
        linhas.append("> ℹ️ Nenhuma promoção ativa no momento.")

    return "\n".join(linhas)


def comando_trilha(tecnologia: str, trilhas: list) -> str:
    """Ponto de entrada do comando /trilha."""
    encontradas = buscar_trilhas_por_tecnologia(tecnologia, trilhas)
    if not encontradas:
        return (
            f'> ❌ Nenhuma trilha encontrada para a tecnologia **"{tecnologia}"** '
            f"no catálogo DIO."
        )
    return "\n\n---\n\n".join(formatar_trilha(t) for t in encontradas)


# ──────────────────────────────────────────────
# /desafio
# ──────────────────────────────────────────────

XP_POR_NIVEL = {
    "iniciante": 500,
    "intermediário": 1000,
    "intermediario": 1000,
    "avançado": 2000,
    "avancado": 2000,
}

TEMPLATES_DESAFIO = {
    "iniciante": "Implemente uma função que receba uma lista de números inteiros "
                 "e retorne a soma de todos os elementos pares.",
    "intermediário": "Implemente um sistema de fila de prioridade para gerenciar "
                    "tickets de suporte, ordenando por urgência (1-crítico, 2-alto, 3-baixo).",
    "avançado": "Implemente um algoritmo de Dijkstra para encontrar o caminho mais "
                "curto entre dois nós em um grafo ponderado representando rotas de entrega.",
}


def gerar_codigo_desafio(xp: int) -> str:
    """Gera um código aleatório para o desafio."""
    sufixo = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f"CHALLENGE-{xp}-{sufixo}"


def comando_desafio(tecnologia: str, nivel: str) -> dict:
    """
    Retorna um dicionário com todos os campos do desafio gerado.
    Levanta ValueError se o nível for inválido.
    """
    nivel_norm = nivel.strip().lower()
    if nivel_norm not in XP_POR_NIVEL:
        raise ValueError(
            f"Nível '{nivel}' inválido. Use: iniciante, intermediário ou avançado."
        )

    xp = XP_POR_NIVEL[nivel_norm]
    descricao = TEMPLATES_DESAFIO.get(nivel_norm, TEMPLATES_DESAFIO["iniciante"])
    codigo = gerar_codigo_desafio(xp)

    return {
        "tecnologia": tecnologia,
        "nivel": nivel,
        "xp": xp,
        "descricao": descricao,
        "codigo": codigo,
        "badge": f"{tecnologia} {nivel.capitalize()} Challenger",
    }


def formatar_desafio(desafio: dict) -> str:
    """Formata o desafio no template markdown do comando /desafio."""
    return (
        f"## ⚔️ Desafio de Código — DIO Challenge\n\n"
        f"> 🎯 **Tecnologia:** {desafio['tecnologia']} | "
        f"🏆 **Nível:** {desafio['nivel']}\n\n"
        f"### 📋 Descrição do Desafio\n\n"
        f"{desafio['descricao']}\n\n"
        f"### 🏅 Recompensa\n"
        f"- ⭐ XP ao completar: **{desafio['xp']} XP**\n"
        f"- 🏆 Badge desbloqueável: **\"{desafio['badge']}\"**\n\n"
        f"### 🔑 Código do Desafio\n`{desafio['codigo']}`"
    )


# ──────────────────────────────────────────────
# /certificado
# ──────────────────────────────────────────────

def gerar_codigo_certificado() -> str:
    """Gera um código alfanumérico aleatório de 8 caracteres maiúsculos."""
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=8))


def buscar_trilha_por_nome(nome_trilha: str, trilhas: list):
    """Busca uma trilha pelo nome (parcial, case-insensitive). Retorna None se não achar."""
    termo = nome_trilha.strip().lower()
    for trilha in trilhas:
        if termo in trilha.get("nome", "").lower():
            return trilha
    # fallback: busca por tecnologia
    for trilha in trilhas:
        for tech in trilha.get("tecnologia", []):
            if termo in tech.lower():
                return trilha
    return None


def comando_certificado(nome_aluno: str, nome_trilha: str, trilhas: list) -> dict:
    """
    Retorna um dicionário com todos os campos do certificado gerado.
    Levanta ValueError se nome_aluno ou nome_trilha forem vazios.
    """
    if not nome_aluno.strip():
        raise ValueError("O nome do aluno não pode ser vazio.")
    if not nome_trilha.strip():
        raise ValueError("O nome da trilha não pode ser vazio.")

    trilha = buscar_trilha_por_nome(nome_trilha, trilhas)
    ano = date.today().year
    codigo = f"DIO-{ano}-{gerar_codigo_certificado()}"

    if trilha:
        return {
            "nome_aluno": nome_aluno,
            "trilha_nome": trilha["nome"],
            "nivel": trilha.get("nivel", "N/A"),
            "modulos": trilha.get("numero_de_modulos", 0),
            "xp": trilha.get("xp_total", 0),
            "tecnologias": trilha.get("tecnologia", []),
            "badges": trilha.get("badges_disponiveis", []),
            "codigo": codigo,
            "data": date.today().strftime("%d/%m/%Y"),
            "trilha_encontrada": True,
        }
    else:
        return {
            "nome_aluno": nome_aluno,
            "trilha_nome": nome_trilha,
            "nivel": "N/A",
            "modulos": 0,
            "xp": 0,
            "tecnologias": [],
            "badges": [],
            "codigo": codigo,
            "data": date.today().strftime("%d/%m/%Y"),
            "trilha_encontrada": False,
        }


def formatar_certificado(cert: dict) -> str:
    """Formata o certificado no template markdown do comando /certificado."""
    techs = "\n".join(
        f"- ✅ **{t}** — Competência adquirida em {t}" for t in cert["tecnologias"]
    )
    badges = "  ".join(f"🥇 `{b}`" for b in cert["badges"])
    return (
        f"## 📜 CERTIFICADO DE CONCLUSÃO\n\n"
        f"**Aluno(a):** {cert['nome_aluno']}\n"
        f"**Trilha:** {cert['trilha_nome']}\n"
        f"**Nível:** {cert['nivel']}\n"
        f"**Módulos Concluídos:** {cert['modulos']}\n"
        f"**XP Conquistado:** {cert['xp']} XP\n"
        f"**Data:** {cert['data']}\n"
        f"**Código:** `{cert['codigo']}`\n\n"
        f"### 🛠️ Competências Adquiridas\n{techs}\n\n"
        f"### 🏆 Badges\n{badges}"
    )
