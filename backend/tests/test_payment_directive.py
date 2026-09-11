import pytest
from services.google_doc_engine import safe_float

def test_payment_row_simulation():
    tokens = {
        'payments': [
            {'date': '2026-09-01', 'reference': 'EFT-001', 'amount': 'R 15,000.00'},
            {'date': '2026-09-10', 'reference': 'EFT-002', 'amount': 25000.0}
        ]
    }
    
    payments_list = tokens.get('payments', [])
    generated = []
    payment_row_cells = [{'userEnteredValue': {'stringValue': 'mock'}}]
    
    for p_idx, p_obj in enumerate(payments_list):
        amt_raw = p_obj.get('amount')
        if amt_raw is not None and str(amt_raw).strip() != '':
            amt_str = str(amt_raw).strip()
            if not amt_str.startswith('R') and safe_float(amt_str) > 0:
                amt_formatted = f"R {safe_float(amt_str):,.2f}"
            else:
                amt_formatted = amt_str
        else:
            amt_formatted = ''
        
        pay_ctx = {
            'payment.index': str(p_idx + 1),
            'payment.date': str(p_obj.get('date') or ''),
            'payment.reference': str(p_obj.get('reference') or ''),
            'payment.amount': amt_formatted,
            '_is_spacer': False
        }
        generated.append(('[PAYMENT_ROW]', payment_row_cells, pay_ctx))
        
    assert len(generated) == 2
    assert generated[0][2]['payment.index'] == '1'
    assert generated[0][2]['payment.amount'] == 'R 15,000.00'
    assert generated[1][2]['payment.index'] == '2'
    assert generated[1][2]['payment.amount'] == 'R 25,000.00'
    print("ALL TESTS PASSED")

if __name__ == '__main__':
    test_payment_row_simulation()
