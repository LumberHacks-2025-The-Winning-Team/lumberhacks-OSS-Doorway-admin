import pytest
from fix_negatives import process_transactions

def test_negative_handling():
    result_balance, history = process_transactions(100, [
        {"action": "deposit", "amount": -20},
        {"action": "withdraw", "amount": -10}
    ])
    assert history == [
        "Error: Negative amount -20 not allowed",
        "Error: Negative amount -10 not allowed"
    ]
