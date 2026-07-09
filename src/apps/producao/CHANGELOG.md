# Changelog

## [2.4.1] - 2026-05-11
### Ajuste Fino: Bloqueio Retroativo por Município
- **Bloqueio Individualizado**: A trava de digitação retroativa agora respeita rigorosamente a configuração de cada município, evitando bloqueios globais indevidos.
- **Flexibilidade**: Definir a tolerância como "0" agora libera completamente a digitação retroativa (acesso ilimitado).
- **Interface**: Alerta de bloqueio atualizado para informar a data limite configurada.

## [2.4.0] - 2026-05-09
### Tolerância Retroativa & Observabilidade
- **[GERAL] Bloqueio Retroativo:** Implementado bloqueio inteligente que impede digitação de produção do mês anterior após o prazo de tolerância (em dias) estipulado pela coordenação do município.

## [2.3.0] - 2026-04-27
### Competência Inteligente e Precisão de Dados
- **[GERAL] Competência Inteligente:** Agora, ao alterar a Data de Atendimento, o sistema atualiza automaticamente a Competência SIGTAP correspondente, prevenindo erros comuns de lançamento em meses retroativos.
- **[GERAL] Precisão nos Contadores:** Os totalizadores gerais do **Dashboard** e do **Histórico** foram alinhados para ignorar atendimentos excluídos (cancelados), refletindo com precisão a produção real faturável do profissional.
- **[GERAL] Identificação de Unidade:** O seletor de Unidades de Realização agora exibe o nome do município junto ao nome da unidade, facilitando a escolha correta para profissionais que atuam em múltiplos municípios.

## [2.2.0] - 2026-03-29
### Melhorias de Busca e Precisão no Histórico
- **[GERAL] Busca Inteligente:** O campo de pesquisa de procedimentos agora aceita partes do nome, ignora acentuação e exibe até 150 itens (contra os 20 anteriores), facilitando e acelerando a rotina de busca.
- **[GERAL] Histórico Preciso:** Os totalizadores numéricos na aba Histórico agora refletem corretamente a soma da Quantidade lançada em cada procedimento.
- **[GERAL] Agilidade no Cadastro:** A Data de Nascimento agora só é exigida com obrigatoriedade quando você for criar um paciente "Avulso" do zero. Pacientes que forem localizados pelo sistema pulam essa exigência.
- **[GERAL] Correção Visual:** Estabilizado o layout da janela de árvore de pesquisa do SIGTAP em dispositivos móveis e desktops.

## [2.1.0] - 2026-03-25
### Edição de Atendimentos e Prevenções
- **[GERAL] Histórico Interativo:** Modal de edição robusto no Histórico de Produção. Permite buscar pacientes globais, adicionar Sigtap via busca rápida e remover itens (com soft delete) sem fechar a página.
- **[GERAL] Controle de Quantidade:** Recurso flexível via (+/-) para aumentar ou diminuir a procedência de itens já gravados ou novos.
- **[GERAL] Indicadores Visuais:** Refatoração nos totalizadores dos cartões (`History.tsx`), agora exibindo claramente métricas e balões correspondentes aos itens ativos e cancelados isoladamente.
- **[GERAL] UI de Proteção:** Botão de envio (`Register.tsx`) agora desabilita inteligentemente as fichas que detiverem zero procedimentos englobados, gerando notificação preditiva (Tooltip hover).

## [2.0.0] - 2026-03-17
### Onboarding Simplificado e UI Móvel
- **[SIMP] Tour Guiado:** Passo-a-passo interativo para orientar os profissionais no painel simplificado, reduzindo inconsistências na digitação.
- **[GERAL] Responsividade:** Melhoria na visualização de modais e orientações em telas menores (mobile).
- **[GERAL] UI de Notificações:** Indicador visual de nova versão do sistema mais chamativo e moderno.

## [1.10.2] - 2026-03-02
### Estabilidade e Gerenciamento de Profissionais

#### Interface Simplificada (Correções)
- **[SIMP] Atividade Coletiva:** Corrigido bug onde procedimentos básicos de enfermagem (ex: Aferição de Pressão, Medição de Altura) eram identificados incorretamente como Atividade Coletiva, bloqueando o fluxo de registro simplificado.

## [1.10.0] - 2026-01-26
### Central de Tutoriais e Onboarding

#### Tutoriais e Ajuda
- **[GERAL] Nova Central de Ajuda:** Área dedicada com vídeos e manuais.
- **[SIMP] Tour Guiado:** Apresentação interativa das funcionalidades simplificadas.

## [1.9.0] - 2026-01-24
### Múltiplos Vínculos e Melhorias de UX

#### Gestão de Unidades (Múltiplos Vínculos)
- **[GERAL] Seletor de Unidades:** Novo alternador de unidade no topo da tela de Registro, permitindo troca rápida de contexto.
- **[GERAL] Bloqueio de Seleção:** Tela obrigatória de seleção de unidade para profissionais com múltiplos vínculos, garantindo o carregamento correto da interface (PEC/Simplificado).
- **[GERAL] Sincronização:** A seleção de unidade agora é global, sincronizando automaticamente entre Perfil e Registro.

#### Melhorias de Interface e Correções
- **[GERAL] Auto-CBO:** Correção no preenchimento automático do CBO ao alternar unidades.
- **[UX] Busca SIGTAP:** Ajuste visual na lista de procedimentos (Dropdown) para evitar cortes na interface e melhorar a usabilidade.

## [1.8.0] - 2026-01-21
### Gestão de Cidadãos e Melhorias Offline

#### Lista de Pacientes e Edição
- **[GERAL] Nova Lista de Cidadãos:** Interface dedicada para visualizar e buscar todos os pacientes cadastrados no município.
- **[GERAL] Filtro Inteligente:** Visualize rapidamente apenas os pacientes da sua unidade de saúde ou expanda para toda a rede.
- **[GERAL] Edição de Dados:** Agora é possível corrigir informações de pacientes já cadastrados diretamente pelo painel.
- **[GERAL] Busca Instantânea:** Pesquisa otimizada por Nome, CPF ou CNS.

#### Modo Offline e Performance
- **[GERAL] Cache de Pacientes:** Funcionalidade para baixar a base completa de pacientes para o dispositivo, permitindo consulta e edição 100% offline.
- **[GERAL] Sincronização:** Melhorias na lógica de sincronização de dados cadastrais.

## [1.7.0] - 2026-01-19
### Segurança, Modo Offline e Melhorias Gerais

#### Segurança e Modo Offline
- **[GERAL] Segurança Reforçada:** Implementado Autenticação de Dois Fatores (MFA/2FA) via SMS para maior proteção.
- **[GERAL] Recuperação de Acesso:** Nova funcionalidade de redefinição de senha segura.
- **[GERAL] Modo Offline Avançado:** Login offline inteligente e cache local. Continue trabalhando mesmo sem internet.
- **[SIMP] Persistência de Interface:** Configurações de município (Simplificada/PEC) agora são mantidas mesmo offline.

#### Suporte Técnico e Histórico Aprimorado
- **[GERAL] Histórico de Produção:** Nova visualização detalhada, agrupada por dia e com modal de informações completas.
- **[GERAL] Suporte Técnico:** Canal direto e integrado para abertura de chamados de suporte.
- **[GERAL] Login:** Adicionada opção de visualizar senha para facilitar o acesso.

#### Melhorias de Interface e Navegação
- **[GERAL] Notificações de Versão:** Novo indicador visual para alertar sobre novidades no sistema.
- **[GERAL] Menu Lateral:** Acesso rápido ao histórico de atualizações diretamente pelo rodapé do menu.
- **[SIMP] Interface Simplificada:** Ajustes na renderização do modo simplificado para municípios sem PEC.
- **[GERAL] Correções Diversas:** Otimizações de desempenho e ajustes de layout.

## [1.6.0] - 2026-01-03
### Validações & Regras LEDI
- **Cadastro de Pacientes:** Implementada validação oficial de **CNS (Cartão Nacional de Saúde)** com Algoritmo Módulo 11 (Rotinas 1 e 2).
- **Validação de Nomes:** Novas regras para impedir nomes incompletos, com números ou espaços duplicados.
- **Vacinação:** Implementada validação obrigatória dos campos **Lote, Dose e Fabricante** para procedimentos imunobiológicos.
- **Conformidade:** Ajustes visuais e de lógica de negócio para evitar rejeições no envio ao Ministério da Saúde.
