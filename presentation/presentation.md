---
title: "OSSDoorway: Gamified OSS Learning Platform"
sub_title: "Making Open Source Contributions Accessible and Fun"
theme: 
    name: terminal-dark
---

Quick task overview
---

<!-- column_layout: [1, 1] -->

<!-- column: 0 -->

The goal of our work in this project was to create a quest (Q4) to add to the
original project.

We chose to create a quest based around **GitHub Actions**, since it is an often
overlooked feature of GitHub that can save people a considerable amount of time
by automatically testing code and extending the functionality of the repository.

<!-- column: 1 -->

![GitHub Actions logo](res/gh-actions.png)

<!-- end_slide -->

Quest 4 - Working with GitHub Actions
---

## Overview

There are several features of GitHub Actions we wanted to show off:

- Automating GitHub by opening a PR when a branch is published
- Automating PyTest Unit testing
- Automating PyTest Integration testing

<!-- end_slide -->

Quest 4 - Working with GitHub Actions
---

## Tasks

- T1: Create a branch to hold the user's changes.
- T2: Copy all of the GitHub Actions file from our public repo to their user repo,
then commit and push their changes. They are also instructed to look at the
created pull request that is created when they publish their branch.
- T3: Once those GitHub Actions files are copied, the user is instructed to
analyze the automatically created GitHub Pull Request along with the unit and
integration tests that ran. They are then instructed to fix the script containing the bugs that cause the unit tests to fail.
- T4: Once all of the unit tests in the PR pass, they're asked to fix the
bugs mentioned by the integration tests.
- T5: Close the pull request by merging the branch into main.
- T6: Quiz!

<!-- end_slide -->

Provided Unit & Integration Tests
---

In _Q4 T3_, the user is asked to copy some files from the public repo into their
user repo:

- Buggy python code
- Several GitHub Actions files

One of the GitHub Actions files will automatically create a **pull request**
when the repo is published.

Another GitHub Actions file that's copied will automatically run unit tests via
`pytest` to verify that the user-modified code is correct.

Once the first set of unit tests are fixed the user is asked to fix the
the first buggy script and commit+push their changes to their working branch.

Then, the user will be instructed to fix and merge the code referenced by the
failing unit tests created by the other buggy script,
and to also commit+push their changes to their working branch.

Once the all the unit tests pass, they're asked to make sure the integration
tests mentioned in the Pull Request pass when merging their working branch into
`main`.

<!-- end_slide -->

Provided Unit & Integration Tests
---

`sample_feature.py`
```python
def process_transactions(balance, transactions):
    history = []
    for t in transactions:
        action = t["action"]
        amount = t["amount"]
        # Fix for Bug 1: Reject negative amounts
        if isinstance(amount, (int, float)) and amount < 0:
            history.append(f"Error: Negative amount {amount} rejected")
            continue
        if action == "deposit":
            balance += amount
            history.append(f"Deposited {amount}, balance: {balance}")
        elif action == "withdraw":
            balance -= amount
            history.append(f"Withdrew {amount}, balance: {balance}")
        else:
            history.append("Unknown action")
    return balance, history
```
<!-- end_slide -->

Provided Unit & Integration Tests
---

`sample_fixTwoBugs.py`
```python
def process_transactions(balance, transactions):
    history = []
    for t in transactions:
        action = t["action"]
        amount = t["amount"]
        try:
            amount = float(amount)
        except (ValueError, TypeError):
            history.append(f"Error: Invalid amount {t['amount']}")
            continue
        if action == "deposit":
            balance += amount
            history.append(f"Deposited {amount}, balance: {balance}")
        elif action == "withdraw":
            if amount > balance:
                history.append("Error: Insufficient funds for withdrawal")
                continue
            balance -= amount
            history.append(f"Withdrew {amount}, balance: {balance}")
        else:
            history.append("Unknown action")
    return balance, history
```

<!-- end_slide -->

Demo
---

1. Show off the [Public Repo](https://github.com/LumberHacks-2025-The-Winning-Team/lumberhacks-OSS-Doorway-public)
2. Show off the [Admin Repo](https://github.com/LumberHacks-2025-The-Winning-Team/lumberhacks-OSS-Doorway-admin)
3. Demonstrate [user creation](https://github.com/LumberHacks-2025-The-Winning-Team/lumberhacks-OSS-Doorway-admin/issues/3)

<!-- end_slide -->

That's all!
---
