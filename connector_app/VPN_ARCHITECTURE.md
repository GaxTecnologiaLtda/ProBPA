# Arquitetura SaaS ProBPA: Conector Centralizado via VPN (Tailscale)

Este documento descreve a arquitetura definitiva para a extração de dados do e-SUS PEC dos municípios clientes. Em vez de instalar o `connector_app` em cada prefeitura (descentralizado), adotamos um modelo de **Governança Centralizada (SaaS)** usando uma Rede Privada Virtual em Malha (Mesh VPN) com o **Tailscale**.

---

## 🏗️ Como Funciona a Arquitetura?

1. **O Motor Central (Servidor ProBPA):** 
   A Gax Tecnologia mantém um servidor único na nuvem (ex: VM no Google Cloud). Este servidor roda o aplicativo Conector em background.
2. **A Rede Privada (VPN):** 
   O servidor ProBPA e os servidores do PEC dos clientes recebem a instalação do **Tailscale**. Eles ganham IPs falsos privados (da faixa `100.x.x.x`) e se comunicam através da internet usando túneis altamente criptografados (WireGuard).
3. **Extração Simplificada:** 
   O Conector ProBPA, rodando no servidor central, conecta-se ao banco de dados do município cliente usando o IP `100.x.x.x` daquele cliente, extrai os dados e os envia para a nuvem.

### 🌟 Vantagens Absolutas
- **Zero Abertura de Portas (Firewall):** Não é necessário pedir para a TI da prefeitura abrir portas de internet públicas no roteador ou firewall para o banco de dados. O Tailscale fura o NAT com segurança.
- **Atualização Instantânea:** Quando o código do Conector ganha uma funcionalidade nova, atualizamos apenas o Servidor Central. Todos os municípios passam a rodar o código novo.
- **Isolamento de Credenciais:** Usamos **Auth Keys de Uso Único (Single-use)**. A prefeitura entra na rede do ProBPA sem nunca ver a senha do administrador ou outras máquinas da rede.

---

## 🛠️ Passo a Passo da Configuração

Abaixo está o mapeamento detalhado de como configurar uma nova prefeitura (Cliente) e como conectar o servidor ProBPA a ela.

### FASE 1: Preparação no Painel do Tailscale (Lado ProBPA)
Sempre que fechar um contrato com um município novo, você deve gerar uma chave segura de uso único para a instalação.

1. Acesse o **Admin Console** do Tailscale (com a conta da Gax Tecnologia).
2. Vá em **Settings** > **Keys**.
3. Clique em **Generate auth key**.
4. Configure assim:
   - ✅ **Pre-authorized** (A máquina do cliente entra sem aprovação manual).
   - ❌ **Reusable** (DEIXE DESMARCADO! Garante que a chave só funciona para instalar uma única máquina daquela prefeitura).
   - ❌ **Ephemeral** (DEIXE DESMARCADO!).
5. Copie a chave gerada (ela começa com `tskey-auth-...`).

---

### FASE 2: Instalação na Prefeitura (Lado do Cliente)

A prefeitura só precisa instalar o Tailscale e liberar a conexão do banco para o IP da VPN do servidor ProBPA.

#### Parte A - O Aplicativo da VPN
Na máquina onde o e-SUS PEC está rodando (Linux ou Windows):

**No Windows:**
1. Baixe o instalador `.exe` no site oficial do Tailscale e instale (Avançar, Avançar).
2. Quando a tela de Login no navegador abrir, feche-a.
3. Abra o **Prompt de Comando (CMD)** como Administrador.
4. Rode o comando de registro usando a chave criada na Fase 1:
   ```cmd
   tailscale up --authkey=tskey-auth-xxxxxx-yyyyyy
   ```
5. Rode `tailscale status` para ver o novo IP do servidor.

**No Linux:**
1. Instale pelo terminal: `curl -fsSL https://tailscale.com/install.sh | sh`
2. Registre-se: `sudo tailscale up --authkey=tskey-auth-xxxxxx-yyyyyy`

#### Parte B - Liberar o Banco de Dados (PostgreSQL)
A VPN já conectou os cabos invisíveis, mas precisamos "abrir a porta do software PostgreSQL" para que ele não bloqueie a leitura.

1. **Editar o `postgresql.conf`:**
   Encontre a pasta de dados do PostgreSQL do e-SUS.
   Abra o arquivo `postgresql.conf`, procure por `listen_addresses` e altere para (usar o IP local e o IP do Tailscale dessa prefeitura para máxima segurança):
   ```ini
   # Exemplo: IP do Tailscale dessa máquina
   listen_addresses = 'localhost, 100.82.63.113' 
   ```

2. **Editar o `pg_hba.conf`:**
   Este arquivo é a "lista de convidados VIP". Precisamos avisar que o IP do Servidor do Conector ProBPA tem permissão de entrada.
   Vá até o fim do texto, adicione uma linha em branco e cole EXATAMENTE esta linha:
   ```ini
   # Permitir conexoes do Servidor Central do Conector ProBPA
   hostnossl esus esus_leitura 100.81.221.58/32 md5
   ```
   > ⚠️ **Atenção:** Em algumas versões do e-SUS, o método de senha não é `md5`, mas sim `scram-sha-256`. O banco PostgreSQL não aceita linhas que comecem com o caractere `#` (comentários). Certifique-se de que a linha `hostnossl` não tenha `#` no início. O IP `100.81.221.58` deve ser obrigatoriamente o IP do Tailscale do seu servidor do Conector.

3. **Reiniciar:** Reinicie o serviço do PostgreSQL (acesse services.ms e localize o serviço do postgres, geralmente nomeado como e-SUS AB-PostgraSQL...)

---

### FASE 3: Conexão Final (Lado do Servidor ProBPA)
Na sua máquina (VM no Google Cloud) onde o Conector Python está rodando:

1. Abra a pasta do `connector_app`.
2. Configure as credenciais do novo município usando o IP do Tailscale que foi gerado na máquina do cliente na **Fase 2**.

**Dados do Banco Mapeados no Conector:**
- **URL/Host:** `100.x.x.x` (IP do Tailscale da Prefeitura)
- **Porta:** `5433` (Ou a porta original do PEC)
- **Banco/Database:** `esus`
- **Usuário:** `esus_leitura`
- **Senha:** `<senha_do_banco>`

Mande extrair os dados. A operação foi um sucesso! 🎉
