import pytest
from bank import process_transactions

def test_negative_amount_rejection():
    _, history = process_transactions(0, [
        {"action": "deposit", "amount": -10},
        {"action": "withdraw", "amount": -5}
    ])
    assert history == [
        "Error: Negative amount -10 rejected",
        "Error: Negative amount -5 rejected"
    ]
