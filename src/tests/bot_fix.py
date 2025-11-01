import pytest
from bank import process_transactions

def test_overdraft_handling():
    # Expecting error for withdrawal larger than balance
    _, history = process_transactions(50, [
        {"action": "withdraw", "amount": 100}   # Should trigger overdraft error
    ])
    assert "Error: Insufficient funds for withdrawal" in history

def test_non_numeric_amount_handling():
    # Expecting error for non-numeric input
    _, history = process_transactions(100, [
        {"action": "deposit", "amount": "fifty"},    # Should trigger invalid amount error
        {"action": "withdraw", "amount": None},      # Also a non-numeric case
    ])
    assert "Error: Invalid amount fifty" in history
    assert any("Error: Invalid amount" in msg for msg in history)

def test_accept_valid_transactions():
    # Control: ensure valid transactions are processed correctly
    final_balance, history = process_transactions(100, [
        {"action": "deposit", "amount": 50},
        {"action": "withdraw", "amount": 30}
    ])
    assert final_balance == 120
    assert "Deposited 50, balance: 150" in history
    assert "Withdrew 30, balance: 120" in history
