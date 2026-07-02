import os
import re
import logging
from xhtml2pdf import pisa

logger = logging.getLogger(__name__)

def render_html_template_to_pdf(html_content, tokens, output_pdf_path):
    """
    Renders an HTML template with token replacement and table loops into a PDF file.
    """
    try:
        # 1. Process Table Row Loops for items
        items_list = tokens.get("items", [])
        if not isinstance(items_list, list):
            items_list = []
            
        tr_pattern = re.compile(r'(<tr\b[^>]*>.*?</tr>)', re.DOTALL | re.IGNORECASE)
        
        def replace_items_table(html_str):
            def replace_item_row(match):
                row_html = match.group(1)
                if 'item.' in row_html and items_list:
                    repeated_rows = []
                    for idx, list_item in enumerate(items_list):
                        row_copy = row_html
                        row_copy = re.sub(r'{{\s*item\.index\s*}}', str(idx + 1), row_copy, flags=re.IGNORECASE)
                        for item_key, item_val in list_item.items():
                            pattern = r'{{\s*item\.' + re.escape(item_key) + r'\s*}}'
                            row_copy = re.sub(pattern, str(item_val or ""), row_copy, flags=re.IGNORECASE)
                        repeated_rows.append(row_copy)
                    return "".join(repeated_rows)
                return row_html
            return tr_pattern.sub(replace_item_row, html_str)
            
        html_content = replace_items_table(html_content)
        
        # 2. Process Table Row Loops for payments
        payments_list = tokens.get("payments", [])
        if not isinstance(payments_list, list):
            payments_list = []
            
        def replace_payments_table(html_str):
            def replace_payment_row(match):
                row_html = match.group(1)
                if 'payment.' in row_html and payments_list:
                    repeated_rows = []
                    for idx, list_payment in enumerate(payments_list):
                        row_copy = row_html
                        row_copy = re.sub(r'{{\s*payment\.index\s*}}', str(idx + 1), row_copy, flags=re.IGNORECASE)
                        for pay_key, pay_val in list_payment.items():
                            pattern = r'{{\s*payment\.' + re.escape(pay_key) + r'\s*}}'
                            row_copy = re.sub(pattern, str(pay_val or ""), row_copy, flags=re.IGNORECASE)
                        repeated_rows.append(row_copy)
                    return "".join(repeated_rows)
                return row_html
            return tr_pattern.sub(replace_payment_row, html_str)
            
        html_content = replace_payments_table(html_content)
        
        # 3. Global tokens replacement
        for key, val in tokens.items():
            if key not in ["items", "payments", "floors"]:
                pattern = r'{{\s*' + re.escape(str(key)) + r'\s*}}'
                html_content = re.sub(pattern, str(val or ""), html_content, flags=re.IGNORECASE)
                
        # 4. Compile HTML to PDF using xhtml2pdf
        with open(output_pdf_path, "wb") as pdf_file:
            pisa_status = pisa.CreatePDF(html_content, dest_file=pdf_file)
            
        if pisa_status.err:
            logger.error(f"xhtml2pdf error: {pisa_status.err}")
            return False
            
        logger.info(f"HTML PDF conversion successful: {output_pdf_path}")
        return True
    except Exception as e:
        logger.error(f"HTML PDF conversion crashed: {e}")
        return False
