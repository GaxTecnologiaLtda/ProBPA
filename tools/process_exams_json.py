import json
import re
import sys

def clean_code(code):
    if not code or code == '-':
        return None
    # Remove dots, hyphens, spaces
    return re.sub(r'[^a-zA-Z0-9]', '', code)

def process_exams(input_path, output_path):
    with open(input_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    cleaned_list = []

    for item in data:
        sigtap = item.get("Código SIGTAP*")
        sigtap_desc = item.get("Descrição SIGTAP")
        ab_code = item.get("Código AB correspondente")
        ab_desc = item.get("Descrição AB")
        
        # Clean codes
        sigtap_clean = clean_code(sigtap)
        ab_clean = clean_code(ab_code)

        # Logic: Use SIGTAP if available, else AB
        final_code = sigtap_clean if sigtap_clean else ab_clean
        final_desc = sigtap_desc if sigtap_clean else ab_desc

        if not final_code:
            continue

        cleaned_list.append({
            "value": final_code,
            "label": f"{final_code} - {final_desc}",
            "original_sigtap": sigtap_clean,
            "original_ab": ab_clean,
            "result_structure": item.get("Estrutura do resultado do exame"),
            "unit": item.get("Unidade Medida")
        })

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(cleaned_list, f, ensure_ascii=False, indent=2)
    
    print(f"Processed {len(cleaned_list)} exams to {output_path}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python process_exams_json.py <input_json> <output_json>")
        sys.exit(1)
    
    process_exams(sys.argv[1], sys.argv[2])
