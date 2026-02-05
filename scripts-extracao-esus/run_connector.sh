#!/bin/bash

# Navigate to script directory
cd "$(dirname "$0")"

# Activate Venv
if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
else
    echo "Erro: Ambiente virtual não encontrado. Rode ./setup_connector.sh primeiro."
    exit 1
fi

# Run Connector
# Passes all arguments ($@) to the python script
python pec_connector.py "$@"
