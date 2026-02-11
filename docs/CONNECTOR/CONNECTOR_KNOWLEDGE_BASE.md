# Knowledge Base: ProBPA Connector 🧠

**Tipo:** Documento Conceitual & Decisões de Design (ADR)
**Contexto:** Interoperabilidade e-SUS PEC <-> ProBPA Cloud

Este documento captura o "Modelo Mental" e o "Conhecimento Tribal" acumulado sobre o Conector. Diferente do Guia Técnico (que diz *como* fazer), este documento explica *por que* o sistema é assim e *quais* são as nuances do negócio.

---

## 1. A Missão do Componente 🎯
O Conector não é apenas um script de upload; ele é uma **Ponte de Compatibilidade** entre dois mundos hostis:
1.  **Mundo On-Premise (Hostil):** Servidores Windows antigos, internet instável, bancos de dados PostgreSQL trancados, versões do e-SUS que mudam sem aviso.
2.  **Mundo Cloud (Ideal):** API REST limpa, Firebase, Dados Estruturados.

**O objetivo do Conector é abstrair a hostilidade do ambiente local para que a Cloud receba dados limpos.**

---

## 2. Decisões Arquiteturais Fundamentais (ADR) 🏛️

### 2.1. Por que Python + CustomTkinter?
*   **Decisão:** Abandonamos interfaces web locais (Flask/Django) em favor de uma GUI nativa (Tkinter).
*   **Porquê:** Profissionais de TI de prefeituras preferem executáveis que "abrem uma janela" e mostram logs. Interfaces web rodando em `localhost:5000` confundem usuários finais ("Onde está o site?").
*   **Benefício:** Menor overhead de suporte. O usuário vê o botão "Conectado" e confia.

### 2.2. Por que Inno Setup e não apenas PyInstaller?
*   **Problema:** O PyInstaller gera um executável, mas não cria atalhos, não registra no "Adicionar/Remover Programas" e não configura a inicialização com o Windows.
*   **Solução:** O Inno Setup cria uma experiência de instalação profissional ("Next, Next, Finish").
*   **Nuance:** O script `setup_script.iss` inclui lógica para matar processos antigos antes de atualizar, algo que seria difícil de fazer apenas com Python.

### 2.3. A Estratégia de Idempotência (O Segredo do `externalId`) 🔑
*   **O Desafio:** O conector pode rodar 100 vezes no mesmo dia. A internet pode cair no meio do upload.
*   **A Regra de Ouro:** Nunca confiar no ID sequencial do banco local (ele pode mudar se houver restore).
*   **A Solução:** Geramos chaves determinísticas baseadas no conteúdo imutável do registro:
    *   `UUID_FICHA` + `CODIGO_PROCEDIMENTO`
    *   `UUID_FICHA` + `CNS_PACIENTE`
*   **Resultado:** Se enviarmos o mesmo registro 10 vezes, o Firestore apenas atualiza o `updatedAt`, sem duplicar dados.

---

## 3. Nuances do Ecossistema e-SUS PEC 🦠

### 3.1. "Schema Drift" (A Dança das Colunas)
O e-SUS PEC muda a estrutura do banco de dados entre versões (Ex: v3.2 para v4.0).
*   **O Sintoma:** Erros de "Column not found".
*   **A Defesa:** Criamos o script `deep_map_esus.py` e queries defensivas que verificam a existência de tabelas antes de consultar.
*   **Lição:** Nunca assuma que uma coluna existe. Sempre faça queries exploratórias ou use `Try/Except` em blocos de extração.

### 3.2. A Fragmentação dos Dados
No e-SUS, uma "Ficha" não é uma linha nica.
*   Uma Ficha de Atendimento Individual (FAI) gera registros em 5+ tabelas (`tb_fat_atendimento_individual`, `tb_fat_procedimento`, `tb_fat_atd_ind_problemas`...).
*   **Nossa Lógica:** O Engine precisa fazer *joins* complexos para reconstruir o evento clínico completo (Quem atendeu? O que fez? Qual o diagnóstico?) antes de enviar o JSON.

---

## 4. Lições Aprendidas em Campo (War Stories) 🛡️

1.  **O Caso do "Agendador Zumbi":**
    *   *Problema:* Usuários fechavam a janela e achavam que o conector parava.
    *   *Solução:* Implementamos `pystray` (System Tray). Fechar a janela apenas minimiza para a bandeja. O processo continua vivo.

2.  **O Caso da "Dupla Instância":**
    *   *Problema:* O Agendador do Windows iniciava o conector, e o usuário clicava no ícone de novo. Resultado: Dois processos brigando pelo banco e pela API.
    *   *Solução:* `single_instance.py` com Socket Lock na porta 65432. Se a porta está ocupada, o segundo processo morre e avisa o primeiro.

3.  **O Caso do "Firewall da Prefeitura":**
    *   *Problema:* Prefeituras bloqueiam tudo que não é porta 80/443.
    *   *Solução:* Usamos HTTPS padrão (443) para o Firebase Functions. O binário é assinado (ou tenta ser) para evitar bloqueio de antivírus.

---

## 5. Mapa Mental de Manutenção 🗺️

*   **Deu erro de SQL?** -> RODE `deep_map_esus.py`. O e-SUS deve ter atualizado.
*   **Deu erro de Auth?** -> Renove a chave no painel web e atualize no desktop.
*   **Deu erro de Auto-Update?** -> Verifique o JSON no Firebase Hosting (`connector_version.json`).
*   **O Conector "sumiu"?** -> Verifique o System Tray (ícone perto do relógio).

Este documento encapsula a inteligência necessária para não apenas *operar*, mas *entender* o Conector.
