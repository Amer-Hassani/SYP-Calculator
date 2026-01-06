# spec.md — Dual Syrian Currency Settlement Calculator (Web App)

## 1) Goal

Build a **pure calculator** web app to help a buyer and shop settle a payment during a 3‑month overlap where **both old SYP and new SYP** circulate.

The user enters the **total price in new SYP** and then negotiates by editing how much they will **pay/give/receive** in **old SYP** and **new SYP**. The app continuously recalculates the remaining amount needed (or change owed) in the other currency.

No wallet/banknote inventory tracking. No “suggested banknote breakdowns.” The app shows **raw numeric amounts** only.

---

## 2) Currency & Conversion

- **Fixed conversion rate:** `100 old SYP = 1 new SYP`
- Use **integer-only** arithmetic in the UI (no decimals accepted in inputs).

### Banknote denominations (context)
- **Old SYP notes:** 5000, 2000, 1000, 500
- **New SYP notes:** 500, 200, 100, 25, 10

Because of denominations:
- Old SYP amounts should be in increments of **500**.
- New SYP amounts should be in increments of **5** (since 10 and 25 imply the minimum granular payable amount is 5, and any multiple of 5 is representable).

---

## 3) Core Equation

Let:
- **A** = total price in **new SYP** (user inputs)
- **B** = amount of **old SYP** the user is proposing to give/receive (user inputs)
- **C** = remaining amount in **new SYP** needed to complete settlement (user inputs)

Core relationship:

- **C = A − (B / 100)**
- Equivalent: **B = (A − C) × 100**
- Equivalent: **A = C + (B / 100)**

### Sign convention (negatives)
- **B > 0:** buyer gives shop B old SYP
- **B < 0:** shop gives buyer |B| old SYP (old SYP flowing to buyer)
- **C > 0:** buyer gives shop C new SYP
- **C < 0:** shop gives buyer |C| new SYP (change owed in new SYP)

Overpaying in old SYP is allowed and will typically produce **negative C**.

---

## 4) UI / Fields

All fields are editable (numeric-only). Labels should be clear about currency and direction.

### Fields
1) **A — Total price (new SYP)**  
   - Editable
2) **B — Old SYP amount (old SYP)**  
   - Editable  
   - Can be positive or negative
3) **C — New SYP remainder (new SYP)**  
   - Editable  
   - Can be positive or negative

### Default behavior when A is entered/changed
User expectation: “all old by default.”

- On A edit, set B to **A×100** and C to **0** *if possible under constraints*.
- Since B must be divisible by 500, apply B’s auto-correction after setting it:
  - `B := autocorrect_to_multiple(B, 500)`
  - Then recompute `C := A − B/100`

This means:
- If A is a multiple of 5, then A×100 is divisible by 500 and **C becomes 0**.
- If not, **C may become non-zero** after B auto-correct.

---

## 5) Input Constraints & Auto-correction Rules

### Allowed characters
- Only digits and an optional leading `-`.
- Disallow any other characters at input time when possible.
- If the user attempts to input invalid characters, show a message:  
  **“Only numbers are allowed.”**

### Integer-only
- No decimals anywhere.
- If a user pastes `12.5`, treat it as invalid (message) and do not accept it.

### Ranges (hard limits)
- **A:** `1 … 1,000,000,000`
- **B:** `-100,000,000,000 … 100,000,000,000`
- **C:** `-1,000,000,000 … 1,000,000,000`

If a user enters a value outside range:
- Clamp to min/max and show a brief message (toast or inline):  
  **“Value adjusted to allowed limit.”**

### Multiples / denomination constraints
- **A (new SYP total):** must be a multiple of **5**  
  Rationale: settlement amounts in new SYP are only physically representable in increments of 5 given available notes, and B/100 also moves in increments of 5 because B is multiple of 500.
  - Auto-correct A to nearest multiple of 5, ties round up.
- **B (old SYP amount):** must be a multiple of **500**
  - Auto-correct B to nearest multiple of 500, ties round up.
- **C (new SYP remainder):** must be a multiple of **5**
  - Auto-correct C to nearest multiple of 5, ties round up.

> Note on rounding ties: “exactly halfway” cannot occur from integer inputs for multiples of 5 or 500 (because halfway would require .5), but keep tie-round-up behavior for completeness and to handle pasted values if normalization ever changes.

### Auto-correct function
Implement reusable helper:

`autocorrect_to_multiple(n, m):`
- Returns the nearest integer multiple of `m` to `n`.
- If equidistant, return the higher multiple (round up).
- Must preserve sign correctly (works for negatives too).

---

## 6) Field Interaction Logic (Single Source of Truth)

Use “last edited field” to avoid circular updates.

### When user edits A
1. Parse and validate numeric input.
2. Clamp to allowed range.
3. Auto-correct to nearest multiple of 5.
4. Apply default “all old”:
   - `B := A * 100`
   - `B := autocorrect_to_multiple(B, 500)`
   - `C := A - (B / 100)`
5. Clamp B/C if needed (though should be within bounds for typical values).

### When user edits B
1. Parse and validate numeric input.
2. Clamp to allowed range.
3. Auto-correct to nearest multiple of 500.
4. Compute:
   - `C := A - (B / 100)`
5. Auto-correct C to nearest multiple of 5.
6. Recompute B to preserve exact equality after C correction:
   - `B := (A - C) * 100`
   - `B := autocorrect_to_multiple(B, 500)` (should already be valid if A and C are multiples of 5)
7. Final clamp B/C to bounds.

### When user edits C
1. Parse and validate numeric input.
2. Clamp to allowed range.
3. Auto-correct to nearest multiple of 5.
4. Compute:
   - `B := (A - C) * 100`
5. Auto-correct B to nearest multiple of 500 (should already be valid if A and C are multiples of 5).
6. Final clamp B.

### Empty state
- If A is empty, do not compute.
- Consider showing placeholders and disable B/C until A is valid.

---

## 7) Messages & UX States

### Informational message for negative remainder
If **C < 0**, display an inline message near C:

- Example text:  
  **“C is negative — this means you should receive |C| new SYP back from the shop.”**

If **B < 0**, optionally show similar message:
- **“B is negative — this means you should receive |B| old SYP from the shop.”**

### Validation messages (non-blocking)
- Invalid character input: **“Only numbers are allowed.”**
- Out of range clamp: **“Value adjusted to allowed limit.”**
- Auto-correct applied (optional, subtle):  
  **“Adjusted to nearest valid amount.”**  
  (Can be shown only when the number changes due to auto-correct.)

### Accessibility
- Use clear labels and helper text.
- Error/info messages should be announced to screen readers (ARIA live region).

---

## 8) Suggested Architecture (Simple SPA)

### Recommended stack
- **Frontend:** React + TypeScript (or Vue + TypeScript), single-page app
- **State mgmt:** local component state (no backend required)
- **Styling:** Tailwind or simple CSS
- **Hosting:** static hosting (Netlify/Vercel/S3)

### Modules / Components
- `App`
  - `CalculatorForm`
    - `NumericInput` for A/B/C (shared component)
    - `MessageBanner` or inline message blocks
- `lib/validation.ts`
  - `parseIntegerStrict`
  - `clamp`
  - `autocorrect_to_multiple`
- `lib/calc.ts`
  - `recomputeFromA`
  - `recomputeFromB`
  - `recomputeFromC`
  - Keep all calculations in one place with unit tests.

### State model
```ts
type Field = "A" | "B" | "C";

interface CalcState {
  A: number | null;
  B: number | null;
  C: number | null;
  lastEdited: Field | null;
  message: string | null;
}
```

---

## 9) Error Handling Details

- Parsing:
  - Reject empty string as `null`.
  - Reject any string not matching `^-?\d+$` (integers only).
- Prevent NaN propagation:
  - If A is null/invalid, do not compute B/C.
- Auto-correct always runs **after** clamp (so it never exceeds bounds by too much).
- For extremely large intermediate computations, use JS `number` safely:
  - A max 1e9 → A×100 = 1e11 fits safely within 53-bit integer range (9e15 approx).
  - B max 1e11 fits safely.
  - All arithmetic remains safe in integer domain.

---

## 10) Acceptance Criteria

1. User can input **A** (new SYP total); B and C update to default all-old (subject to rounding constraints).
2. User can edit **B** (old SYP); app auto-corrects to nearest 500 and updates C.
3. User can edit **C** (new SYP remainder); app auto-corrects to nearest 5 and updates B.
4. **Negative B and C are supported** and clearly explained with messages.
5. Inputs accept only integer numeric characters; invalid characters are rejected with a message.
6. Values are clamped to configured maxima/minima.
7. Equation consistency is preserved after auto-corrections.

---

## 11) Testing Plan

### Unit tests (lib functions)
- `autocorrect_to_multiple`
  - Positive numbers: rounds to nearest; tie rounds up.
  - Negative numbers: behaves symmetrically, tie rounds up (toward +∞ multiple).
  - Examples:
    - `autocorrect(7750, 500) = 8000`
    - `autocorrect(7600, 500) = 7500`
    - `autocorrect(-7750, 500) = -7500` (nearest, ties up)
- `clamp` boundaries
- `parseIntegerStrict` rejects decimals, commas, whitespace, alpha.

### Integration tests (calculator flows)
- **A entry resets**:
  - A=120 → B=12000, C=0
- **B change recomputes**:
  - A=120, set B=9500 → autocorrect B=9500 (valid) → C=120 - 95 = 25
- **Overpay in old**:
  - A=120, set B=18000 → C=120 - 180 = -60 → message for negative C.
- **Non-multiple B autocorrect**:
  - A=120, user types B=7700 → autocorrect to 7500 or 8000 (nearest; 7700 closer to 7500) → recompute C.
- **C autocorrect**:
  - A=120, user types C=23 → autocorrect C=25 → recompute B.
- **Range clamp**:
  - A > 1e9 clamps to 1e9.
  - B > 1e11 clamps.
  - C > 1e9 clamps.
- **Invalid characters**:
  - typing “12a” is rejected; message shown.

### UI/UX tests
- Mobile layout: inputs readable and tappable.
- ARIA: message announcements.
- No calculation loops/jitter when rapidly typing.

---

## 12) Out of Scope

- Fetching live/official conversion rates.
- Multi-currency support beyond old/new SYP.
- Wallet/banknote inventory entry or automatic banknote breakdown suggestions.
- User accounts, storage, analytics (unless added later).

