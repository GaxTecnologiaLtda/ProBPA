================================================================================
GUIA DE INSTALAÇÃO - CONECTOR PEC (ProBPA)
================================================================================

Este pacote contém o software necessário para enviar dados do e-SUS para o ProBPA.

CONTEÚDO DA PASTA:
1. setup_secure.bat    -> Script de Configuração Inicial (Rode este primeiro!)
2. run_secure.bat      -> Script de Execução (Roda o envio manualmente)
3. pec_connector.exe   -> O programa principal
4. agendar_tarefa.bat  -> Cria o agendamento automático no Windows

--------------------------------------------------------------------------------
PASSO 1: INSTALAÇÃO
--------------------------------------------------------------------------------
1. Copie esta pasta "entrega_cliente" para um local fixo no servidor (Ex: C:\ProBPA).
2. Clique com botão direito em "setup_secure.bat" e escolha "Executar como Administrador".
3. O sistema vai pedir:
   - ID do Município (Pegue no Painel Web)
   - Chave de API (Pegue no Painel Web)
   - Senha do Banco de Dados Postgres (do e-SUS)
4. Ao final, ele fará um teste de conexão. Se der "OK", está pronto.

--------------------------------------------------------------------------------
PASSO 2: TESTE MANUAL
--------------------------------------------------------------------------------
Para testar se o envio está ocorrendo:
1. Dê um duplo-clique em "run_secure.bat".
2. Uma janela preta vai abrir, mostrar o progresso do envio e fechar (ou pedir tecla).
3. Verifique no Painel Web se os dados apareceram.

--------------------------------------------------------------------------------
PASSO 3: AUTOMATIZAÇÃO (AGENDAMENTO)
--------------------------------------------------------------------------------
Para que o envio ocorra todo dia automaticamente (sem precisar clicar):
1. Clique com botão direito em "agendar_tarefa.bat" e escolha "Executar como Administrador".
2. Isso criará uma Tarefa do Windows chamada "ProBPA_Conector" que roda todo dia às 09:00.

OU (Manualmente):
1. Abra o "Agendador de Tarefas" do Windows.
2. Crie uma Tarefa Básica -> Nome: "ProBPA".
3. Disparador: Diariamente às 09:00.
4. Ação: Iniciar Programa -> Selecione o arquivo "run_secure.bat" desta pasta.
5. Importante: Nas propriedades, marque "Executar com privilégios máximos".

--------------------------------------------------------------------------------
💡 SOBRE HORÁRIOS E COMPUTADOR DESLIGADO
--------------------------------------------------------------------------------
Fique tranquilo! O agendamento foi configurado com "Modo Inteligente".
- Se o computador estiver ligado às 09:00: O envio ocorre na hora.
- Se o computador estiver desligado: O envio ocorrerá **assim que alguém ligar** o computador.

Você não perde nenhum dia. :)

--------------------------------------------------------------------------------
SUPORTE
--------------------------------------------------------------------------------
Em caso de erro, tire um print da tela preta e envie para o suporte.
