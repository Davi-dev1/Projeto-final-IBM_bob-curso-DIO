"""
test_dio_commands.py
Testes unitários para os comandos /trilha, /desafio e /certificado.
Meta de cobertura: ≥ 70 %
"""

import json
import os
import sys
import unittest
from datetime import date
from unittest.mock import patch, mock_open

# Garante que o módulo-alvo seja encontrado
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import dio_commands as cmd


# ──────────────────────────────────────────────────────────────
# Fixtures compartilhadas
# ──────────────────────────────────────────────────────────────

TRILHAS_FIXTURE = [
    {
        "id": 1,
        "nome": "Formação Full Stack Java + Angular",
        "tecnologia": ["Java", "Spring Boot", "Angular", "TypeScript", "PostgreSQL"],
        "nivel": "Intermediário",
        "numero_de_modulos": 3,
        "xp_total": 18500,
        "badges_disponiveis": ["Java Developer", "Spring Boot Expert", "Full Stack Badge"],
        "promocoes": {
            "desconto_percentual": 30,
            "validade": "2025-12-31",
            "cupom": "FULLSTACK30",
        },
        "vitalicio": True,
        "lives_ao_vivo": [
            {
                "titulo": "API REST com Spring Boot",
                "data": "2025-07-10",
                "instrutor": "Gleyson Sampaio",
            }
        ],
    },
    {
        "id": 2,
        "nome": "Formação Python para Data Science",
        "tecnologia": ["Python", "Pandas", "NumPy"],
        "nivel": "Iniciante",
        "numero_de_modulos": 2,
        "xp_total": 14200,
        "badges_disponiveis": ["Python Starter", "Data Analyst"],
        "promocoes": {
            "desconto_percentual": 0,
            "validade": None,
            "cupom": None,
        },
        "vitalicio": True,
        "lives_ao_vivo": [],
    },
    {
        "id": 3,
        "nome": "Formação Kotlin Android",
        "tecnologia": ["Kotlin", "Android SDK", "Jetpack Compose"],
        "nivel": "Avançado",
        "numero_de_modulos": 4,
        "xp_total": 22000,
        "badges_disponiveis": ["Kotlin Pro", "Android Expert"],
        "promocoes": {
            "desconto_percentual": 0,
            "validade": None,
            "cupom": None,
        },
        "vitalicio": False,
        "lives_ao_vivo": [],
    },
]


# ──────────────────────────────────────────────────────────────
# Testes: load_trilhas
# ──────────────────────────────────────────────────────────────

class TestLoadTrilhas(unittest.TestCase):
    """Testa o carregamento do arquivo JSON."""

    def test_carrega_lista_de_trilhas(self):
        payload = json.dumps({"trilhas": TRILHAS_FIXTURE})
        with patch("builtins.open", mock_open(read_data=payload)):
            trilhas = cmd.load_trilhas("/fake/path.json")
        self.assertEqual(len(trilhas), 3)
        self.assertEqual(trilhas[0]["nome"], "Formação Full Stack Java + Angular")

    def test_retorna_lista_vazia_sem_chave(self):
        payload = json.dumps({})
        with patch("builtins.open", mock_open(read_data=payload)):
            trilhas = cmd.load_trilhas("/fake/path.json")
        self.assertEqual(trilhas, [])

    def test_levanta_excecao_arquivo_inexistente(self):
        with self.assertRaises(FileNotFoundError):
            cmd.load_trilhas("/caminho/que/nao/existe.json")


# ──────────────────────────────────────────────────────────────
# Testes: /trilha — busca
# ──────────────────────────────────────────────────────────────

class TestBuscarTrilhasPorTecnologia(unittest.TestCase):
    """Testa a lógica de busca de trilhas."""

    def test_busca_java_retorna_trilha_java(self):
        resultado = cmd.buscar_trilhas_por_tecnologia("Java", TRILHAS_FIXTURE)
        self.assertEqual(len(resultado), 1)
        self.assertIn("Java", resultado[0]["tecnologia"])

    def test_busca_case_insensitive(self):
        resultado = cmd.buscar_trilhas_por_tecnologia("JAVA", TRILHAS_FIXTURE)
        self.assertEqual(len(resultado), 1)

    def test_busca_parcial(self):
        # "spring" deve encontrar "Spring Boot"
        resultado = cmd.buscar_trilhas_por_tecnologia("spring", TRILHAS_FIXTURE)
        self.assertEqual(len(resultado), 1)

    def test_busca_inexistente_retorna_lista_vazia(self):
        resultado = cmd.buscar_trilhas_por_tecnologia("COBOL", TRILHAS_FIXTURE)
        self.assertEqual(resultado, [])

    def test_busca_com_lista_vazia(self):
        resultado = cmd.buscar_trilhas_por_tecnologia("Java", [])
        self.assertEqual(resultado, [])

    def test_busca_python_retorna_trilha_python(self):
        resultado = cmd.buscar_trilhas_por_tecnologia("python", TRILHAS_FIXTURE)
        self.assertEqual(len(resultado), 1)
        self.assertEqual(resultado[0]["id"], 2)


# ──────────────────────────────────────────────────────────────
# Testes: /trilha — formatação
# ──────────────────────────────────────────────────────────────

class TestFormatarTrilha(unittest.TestCase):
    """Testa a formatação do resultado de /trilha."""

    def setUp(self):
        self.trilha_java = TRILHAS_FIXTURE[0]
        self.saida = cmd.formatar_trilha(self.trilha_java)

    def test_contem_nome_da_trilha(self):
        self.assertIn("Formação Full Stack Java + Angular", self.saida)

    def test_contem_nivel(self):
        self.assertIn("Intermediário", self.saida)

    def test_contem_xp(self):
        self.assertIn("18500", self.saida)

    def test_contem_vitalicio_sim(self):
        self.assertIn("Sim", self.saida)

    def test_contem_badge(self):
        self.assertIn("Java Developer", self.saida)

    def test_contem_live(self):
        self.assertIn("API REST com Spring Boot", self.saida)

    def test_contem_promocao(self):
        self.assertIn("30%", self.saida)
        self.assertIn("FULLSTACK30", self.saida)

    def test_sem_promocao_exibe_mensagem(self):
        saida = cmd.formatar_trilha(TRILHAS_FIXTURE[1])
        self.assertIn("Nenhuma promoção", saida)

    def test_vitalicio_nao(self):
        saida = cmd.formatar_trilha(TRILHAS_FIXTURE[2])
        self.assertIn("Não", saida)

    def test_numero_de_modulos_na_saida(self):
        # deve gerar 3 linhas de módulos para a trilha Java (numero_de_modulos=3)
        self.assertIn("Módulo 1:", self.saida)
        self.assertIn("Módulo 3:", self.saida)


# ──────────────────────────────────────────────────────────────
# Testes: comando_trilha (integração)
# ──────────────────────────────────────────────────────────────

class TestComandoTrilha(unittest.TestCase):

    def test_encontra_java(self):
        resultado = cmd.comando_trilha("Java", TRILHAS_FIXTURE)
        self.assertIn("Formação Full Stack Java + Angular", resultado)

    def test_nao_encontrado_retorna_mensagem_erro(self):
        resultado = cmd.comando_trilha("COBOL", TRILHAS_FIXTURE)
        self.assertIn("Nenhuma trilha encontrada", resultado)
        self.assertIn("COBOL", resultado)

    def test_multiplas_trilhas(self):
        # adiciona trilha extra com Java para garantir múltiplos resultados
        extra = dict(TRILHAS_FIXTURE[0])
        extra["id"] = 99
        extra["nome"] = "Bootcamp Java Avançado"
        trilhas_extras = TRILHAS_FIXTURE + [extra]
        resultado = cmd.comando_trilha("Java", trilhas_extras)
        self.assertIn("---", resultado)  # separador entre trilhas


# ──────────────────────────────────────────────────────────────
# Testes: /desafio
# ──────────────────────────────────────────────────────────────

class TestComandoDesafio(unittest.TestCase):

    def test_nivel_iniciante(self):
        desafio = cmd.comando_desafio("Java", "iniciante")
        self.assertEqual(desafio["xp"], 500)
        self.assertEqual(desafio["tecnologia"], "Java")

    def test_nivel_intermediario_com_acento(self):
        desafio = cmd.comando_desafio("Java", "intermediário")
        self.assertEqual(desafio["xp"], 1000)

    def test_nivel_intermediario_sem_acento(self):
        desafio = cmd.comando_desafio("Java", "intermediario")
        self.assertEqual(desafio["xp"], 1000)

    def test_nivel_avancado_com_acento(self):
        desafio = cmd.comando_desafio("Java", "avançado")
        self.assertEqual(desafio["xp"], 2000)

    def test_nivel_avancado_sem_acento(self):
        desafio = cmd.comando_desafio("Java", "avancado")
        self.assertEqual(desafio["xp"], 2000)

    def test_nivel_invalido_levanta_erro(self):
        with self.assertRaises(ValueError) as ctx:
            cmd.comando_desafio("Java", "expert")
        self.assertIn("inválido", str(ctx.exception))

    def test_badge_correto(self):
        desafio = cmd.comando_desafio("Java", "iniciante")
        self.assertEqual(desafio["badge"], "Java Iniciante Challenger")

    def test_codigo_unico(self):
        d1 = cmd.comando_desafio("Java", "iniciante")
        d2 = cmd.comando_desafio("Java", "iniciante")
        # Há chance mínima de colisão; estatisticamente seguro com 36^6 combinações
        self.assertNotEqual(d1["codigo"], d2["codigo"])

    def test_descricao_nao_vazia(self):
        desafio = cmd.comando_desafio("Python", "avançado")
        self.assertTrue(len(desafio["descricao"]) > 0)


class TestFormatarDesafio(unittest.TestCase):

    def test_formato_contém_tecnologia(self):
        desafio = cmd.comando_desafio("Java", "iniciante")
        saida = cmd.formatar_desafio(desafio)
        self.assertIn("Java", saida)

    def test_formato_contém_xp(self):
        desafio = cmd.comando_desafio("Java", "iniciante")
        saida = cmd.formatar_desafio(desafio)
        self.assertIn("500 XP", saida)

    def test_formato_contém_badge(self):
        desafio = cmd.comando_desafio("Java", "avançado")
        saida = cmd.formatar_desafio(desafio)
        self.assertIn("Challenger", saida)


# ──────────────────────────────────────────────────────────────
# Testes: /certificado
# ──────────────────────────────────────────────────────────────

class TestBuscarTrilhaPorNome(unittest.TestCase):

    def test_encontra_por_nome_parcial(self):
        t = cmd.buscar_trilha_por_nome("Java", TRILHAS_FIXTURE)
        self.assertIsNotNone(t)
        self.assertIn("Java", t["nome"])

    def test_encontra_por_tecnologia_fallback(self):
        # "Kotlin" não está em nenhum nome de trilha, mas está em tecnologia
        t = cmd.buscar_trilha_por_nome("Kotlin", TRILHAS_FIXTURE)
        self.assertIsNotNone(t)

    def test_retorna_none_quando_nao_encontra(self):
        t = cmd.buscar_trilha_por_nome("COBOL", TRILHAS_FIXTURE)
        self.assertIsNone(t)

    def test_busca_case_insensitive(self):
        t = cmd.buscar_trilha_por_nome("PYTHON", TRILHAS_FIXTURE)
        self.assertIsNotNone(t)


class TestComandoCertificado(unittest.TestCase):

    def test_gera_certificado_com_trilha_encontrada(self):
        cert = cmd.comando_certificado("João Silva", "Java", TRILHAS_FIXTURE)
        self.assertTrue(cert["trilha_encontrada"])
        self.assertEqual(cert["nome_aluno"], "João Silva")
        self.assertEqual(cert["xp"], 18500)

    def test_gera_certificado_trilha_nao_encontrada(self):
        cert = cmd.comando_certificado("Maria Souza", "COBOL", TRILHAS_FIXTURE)
        self.assertFalse(cert["trilha_encontrada"])
        self.assertEqual(cert["xp"], 0)
        self.assertEqual(cert["modulos"], 0)

    def test_nome_aluno_vazio_levanta_erro(self):
        with self.assertRaises(ValueError):
            cmd.comando_certificado("", "Java", TRILHAS_FIXTURE)

    def test_nome_trilha_vazio_levanta_erro(self):
        with self.assertRaises(ValueError):
            cmd.comando_certificado("João", "", TRILHAS_FIXTURE)

    def test_codigo_tem_formato_correto(self):
        cert = cmd.comando_certificado("Ana", "Java", TRILHAS_FIXTURE)
        ano = date.today().year
        self.assertTrue(cert["codigo"].startswith(f"DIO-{ano}-"))
        self.assertEqual(len(cert["codigo"]), len(f"DIO-{ano}-XXXXXXXX"))

    def test_data_formato_brasileiro(self):
        cert = cmd.comando_certificado("Carlos", "Python", TRILHAS_FIXTURE)
        # DD/MM/YYYY
        self.assertRegex(cert["data"], r"^\d{2}/\d{2}/\d{4}$")

    def test_tecnologias_populadas(self):
        cert = cmd.comando_certificado("Bia", "Java", TRILHAS_FIXTURE)
        self.assertIn("Java", cert["tecnologias"])

    def test_badges_populados(self):
        cert = cmd.comando_certificado("Pedro", "Java", TRILHAS_FIXTURE)
        self.assertGreater(len(cert["badges"]), 0)


class TestFormatarCertificado(unittest.TestCase):

    def test_formato_contem_nome_aluno(self):
        cert = cmd.comando_certificado("Davi", "Java", TRILHAS_FIXTURE)
        saida = cmd.formatar_certificado(cert)
        self.assertIn("Davi", saida)

    def test_formato_contem_nome_trilha(self):
        cert = cmd.comando_certificado("Davi", "Java", TRILHAS_FIXTURE)
        saida = cmd.formatar_certificado(cert)
        self.assertIn("Java", saida)

    def test_formato_contem_codigo(self):
        cert = cmd.comando_certificado("Davi", "Java", TRILHAS_FIXTURE)
        saida = cmd.formatar_certificado(cert)
        self.assertIn(cert["codigo"], saida)

    def test_formato_sem_tecnologias(self):
        cert = cmd.comando_certificado("Davi", "COBOL", TRILHAS_FIXTURE)
        saida = cmd.formatar_certificado(cert)
        # sem tecnologias, competências ficam vazias — não deve crashar
        self.assertIn("Competências", saida)


# ──────────────────────────────────────────────────────────────
# Testes: helpers internos
# ──────────────────────────────────────────────────────────────

class TestHelpers(unittest.TestCase):

    def test_gerar_codigo_certificado_tamanho(self):
        codigo = cmd.gerar_codigo_certificado()
        self.assertEqual(len(codigo), 8)

    def test_gerar_codigo_certificado_apenas_maiusculas_e_digitos(self):
        for _ in range(20):
            codigo = cmd.gerar_codigo_certificado()
            self.assertRegex(codigo, r"^[A-Z0-9]{8}$")

    def test_gerar_codigo_desafio_formato(self):
        codigo = cmd.gerar_codigo_desafio(500)
        self.assertTrue(codigo.startswith("CHALLENGE-500-"))


# ──────────────────────────────────────────────────────────────
# Entry-point
# ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    unittest.main(verbosity=2)
