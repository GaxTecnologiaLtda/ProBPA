#!/bin/bash

echo "==========================================="
echo "   Instalador do Conector PEC (Secure)"
echo "==========================================="

# 1. Check Python
if ! command -v python3 &> /dev/null; then
    echo "ERRO: Python 3 não encontrado."
    exit 1
fi

# 2. Setup Venv
if [ ! -d "venv" ]; then
    echo "Criando ambiente virtual..."
    python3 -m venv venv
fi

# 3. Install Dependencies
echo "Instalando dependências..."
source venv/bin/activate
pip install -r requirements.txt
if [ $? -ne 0 ]; then
    echo "ERRO ao instalar dependências."
    exit 1
fi

# 4. Configure .env
echo ""
echo "--- Configuração de Segurança ---"
echo "Digite o ID do Município:"
read mun_id
echo "Digite a API KEY (Fornecida no Painel Admin):"
read api_key

echo ""
echo "--- Configuração do Banco de Dados (e-SUS Local) ---"
echo "Host (Padrão: localhost):"
read db_host
db_host=${db_host:-localhost}

echo "Porta (Padrão: 5432):"
read db_port
db_port=${db_port:-5432}

echo "Nome do Banco (Padrão: esus):"
read db_name
db_name=${db_name:-esus}

echo "Usuário (Padrão: postgres):"
read db_user
db_user=${db_user:-postgres}

echo "Senha do Banco:"
read -s db_pass

# Write .env
echo "MUNICIPALITY_ID=$mun_id" > .env
echo "API_KEY=$api_key" >> .env
echo "DB_HOST=$db_host" >> .env
echo "DB_PORT=$db_port" >> .env
echo "DB_NAME=$db_name" >> .env
echo "DB_USER=$db_user" >> .env
echo "DB_PASS=$db_pass" >> .env

# Set restricted permissions on .env (Only owner can read)
chmod 600 .env

echo ""
echo "==========================================="
echo "   Instalação Concluída!"
echo "   Arquivo .env gerado com permissões restritas (600)."
echo "==========================================="
echo ""
echo "Para testar:"
echo "  ./run_connector.sh --days 15"
