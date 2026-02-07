# Guia Técnico Master: Conector ProBPA Desktop 📘

**Versão da Documentação:** 1.0 (06/02/2026)
**Projeto:** ProBPA Connector (v3.x)
**Tecnologia:** Python 3.12 + CustomTkinter (UI) + PostgreSQL (Driver)

Este documento serve como o **Manual Definitivo** para manutenção, evolução, construção e lançamento do Conector de Dados do ProBPA. Ele foi desenhado para permitir que qualquer Engenheiro de Software ou Agente de IA assuma o projeto instantaneamente.

---

## 1. Arquitetura do Sistema 🏗️

O Conector é uma aplicação desktop Windows que atua como uma ponte (ETL) entre o banco de dados local do e-SUS PEC (PostgreSQL) e a API Cloud do ProBPA (Firebase Functions).

### 1.1. Estrutura de Pastas
```
/connector_app
├── /core               # Núcleo Lógico
│   ├── engine.py       # ETL Engine (Extração Incremental, Queries SQL, Upload)
│   ├── updater.py      # Lógica de Auto-Update (Check Version, Download)
│   ├── config_manager.py # Gerenciamento de Configuração (Criptografada)
│   └── single_instance.py # Trava de Instância Única (Socket Lock)
├── /ui                 # Interface Gráfica (CustomTkinter)
│   ├── main.py         # Entry Point, System Tray, Janela Principal
│   └── /screens        # Telas: Activation, Dashboard, Welcome
├── /tools              # Ferramentas de CI/CD
│   └── release.py      # Script de Automação de Release
└── version.py          # Fonte da Verdade de Versionamento
```

### 1.2. Componentes Chave
*   **Engine (`core/engine.py`):**
    *   Gerencia conexões com o DB local.
    *   Executa as 7 grandes queries (Procedimentos, Consultas, Odonto, Vacina, etc.).
    *   **Lógica Incremental:** Se o intervalo for >= 12h, busca apenas registros novos a partir da `last_run`. Se for < 12h ou manual, faz Full Load (últimos 30 dias).
*   **Updater (`core/updater.py`):**
    *   Compara `version.py` com o JSON remoto (`connector_version.json` no GitHub/Firebase).
    *   Baixa o instalador `.exe` silenciosamente.
    *   Executa com flag `/VERYSILENT` e forçam o encerramento do app atual.
*   **System Tray (`ui/main.py`):**
    *   O app roda minimizado na bandeja do Windows (`pystray`).
    *   Impede múltiplas instâncias usando um socket lock na porta 65432.

---

## 2. Fluxo de Desenvolvimento (Workflow) 🔄

Siga este ritual estrito para qualquer alteração no código.

### Passo 1: Desenvolvimento
1.  Edite os arquivos Python em `connector_app/`.
2.  Teste localmente rodando:
    ```bash
    python connector_app/launcher.py
    ```
    *(Nota: `launcher.py` é um wrapper dev para `ui/main.py`)*

### Passo 2: Versionamento
1.  Se a alteração for estável, edite `connector_app/version.py`.
2.  Incremente `__version__` (ex: `3.4.1` -> `3.4.2`).
3.  Atualize o `CHANGELOG.md` na raiz (opcional, mas recomendado).

---

## 3. Pipeline de Build & Compilação 🛠️

Transformar o código Python em executável Windows (`.exe`).

### Pré-requisitos
*   Windows (VM ou Local) ou Ambiente Cross-Compile (não recomendado, use Windows para evitar bugs de DLL).
*   PyInstaller instalado.
*   Inno Setup Compiler instalado (para gerar o instalador).

### Comando de Build
Execute o script batch na raiz:
```cmd
build_exe.bat
```

**O que ele faz?**
1.  Limpa pastas `build/` e `dist/`.
2.  Roda `PyInstaller` com:
    *   `--noconsole` (sem janela preta).
    *   `--icon=assets/icon.ico`.
    *   `--add-data` (inclui ativos).
3.  O binário bruto fica em `dist/connector_app/`.
4.  (Opcional) Executa o compilador do Inno Setup (`setup_script.iss`) para gerar o instalador `Output/mysetup.exe`.

---

## 4. Fluxo Git e Release Strategy (O Passo-a-Passo) 🐙

Este é o protocolo exato para garantir que o código, o binário e o histórico estejam sincronizados.

### 4.1. Ciclo de Vida do Git (Workflow Real)
1.  **Branches Principais:**
    *   `main`: Produção Estável (O que os clientes baixam).
    *   `test/auto-update`: Branch de desenvolvimento atual (Features de Auto-Update e melhorias).
2.  **Fluxo de Merge:**
    *   Desenvolva em `test/auto-update`.
    *   Teste (Dev/Homolog).
    *   Para lançar oficial: **Merge `test/auto-update` -> `main`**.
3.  **Commits:**
    *   Use Semantic Commits: `feat: ...`, `fix: ...`, `chore: ...`.

### 4.2. Ritual de Lançamento (Release Channel)
Atualmente estamos na versão **v3.4.1**. Para lançar a próxima:


1.  **Atualizar Versão:**
    *   Edite `connector_app/version.py`.
    *   Ex: Mude `__version__ = "3.4.1"` para `"3.4.2"`.
    *   Commit: `chore: bump version to 3.4.2`.

2.  **Taggear (Crucial):**
    *   Crie uma tag git apontando para esse commit de versão.
    *   Comando: `git tag -a v3.4.2 -m "Release v3.4.2"`.
    *   Push da Tag: `git push origin v3.4.2`.

3.  **Compilar (Build):**
    *   Rode `build_exe.bat`.
    *   Resultado: `Output/mysetup.exe` (Instalador).

4.  **Publicar (GitHub Releases):**
    *   Vá no GitHub > Releases > "Draft a new release".
    *   Escolha a tag `v3.4.2` que você acabou de subir.
    *   Título: `v3.4.2 - Correção XPTO`.
    *   **Assets:** Arraste o arquivo `mysetup.exe` (renomeie para `ProBPA_Connector_v3.4.2.exe`).
    *   Clique em "Publish release".

5.  **Atualizar Metadados de Auto-Update:**
    *   O Updater busca um JSON para saber se deve atualizar.
    *   Edite `connector_version.json` (local ou na branch `gh-pages`).
    *   Aponte o link de download para o arquivo `.exe` que você acabou de subir no GitHub Releases.

---

## 5. Ferramentas de Diagnóstico e Scripts Auxiliares 🧰

Localizados na pasta `scripts-extracao-esus/`.

### 5.1. Deep Scanner (`deep_map_esus.py`)
*   **Função:** Mapeia a estrutura real do banco PostgreSQL do cliente.
*   **Uso:** Quando o conector falha com "Column not found" ou "Relation does not exist".
*   **Saída:** Gera um relatório mostrando todas as tabelas e colunas ativas. Isso é vital pois cada versão do e-SUS PEC (3.1, 3.2, 4.0) muda o schema levemente.

### 5.2. Scripts de Setup
*   `install_build_env.bat`: Instala automaticamente Python, Git e drivers necessários em uma máquina Windows limpa.
*   `setup_connector.bat`: Configura o ambiente virtual (venv) e dependências para desenvolvimento.

---

## 6. Estratégia de Idempotência e Integridade 🛡️

Como garantimos que rodar a extração 10 vezes não cria 10 cópias do mesmo registro?

### 6.1. Geração de ID Único (`externalId`)
O Engine gera um ID determinístico para cada registro antes de enviar para a API. Se o ID já existe no Firestore, a API apenas atualiza (merge), não duplica.

*   **Procedimentos:** `UUID_FICHA + COD_PROCEDIMENTO`
*   **Atividade Coletiva:** `UUID_FICHA + CNS_PARTICIPANTE` (Pois uma ficha tem vários participantes).
*   **Visita Domiciliar:** `UUID_FICHA + CID + CIAP` (Pois uma visita pode ter múltiplos desfechos/condições).

### 6.2. Smart Matching (No Frontend)
Mesmo se o CNS vier errado do e-SUS (ex: digitado no campo CPF), o Dashboard Web utiliza uma lógica de "Smart Matching" (reconciliação por Nome/DataNasc) para atribuir a produção ao profissional correto.

---

## 7. Schema de Dados (JSON Payload) 📦

Cada lote de produção é enviado para a API (`ingestPecData`) seguindo estritamente este formato JSON.

### Estrutura do Objeto `record`
```json
{
  "externalId": "UUID_CODIGO",  // Chave única determinística (Idempotência)
  "professional": {
    "name": "NOME COMPLETO",
    "cns": "700000000000000",
    "cbo": "225125"
  },
  "patient": {
    "name": "NOME PACIENTE",
    "cns": "700000000000000",
    "sex": "M",  // ou "F"
    "cpf": "00000000000",
    "birthDate": "YYYY-MM-DD"
  },
  "unit": {
    "cnes": "1234567"
  },
  "procedure": {
    "code": "0301010072",      // Código SIGTAP ou procedimento interno
    "name": "CONSULTA MEDICA...",
    "type": "CONSULTATION",    // Enum: PROCEDURE, CONSULTATION, ODONTO...
    "cid": "J00",              // Opcional (Diagnóstico)
    "ciap": "R74"              // Opcional (Problema/Condição)
  },
  "productionDate": "YYYY-MM-DD" // Data da realização
}
```

### Tipos de Procedimento (`type`)
*   `PROCEDURE`: Procedimento Ambulatorial Simples.
*   `CONSULTATION`: Consulta Médica/Enfermagem.
*   `ODONTOLOGY`: Atendimento Odontológico (Ficha).
*   `ODONTO_PROCEDURE`: Procedimento dentro do atendimento odonto.
*   `VACCINATION`: Vacina aplicada.
*   `HOME_VISIT`: Visita Domiciliar.
*   `COLLECTIVE_ACTIVITY`: Atividade Coletiva.

### Destino no Firestore ☁️
Os dados são gravados na subcoleção `extractions` dentro do documento do município.
**Path:** `municipalities/{TIPO}/{ID_ENTIDADE}/{ID_MUNICIPIO}/extractions/{externalId}`

*   **TIPO:** `PUBLIC` ou `PRIVATE` (depende da entidade).
*   **ID_ENTIDADE:** Auto-detectado pela API via chave de acesso.
*   **externalId:** O mesmo ID gerado localmente (garante a atualização/merge).

---

## 9. CI/CD & GitHub Actions (Zero-Touch Build) 🤖

Para não depender de uma máquina local para compilar, configuramos um pipeline automatizado no GitHub Actions.

### Arquivo: `.github/workflows/build_and_release.yml`

Este workflow é acionado automaticamente **toda vez que uma TAG começando com 'v' é enviada** (`v3.4.1`, `v3.5.0`, etc.).

### O que o Robô faz (Simulação Windows):
1.  **Sobe uma VM Windows (`windows-latest`):** Uma máquina limpa na nuvem.
2.  **Instala Dependências:** Python 3.9, PyInstaller e **Inno Setup 6** (via Chocolatey).
3.  **Compila o Código:** Executa o PyInstaller usando `packaging/windows.spec`.
4.  **Gera o Instalador:** Executa o compilador `ISCC.exe` no script `packaging/setup_script.iss`.
5.  **Deploy Web:**
    *   Gera o arquivo `connector_version.json` dinamicamente com a versão da tag.
    *   Faz o deploy automático para o **Firebase Hosting** (para que os clientes detectem a atualização).
6.  **Publicação:**
    *   Cria a **Release** no GitHub.
    *   Faz o upload do instalador (`ProBPA_Connector_Setup_vX.X.exe`) nos assets.

**Resumo:** Você só precisa dar o `git push origin v3.X.X` e o GitHub faz todo o trabalho pesado de compilar e distribuir.

### Requisito Crítico (Segurança) 🔐
Para o deploy funcionar, o repositório precisa da seguinte **Secret** configurada (`Settings > Secrets and variables > Actions`): - Já está configurado no GitHub.

*   `FIREBASE_TOKEN`: Token gerado via `firebase login:ci`. Permite que o GitHub Action faça o deploy do JSON de versão no Firebase Hosting.

---

## 10. Comandos Úteis do Agente 🤖

Se você for um Agente AI lendo isso, use estes comandos para tarefas comuns:

*   **Rodar em Dev:** `python connector_app/launcher.py`
*   **Gerar Executável:** `cmd.exe /c build_exe.bat`
*   **Preparar Release:** `python connector_app/tools/release.py`
*   **Verificar Logs:** Os logs do conector ficam na caixa de texto da aba "Status". Não há arquivo de log físico por padrão (para economizar disco), tudo é memória + upload para API.

---

**Fim do Guia.** Guarde este arquivo em `docs/` para referência futura.
