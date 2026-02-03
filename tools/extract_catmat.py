import pdfplumber
import json

# Absolute paths
pdf_path = "/Users/gabriel/GAX TECNOLOGIA/SYSTEMS/ProBPA/Tabela de Medicamentos CATMAT.pdf"
json_output_path = "/Users/gabriel/GAX TECNOLOGIA/SYSTEMS/ProBPA/src/apps/producao/services/catmat_mapping.json"

lista_medicamentos = []

print("Starting PDF processing (Table Mode)...")

try:
    with pdfplumber.open(pdf_path) as pdf:
        total_pages = len(pdf.pages)
        print(f"Total pages: {total_pages}")
        
        for i, page in enumerate(pdf.pages):
            # Extract table
            # settings can be adjusted if needed, but defaults are often good for bordered/aligned tables
            tables = page.extract_tables()
            
            for table in tables:
                for row in table:
                    # Filter out header rows or invalid rows
                    # Valid row must have 'BR' code in first column
                    if not row or not row[0]:
                        continue
                    
                    code = row[0].strip()
                    if not code.startswith("BR"):
                        continue
                        
                    # Assuming typical 5 column structure based on visual inspection
                    # If columns are merged, we might need robust handling, but let's try basic first
                    # Cols: Código, Princípio Ativo, Concentração, Forma, Unidade
                    
                    if len(row) >= 5:
                        item = {
                            "codigo": code,
                            "principioAtivo": row[1].replace('\n', ' ').strip() if row[1] else "",
                            "concentracao": row[2].replace('\n', ' ').strip() if row[2] else "",
                            "formaFarmaceutica": row[3].replace('\n', ' ').strip() if row[3] else "",
                            "unidadeFornecimento": row[4].replace('\n', ' ').strip() if row[4] else ""
                        }
                        lista_medicamentos.append(item)

            if (i + 1) % 10 == 0:
                print(f"Processed {i+1}/{total_pages} pages. Items found so far: {len(lista_medicamentos)}")

    # Save as simple list of objects
    with open(json_output_path, 'w', encoding='utf-8') as f:
        json.dump(lista_medicamentos, f, ensure_ascii=False, indent=2)

    print(f"Success! '{json_output_path}' generated with {len(lista_medicamentos)} items.")

except Exception as e:
    print(f"Error: {e}")
