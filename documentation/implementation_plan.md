# Fix Pay/Receive Toggle Reset

The Goal is to prevent the "Pay/Receive" mode (sign of B or C) from resetting unintentionally when the user interacts with the 'A' input field (Amount to Pay) but doesn't change the values in a way that necessitates a reset.

Currently, navigating away from field A triggers a recalculation that blindly resets B to the full 'Pay' amount (A * 100) and C to 0, overwriting any custom distribution or "Receive" status set in B or C.

## User Review Required

> [!NOTE]
> This change ensures that if the current values of B and C are already consistent with A (i.e., `A == B/100 + C`), they will be preserved when leaving field A. If A is modified to a new value that breaks this equality, B will still reset to the default "Pay" mode (Full amount in Old SYP), which is standard behavior for a new total.

## Proposed Changes

### Logic Update

#### [MODIFY] [app.js](file:///c:/Users/amerh/Desktop/Projects/SYP/app.js)

- Update `finalizeInput()` function.
- Inside the `if (f === 'A')` block:
    - Before setting `b = a * 100`, check if the existing `b` and `c` values satisfy the equation `a = b/100 + c`.
    - If they satisfy the equation (valid), skip the forced reset of `b` and `c`.
    - If they do not (invalid/changed), proceed with the reset (`b = a * 100`, `c = 0`).

## Verification Plan

### Manual Verification
1.  **Set "Receive" Mode**:
    - Enter `50` in Box A (New SYP). Wait for auto-calc (B=5000, C=0).
    - Toggle B to "Receive" (Click "Pay" button on B).
    - Expect: B = -5000. C updates to 100 (since 50 - (-50) = 100).
    - State: A=50, B=-5000, C=100.
2.  **Navigate to A**:
    - Click on Box A input.
    - (Do not change number).
3.  **Navigate Away**:
    - Click on Box B input.
    - **Expect**: B remains -5000 ("Receive"). C remains 100.
    - **Current Bug**: B resets to 5000 ("Pay"). C resets to 0.
4.  **Change A**:
    - Click Box A. Change `50` to `60`.
    - Navigate away.
    - **Expect**: B resets to 6000 ("Pay"), C resets to 0. (Standard recalculation).
