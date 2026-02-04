---
description: Workflow rigoroso para desenvolvimento, teste e lançamento do Conector ProBPA.
---

# Skill: Ciclo de Lançamento do Conector ProBPA

Este workflow define o procedimento padrão para atualizações do `connector_app`. O objetivo é garantir que nenhuma versão quebrada chegue à produção e que o Auto-Update seja sempre validado.

## 1. Regras de Ouro
1.  **Nunca commitar direto na MAIN**: Trabalhe sempre na branch de testes (padrão: `test/auto-update`).
2.  **Versionamento Obrigatório**: Toda mudança de código requer alteração em `connector_app/version.py`.
3.  **Tags Disparam Builds**: O GitHub Actions só gera release quando uma TAG é enviada.

## 2. Fluxo de Desenvolvimento (Ciclo Beta)

### Passo 2.1: Implementação e Teste Local
- Realize as alterações no código Python (`connector_app/`).
- Teste localmente com `python connector_app/launcher.py`.

### Passo 2.2: Preparar Release Beta
1.  **Atualizar Histórico**:
    Adicione as novidades no topo do arquivo `connector_app/CHANGELOG.md` sob a versão que será criada.
2.  **Incrementar Versão**:
    Edite `connector_app/version.py`:
    ```python
    __version__ = "3.3.0-beta.XX"  # Incremente o número beta
    ```
3.  **Commitar**:
    ```bash
    git add .
    git commit -m "feat(scope): descrição da mudança"
    ```

### Passo 2.3: Disparar Build e Deploy
1.  Criar Tag e Push:
    ```bash
    git tag v3.3.0-beta.XX
    git push origin test/auto-update --tags
    ```
2.  **Aguardar**: O GitHub Actions irá compilar o `.exe`, criar a Release e atualizar o `connector_version.json` no Firebase.

### Passo 2.4: Validação (Critical Step)
1.  Abra uma versão anterior do Conector instalada no PC.
2.  Aguarde o **Auto-Update** detectar a nova versão.
3.  Verifique:
    -   Detecção da versão correta?
    -   Download com barra de progresso?
    -   Fechamento automático do app?
    -   **Reabertura automática** na nova versão?
    -   Logs de cor Ciano (Update) aparecem no Dashboard?

## 3. Fluxo de Produção (Ciclo Main)

**SOMENTE** após o Passo 2.4 ser validado com sucesso.

### Passo 3.1: Merge para Main
1.  Vá para a branch main:
    ```bash
    git checkout main
    git merge test/auto-update
    git push origin main
    ```

### Passo 3.2: Criar Release Estável (Produção)
Quando a versão Beta for aprovada e estiver pronta para o público geral:

1.  **Ajustar Versão para Estável**:
    Edite `connector_app/version.py` removendo o sufixo beta:
    ```python
    __version__ = "3.3.0"  # Sem '-beta.XX'
    ```
2.  **Commitar e Taggar na Main**:
    ```bash
    git add connector_app/version.py
    git commit -m "chore: promote to stable v3.3.0"
    git tag v3.3.0
    git push origin main --tags
    ```
    *Isso sobrescreverá o `connector_version.json` com a versão estável, fazendo com que TODOS os usuários (Beta e Antigos) atualizem para a Estável.*

## 4. Solução de Problemas Comuns

-   **App não reinicia após update:**
    -   Verifique se `setup_script.iss` **NÃO** tem a flag `skipifsilent` na seção `[Run]`.
-   **Travamento no Download:**
    -   Verifique se `core/updater.py` usa `os._exit(0)` em vez de `sys.exit()` para matar o processo "na marra".
-   **Múltiplos Ícones na Bandeja:**
    -   Verifique se `core/single_instance.py` está ativo no `main.py` antes de iniciar a GUI.
