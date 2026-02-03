#!/bin/bash
# Builds the python script into a standalone executable
# useful if you don't want to install python/pip on the client machine.

source venv/bin/activate
pyinstaller --onefile --name pec_connector pec_connector.py

echo "Build complete. Binary is in dist/pec_connector"
