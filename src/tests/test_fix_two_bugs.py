import pytest
from fix_two_bugs import process_transactions

def test_overdraft_and_type():
    result_balance, history = process_transactions(30, [
        {"action": "withdraw", "amount": 100},
        {"action": "deposit", "amount": "abc"},
        {"action": "withdraw", "amount": None},
        {"action": "deposit", "amount": 50}
    ])
    assert "Error: Overdraft not allowed" in history
    assert "Error: Invalid amount abc" in history
    assert any("Error: Invalid amount" in msg for msg in history)
    assert "Deposited 50.0, balance: 80.0" in history
