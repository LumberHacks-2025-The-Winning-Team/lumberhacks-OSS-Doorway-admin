import pytest
from bank import process_transactions

def test_all_logic_cases():
    _, history = process_transactions(100, [
        {"action": "withdraw", "amount": 150},        # Should reject: overdraft
        {"action": "deposit", "amount": "twenty"},    # Should reject: not a number
        {"action": "withdraw", "amount": 60},         # Accept: normal withdrawal
        {"action": "deposit", "amount": 40}           # Accept: normal deposit
    ])
    assert "Error: Insufficient funds for withdrawal" in history
    assert "Error: Invalid amount twenty" in history
    assert "Withdrew 60, balance: 40" in history
    assert "Deposited 40, balance: 80" in history
