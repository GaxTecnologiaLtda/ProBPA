#!/bin/bash
# Prepares the package to be transferred to the Windows Build Machine

echo "📦 Preparando pacote para transferência..."

PKG_DIR="pacote_transferencia_windows"
rm -rf $PKG_DIR
mkdir -p $PKG_DIR

# Copia fontes e scripts
cp pec_connector.py $PKG_DIR/
cp deep_map_esus.py $PKG_DIR/
cp "requirements.txt" "$PKG_DIR/"
cp "README_CLIENTE.txt" "$PKG_DIR/"
cp "agendar_tarefa.bat" "$PKG_DIR/"
cp .env.example $PKG_DIR/ 2>/dev/null || touch $PKG_DIR/.env.example # Optional

# Copia scripts Windows criados
cp setup_secure.bat $PKG_DIR/
cp run_secure.bat $PKG_DIR/
cp build_exe.bat $PKG_DIR/
cp install_build_env.bat $PKG_DIR/ 2>/dev/null # Will create this next
cp README.txt $PKG_DIR/README_FINAL.txt
cp INSTRUCOES_SCANNER.txt $PKG_DIR/

# Cria Instruções de Build
cat <<EOF > $PKG_DIR/INSTRUCOES_BUILD.txt
=========================================================
   PASSO 1: PREPARACAO DO AMBIENTE (SUA MAQUINA)
=========================================================

1. Execute o arquivo 'install_build_env.bat' como Administrador.
   - Ele vai tentar instalar o Python (se nao tiver).
   - Vai instalar o PyInstaller.
   - Vai rodar o build automaticamente.

2. Apos o termino, uma pasta 'entrega_cliente' sera criada.
   ESTA eh a pasta que voce manda para o municipio.

=========================================================
EOF

echo "✅ Pacote criado na pasta '$PKG_DIR'."
echo "➡️  Copie esta pasta inteira para o seu Windows."
