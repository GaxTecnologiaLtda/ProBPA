
import pdfplumber
import sys
import json

files = [
    "/Users/gabriel/GAX TECNOLOGIA/SYSTEMS/ProBPA/Ficha de Procedimentos.pdf",
    "/Users/gabriel/GAX TECNOLOGIA/SYSTEMS/ProBPA/Ficha de Procedimentos _ Ministério da Saúde.pdf"
]

report = {}

for file_path in files:
    try:
        print(f"Processing: {file_path}...")
        file_content = ""
        tables = []
        with pdfplumber.open(file_path) as pdf:
            for page_num, page in enumerate(pdf.pages):
                text = page.extract_text()
                if text:
                    file_content += f"\n--- Page {page_num + 1} ---\n{text}\n"
                
                # Extract tables
                page_tables = page.extract_tables()
                for t in page_tables:
                    tables.append(t)
        
        report[file_path] = {
            "text": file_content[:10000], # Truncate primarily effectively unlimited for me but good for output management
            "tables": tables
        }
    except Exception as e:
        report[file_path] = {"error": str(e)}

print(json.dumps(report, indent=2, ensure_ascii=False))
