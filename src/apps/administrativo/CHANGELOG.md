# Changelog

## [1.1.0] - 2026-01-03
### Conformidade LEDI & Auditoria de Transmissão
- **Backend (Transmissão):** Atualização do protocolo de login para `multipart/form-data` (Conformidade Estrita).
- **Backend (Dispatcher):** Correção do envio de status de gestante em fichas odontológicas.
- **Backend (Tabelas):** Atualização da lista de CBOs permitidos conforme regras da versão 7.3.3.

## [1.0.0] - 2025-12-30
### Lançamento Inicial (Módulo LEDI)
- **Gestão de Lotes:** Nova interface "Lotes LEDI Enviados" (`LediBatches`) para auditoria de arquivos XML gerados.
- **Configuração PEC:** Campos para inserção de credenciais (URL, Usuário, Senha) na edição de Municípios.
- **Visualizador de Logs:** Drill-down detalhado de eventos de sucesso/erro com inspeção de payload XML.
- **Contigência:** Botão para testar conexão com API do e-SUS APS.
