import pdfplumber

pdf_path = "/Users/gabriel/GAX TECNOLOGIA/SYSTEMS/ProBPA/Tabela de Medicamentos CATMAT.pdf"

with pdfplumber.open(pdf_path) as pdf:
    first_page = pdf.pages[0]
    text = first_page.extract_text()
    print("--- RAW TEXT START ---")
    print(text)
    print("--- RAW TEXT END ---")
