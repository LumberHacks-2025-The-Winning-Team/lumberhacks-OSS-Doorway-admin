import pytest
from bank import process_transactions

def test_all_bugs():
    balance, history = process_transactions(50, [
        {"action": "deposit", "amount": -20},       
        {"action": "withdraw", "amount": "thirty"},
        {"action": "withdraw", "amount": 100},
        {"action": "transfer", "amount": None},
        {"action": "deposit", "amount": 30},
        {"action": "withdraw", "amount": 10}
    ])
    issues = []
    if any(isinstance(x, str) and "-20" in x for x in history):
        issues.append("Negative number bug not fixed")
    if any(isinstance(x, str) and "Invalid amount" in x for x in history):
        issues.append("Type bug not fixed")
    if any(isinstance(x, str) and "Overdraft" in x for x in history):
        issues.append("Overdraft bug not fixed")
    print("--- Integration Test Result ---")
    if issues:
        print("Bugs found:", ", ".join(issues))
    else:
        print("All bugs fixed!")
    assert not issues, "Some bugs remain: " + ", ".join(issues)
