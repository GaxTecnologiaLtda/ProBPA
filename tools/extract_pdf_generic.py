import pdfplumber
import json
import sys
import re
import os

def normalize_header(header):
    if not header:
        return f"col_{id}"
    # Remove accents, lowercase, replace spaces with underscore
    header = header.strip().lower()
    # Simple regex to remove accents/special chars if needed, but keeping utf8 is usually fine for JSON keys
    # Let's just strip and lower
    return header

def extract_pdf_tables(pdf_path, output_path):
    print(f"Processing: {pdf_path}")
    
    all_data = []
    headers = None

    try:
        with pdfplumber.open(pdf_path) as pdf:
            total_pages = len(pdf.pages)
            print(f"Total pages: {total_pages}")

            for i, page in enumerate(pdf.pages):
                tables = page.extract_tables()
                
                for table in tables:
                    if not table:
                        continue
                    
                    # Assume first valid row of the *first* table found is the header
                    # If headers repeat on pages, we need to handle that.
                    
                    start_row_index = 0
                    
                    if headers is None:
                        # Finding the header row
                        # Heuristic: First row that isn't empty/null
                        clean_row = [c.replace('\n', ' ').strip() if c else "" for c in table[0]]
                        headers = clean_row
                        start_row_index = 1
                        print(f"Detected Headers: {headers}")
                    
                    for row_idx in range(start_row_index, len(table)):
                        row = table[row_idx]
                        if not row: continue
                        
                        # Skip if row looks like the header (repeated header)
                        clean_row_check = [c.replace('\n', ' ').strip() if c else "" for c in row]
                        if clean_row_check == headers:
                            continue

                        item = {}
                        has_data = False
                        for col_idx, cell in enumerate(row):
                            if col_idx < len(headers):
                                key = headers[col_idx]
                                val = cell.strip().replace('\n', ' ') if cell else ""
                                if val: has_data = True
                                item[key] = val
                        
                        if has_data:
                            all_data.append(item)

                if (i + 1) % 10 == 0:
                    print(f"Processed {i+1} pages...")

        # Ensure directory exists
        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(all_data, f, ensure_ascii=False, indent=2)

        print(f"Done. Extracted {len(all_data)} records to {output_path}")

    except Exception as e:
        print(f"Error extracting PDF: {e}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python extract_pdf_generic.py <pdf_path> <output_json_path>")
        sys.exit(1)
    
    extract_pdf_tables(sys.argv[1], sys.argv[2])
