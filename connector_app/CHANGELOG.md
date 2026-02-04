# Changelog

Todos os passos notáveis deste projeto serão documentados neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [v3.3.1-beta.1] - 2026-02-04
### Fixed
- **Extraction**: Correção crítica na extração de **Atividade Coletiva** (Detecção de colunas).
- **Extraction**: Correção na extração de **Visita Domiciliar** (Join condicional para Schema antigo).
- **Logs**: Correção de bug que ocultava mensagens de erro reais (`{e}`).

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
