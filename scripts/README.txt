=========================================================
   CONECTOR PEC - PROBPA (Extração de Dados)
=========================================================

Este pacote contem os scripts para conectar o banco de dados e-SUS (PostgreSQL)
ao sistema ProBPA de forma segura via API.

CONTEUDO:
- setup_connector.bat  (Instalador Windows)
- run_connector.bat    (Executor Windows)
- setup_connector.sh   (Instalador Linux/Mac)
- run_connector.sh     (Executor Linux/Mac)
- pec_connector.py     (Script Principal Python)
- requirements.txt     (Dependencias)

=========================================================
   INSTRUCOES DE INSTALACAO (WINDOWS)
=========================================================

PREREQUISITOS:
1. Python 3 instalado (Marque "Add to PATH" na instalacao).
2. Acesso a internet.
3. Dados do Banco de Dados Local (Host, Porta, Usuario, Senha).
4. ID do Municipio e API KEY (Gerados no Painel Admin).

PASSO A PASSO:
1. Descompacte esta pasta em local seguro (Ex: C:\ProBPA\).
2. Clique com botao direito em 'setup_connector.bat' e "Executar como Administrador".
3. O terminal abrira. Siga as instrucoes na tela.
   - Cole o ID e a API KEY quando solicitado.
   - Informe os dados de conexao do banco.

4. Apos a instalacao, teste a execucao:
   Abra o CMD na pasta e digite:
   run_connector.bat --days 15

   Se aparecer "Extraction Completed", funcionou!

=========================================================
   AGENDAMENTO (WINDOWS)
=========================================================
Para rodar todo dia automaticamente:
1. Abra o "Agendador de Tarefas" do Windows.
2. Criar Tarefa Basica > Nome: "Conector PEC ProBPA".
3. Disparador: Diariamente as 10:00.
4. Acao: Iniciar Programa.
5. Programa/Script: Selecione o arquivo 'run_connector.bat'.
   IMPORTANTE: Em "Iniciar em (Opcional)", coloque o caminho da pasta (Ex: C:\ProBPA\).

=========================================================
   SUPORTE
=========================================================
Em caso de erro, verifique se o servico do PostgreSQL esta rodando
e se as credenciais no arquivo .env estao corretas.
