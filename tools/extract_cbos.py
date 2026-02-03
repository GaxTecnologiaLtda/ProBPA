import pdfplumber
import json
import re

# Absolute paths
pdf_path = "/Users/gabriel/GAX TECNOLOGIA/SYSTEMS/ProBPA/CBOs.pdf"
json_output_path = "/Users/gabriel/GAX TECNOLOGIA/SYSTEMS/ProBPA/src/apps/producao/services/cbo_mapping.json"

lista_cbos = []

print("Starting CBO PDF processing...")

try:
    with pdfplumber.open(pdf_path) as pdf:
        total_pages = len(pdf.pages)
        print(f"Total pages: {total_pages}")
        
        for i, page in enumerate(pdf.pages):
            # Extract table
            tables = page.extract_tables()
            
            for table in tables:
                for row in table:
                    # Filter out empty rows
                    if not row or len(row) < 2:
                        continue
                    
                    col0 = row[0].strip() if row[0] else ""
                    col1 = row[1].strip() if row[1] else ""

                    # Valid CBO code usually starts with digit. "CÓDIGO 2002" is header.
                    if "CODIGO" in col0.upper() or "CÓDIGO" in col0.upper():
                        continue
                    
                    # CBOs are usually numeric, sometimes xxxx-xx or similar.
                    # We accept if it looks like a code (digits)
                    # Some PDFs might have merged columns, so generic check:
                    if re.match(r'^\d', col0):
                        item = {
                            "codigo": col0,
                            "ocupacao": col1.replace('\n', ' ')
                        }
                        lista_cbos.append(item)

            if (i + 1) % 10 == 0:
                print(f"Processed {i+1}/{total_pages} pages. Items found so far: {len(lista_cbos)}")

    # Save as simple list of objects
    with open(json_output_path, 'w', encoding='utf-8') as f:
        json.dump(lista_cbos, f, ensure_ascii=False, indent=2)

    print(f"Success! '{json_output_path}' generated with {len(lista_cbos)} items.")

except Exception as e:
    print(f"Error: {e}")
