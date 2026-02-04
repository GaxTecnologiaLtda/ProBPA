# Changelog

Todos os passos notáveis deste projeto serão documentados neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [v3.4.1] - 2026-02-04
### Fixed
- **CRITICAL HOTFIX**: Correção de crash (`AttributeError: log_history`) ao finalizar o ciclo de extração com sucesso.
- **Odonto Query**: Correção de typo (`fai` -> `fao`) na consulta de atendimentos odontológicos que causava erro de execução.

## [v3.4.0] - 2026-02-04
### Added
- **UI Safety**: Botão "PARAR" adicionado para interromper extrações a qualquer momento.
- **UI Safety**: Mascaramento da senha de administrador (`***`) nas telas de configuração.
- **Performance**: Modo de Extração Incremental ("12 hours", "24 hours") que busca apenas novos registros baseados na última execução com sucesso.
- **Frontend**: Aumento do limite de visualização no painel para 10.000 registros (anteriormente 2.000).

## [v3.3.3] - 2026-02-04
### Fixed
- **Critical Data Loss**: Correção na geração de IDs para Atividade Coletiva e Visita Domiciliar. Anteriormente, registros da mesma ficha (vários participantes ou condições) estavam se sobrescrevendo. Agora geram IDs únicos (`UUID_PARTICIPANTE` ou `UUID_CID_CIAP`).

## [v3.3.2] - 2026-02-04
### Fixed
- **Hotfix**: Correção urgente de erro de sintaxe nos logs (`{{e}}`) que causava falha na extração.
- **Hotfix**: Restauração da detecção "Fuzzy" para Visita Domiciliar e "Smart Code" para Atividade Coletiva que haviam sido revertidos acidentalmente.

## [v3.3.1] - 2026-02-04
### Fixed
- **Home Visit**: Algoritmo de busca "fuzzy" para encontrar a chave estrangeira (`co_fat_...`) quando o nome exato não é conhecido.
- **Collective**: Extração dinâmica do código do procedimento (ex: '0101010010') ao invés do genérico 'ATIV_COLETIVA'.
- **Collective**: Detecção robusta da coluna de procedimento na tabela principal.
- **Debug**: Logs detalhados com as colunas disponíveis caso a tabela exista mas a FK não seja encontrada.

## [v3.3.0] - 2026-02-04
### Added
- **Release**: Versão Estável Oficial (Promovida da Beta 19).
- **Auto-Update**: Sistema completo de atualização automática zero-touch.
- **UX**: Nova tela de boas-vindas, trava de instância única e logs coloridos.

## [v3.3.0-beta.19] - 2026-02-04
### Fixed
- **Auto-Restart**: Removida flag `skipifsilent` do instalador que impedia o reinício automático após update.
- **UI**: Adicionada cor Ciano/Neon para logs de atualização no Dashboard.

## [v3.3.0-beta.18] - 2026-02-03
### Changed
- **Admin UI**: Reorganização completa da aba "Configuração".
- **Safety**: Adicionada seção "Zona de Perigo" para reset e desvinculação.

## [v3.3.0-beta.17] - 2026-02-03
### Fixed
- **Crash**: Restaurado método `setup_tray` que causava erro na inicialização.

## [v3.3.0-beta.16] - 2026-02-03
### Changed
- **Release**: Versão de "alvo" para testar o fluxo completo de update a partir da beta.15.

## [v3.3.0-beta.15] - 2026-02-03
### Fixed
- **Bug**: Correção de assinatura do método `check_initial_state` (TypeError).

## [v3.3.0-beta.14] - 2026-02-03
### Added
- **Single Instance Lock**: Sistema de socket local para impedir múltiplas instâncias.
- **Welcome Screen**: Tela de carregamento animada na inicialização.

## [v3.3.0-beta.13] - 2026-02-03
### Fixed
- **Updater**: Substituído `sys.exit()` por `os._exit(0)` para garantir fechamento forçado antes da instalação.

## [v3.3.0-beta.9] a [v3.3.0-beta.12]
### Added
- **Auto-Update**: Implementação inicial do sistema de verificação e download.
- **UI**: Barra de progresso no botão de download.
