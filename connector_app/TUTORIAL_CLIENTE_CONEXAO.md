# Tutorial de Configuração: Conexão Segura ProBPA

Prezado cliente/parceiro,

Este tutorial descreve os passos necessários para conectar com segurança o Banco de Dados do e-SUS (PostgreSQL) da sua Secretaria de Saúde à infraestrutura em nuvem (ProBPA - Gax Tecnologia) para a geração dos relatórios e painéis analíticos.

Utilizaremos uma Rede Virtual Privada (VPN) chamada **Tailscale**, que implementa túneis criptografados de ponta a ponta (WireGuard). Isso garante que o banco de dados não fique exposto publicamente na internet.

---

## 🚀 Passo 1: Instalação da VPN (Tailscale)

### Para Servidores Windows
1. Faça o download do instalador acessando: 👉 **[Download Tailscale for Windows](https://tailscale.com/download/windows)**
2. Execute-o e prossiga com a instalação padrão (Next > Install > Finish).
3. **Não** é necessário fazer login manualmente no painel.
4. Abra o **Prompt de Comando (CMD) como Administrador** (Menu Iniciar > digite `cmd` > Clique com botão direito > Executar como administrador).
5. No prompt, cole o comando abaixo (substitua a chave `tskey-auth-XYZ...` pela chave que lhe enviaremos) e tecle `ENTER`:
   ```bash
   tailscale up --authkey=CHAVE_FORNECIDA_PELO_SUPORTE
   ```
   > ⚠️ **Atenção**: Se o terminal disser que `'tailscale' não é reconhecido como um comando interno`, feche o terminal CMD e abra-o novamente como Administrador. Se o erro persistir, digite `cd "C:\Program Files\Tailscale"` e tente o comando `tailscale up` novamente.

6. Aguarde processar. Se não houver erros, obtenha seu **IP Criptografado** com o comando:
   ```bash
   tailscale ip -4
   ```
   **Anote este IP (ex: 100.82.45.12), você precisará nos informar.**

### Para Servidores Linux
1. Acesse o terminal de seu servidor Linux (via SSH).
2. Baixe e instale o pacote oficial via script automático:
   ```bash
   curl -fsSL https://tailscale.com/install.sh | sh
   ```
3. Conecte sua máquina à rede privada informando a sua chave AuthKey (substitua a chave abaixo):
   ```bash
   sudo tailscale up --authkey=CHAVE_FORNECIDA_PELO_SUPORTE
   ```
4. Obtenha seu **IP Criptografado** da rede ProBPA com o comando:
   ```bash
   tailscale ip -4
   ```
   **Anote este IP (ex: 100.82.45.12), você precisará nos informar.**

---

## ⚙️ Passo 2: Liberação do Banco de Dados PostgreSQL

Agora que as máquinas estão na mesma rede privada, precisamos avisar o PostgreSQL para aceitar a conexão vinda desta rede.

1. **Localize a pasta de dados do PostgreSQL**. Dependendo do seu SO, ela ficará nestes diretórios comuns:
   - **Windows**: `C:\Program Files\e-SUS\database\pg_data` ou `C:\Program Files\PostgreSQL\14\data`
   - **Linux**: `/var/lib/pgsql/14/data`, `/etc/postgresql/14/main`, ou `/opt/e-SUS/database/pg_data`

2. Dentro desta pasta, localize ou abra com `nano` / Bloco de Notas o arquivo **`postgresql.conf`**:
   - Abra-o com o **Bloco de Notas**.
   - Procure (pressione `Ctrl + F`) pela linha: `#listen_addresses = 'localhost'` ou `listen_addresses = '*'`.
   - Altere ou certifique-se de que a linha esteja **exatamente** assim (sem o `#` no começo):
     ```conf
     listen_addresses = '*'
     ```
   - Salve e feche o arquivo.

3. Na mesma pasta, localize o arquivo **`pg_hba.conf`**:
   - Abra-o com o **Bloco de Notas** (ou preferencialmente **Notepad++**).
   - Vá até a última linha do arquivo. Adicione as duas regras abaixo. Na segunda regra, substitua o `100.x.x.x` pelo IP do Tailscale **desta máquina** (que você anotou no Passo 1):
     ```conf
     # Liberacao para o Servidor Central - ProBPA
     host    all             all             100.81.221.58/32        md5
     # Liberacao para o proprio Servidor Local (e-SUS) - IP do TailScale gerado no seu lado
     host    all             all             100.x.x.x/32            md5
     ```
   - *Nota: Caso sua instalação exija `scram-sha-256` no lugar de `md5`, pode utilizar.*
   - Salve e feche o arquivo.

---

## 🔒 Passo 3: Criação de Usuário de Leitura (Recomendado)

Para garantir a segurança dos dados, o ProBPA realiza apenas **leituras** (consultas de painéis). Se você não for fornecer a senha do usuário administrador (`postgres`), crie um usuário dedicado com permissões *read-only*.

Abra seu gerenciador de banco (PgAdmin, DBeaver) ou psql e execute os comandos abaixo no banco do e-SUS (geralmente `esus`):

```sql
-- 1. Criação do usuário (Altere a senha)
CREATE USER probpa_leitura WITH ENCRYPTED PASSWORD 'senha_segura_aqui';

-- 2. Permissão de conexão ao banco
GRANT CONNECT ON DATABASE esus TO probpa_leitura;

-- 3. Permissão de uso do schema público (onde ficam as tabelas)
GRANT USAGE ON SCHEMA public TO probpa_leitura;

-- 4. Permissão exclusiva de SELECT em todas as tabelas atuais e futuras
GRANT SELECT ON ALL TABLES IN SCHEMA public TO probpa_leitura;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO probpa_leitura;
```

---

## 🔄 Passo 4: Reiniciar o Serviço do Banco de Dados

Para que as alterações dos arquivos de configuração entrem em vigor, é preciso reiniciar o serviço do PostgreSQL.

### Para Windows:
1. Aperte as teclas `Windows + R`, digite `services.msc` e tecle ENTER.
2. Na lista de serviços, clique com o botão direito em **PostgreSQL** ou **e-SUS PEC Database** e selecione **Reiniciar** (Restart).

### Para Linux:
Abra o seu terminal (Bash) e execute um destes comandos (o que for compatível com a sua infraestrutura):
```bash
sudo systemctl restart postgresql
# OU se o e-SUS tiver um serviço autônomo na sua distribuição:
sudo systemctl restart e-sus-pec-database
```

> ⚠️ **Atenção: O Serviço Não Inicia Mais?**
> Se ao tentar Reiniciar o serviço do PostgreSQL ele falhar ou "desligar" sozinho, isso significa que ocorreu um erro de digitação de sintaxe (espaçamento ou falta de máscara) no arquivo `pg_hba.conf`. 
> 1. Volte ao arquivo `pg_hba.conf`.
> 2. Verifique se a linha do IP possui a máscara de rede (exemplo: `100.0.0.0/8` ou `100.x.x.x/32`). O PostgreSQL rejeita IPs puros sem a barra (ex: `100.122.66.44` causará pane; o certo é `100.122.66.44/32`).
> 3. Verifique se você usou a tecla `TAB` do teclado ou espaços simples para afastar as palavras. Letras coladas causam erro.
> 4. Salve o arquivo e tente Iniciar/Reiniciar o serviço novamente.

---

## ✅ Passo 5: Retorno ao Suporte ProBPA

Pronto! A infraestrutura está configurada com segurança de ponta.
Por favor, envie para o nosso suporte técnico as seguintes informações:

1. O IP do Tailscale (`100.x.x.x`) descoberto no Passo 1.
2. Nome ou ID do Município.
3. (Opcional) Confirmação do usuário e senha do banco de dados (geralmente `postgres` / `postgres` no e-SUS). Mande de forma segura!

Qualquer dúvida durante o processo, nossa equipe está à disposição.
