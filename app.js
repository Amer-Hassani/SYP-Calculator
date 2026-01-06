/**
 * Constants & Configuration
 */
const MIN_A = 1;
const MAX_A = 1_000_000_000;
const MIN_B = -100_000_000_000;
const MAX_B = 100_000_000_000;
const MIN_C = -1_000_000_000;
const MAX_C = 1_000_000_000;

const MULTIPLE_A = 5;
const MULTIPLE_B = 500;
const MULTIPLE_C = 5;

/**
 * Localization Data
 */
const i18n = {
    ar: {
        title: "حاسبة تسوية الدفع",
        subtitle: "حاسبة التسوية بين الليرة القديمة والجديدة",
        labelA: "المبلغ المطلوب دفعه",
        // B and C labels derived from buttons

        badgeNew: "ليرة سورية جديدة",
        badgeOld: "ليرة سورية قديمة",
        divider: "تفاصيل الدفع",
        btnLang: "English",

        btnPay: "دفع",
        btnReceive: "استلام",

        msgInvalid: "أرقام فقط",
        msgLimit: "تم التعديل للحد المسموح",

        descA: "المبلغ الإجمالي المطلوب تسويته: {0} ليرة جديدة",

        payOld: "عليك دفع {0} ليرة قديمة للبائع",
        receiveOld: "على البائع أن يعطيك {0} ليرة قديمة",

        payShop: "عليك دفع {0} ليرة جديدة للبائع",
        shopPays: "على البائع أن يعطيك {0} ليرة جديدة",
        settled: "خالص! لا يوجد باقي.",

        footer: "1 ليرة جديدة = 100 ليرة قديمة"
    },
    en: {
        title: "Payment Settlement",
        subtitle: "Dual SYP Calculator",
        labelA: "Amount to Pay",

        badgeNew: "New SYP",
        badgeOld: "Old SYP",
        divider: "Payment Details",
        btnLang: "عربي",

        btnPay: "Pay",
        btnReceive: "Receive",

        msgInvalid: "Numbers only",
        msgLimit: "Adjusted to limit",

        descA: "Total amount to settle: {0} New SYP",

        payOld: "You pay Shop {0} Old SYP",
        receiveOld: "Shop pays You {0} Old SYP",

        payShop: "You pay Shop {0} New SYP",
        shopPays: "Shop pays You {0} New SYP",
        settled: "Settled! No remainder.",

        footer: "1 New SYP = 100 Old SYP"
    }
};

/**
 * State
 */
const state = {
    A: null,
    B: null,
    C: null,
    lang: 'ar',
    activeField: 'A',
    inputBuffer: ''
};

/**
 * DOM Elements
 */
const el = {
    html: document.documentElement,
    langBtn: document.getElementById('lang-toggle'),
    langBtnText: document.querySelector('.lang-text'),

    inputA: document.getElementById('input-a'),
    inputB: document.getElementById('input-b'),
    inputC: document.getElementById('input-c'),

    wrapperA: document.getElementById('input-a').parentElement,
    wrapperB: document.getElementById('input-b').parentElement,
    wrapperC: document.getElementById('input-c').parentElement,

    btnSignB: document.getElementById('btn-sign-b'),
    btnSignC: document.getElementById('btn-sign-c'),

    msgA: document.getElementById('msg-a'),
    msgB: document.getElementById('msg-b'),
    msgC: document.getElementById('msg-c'),

    keypad: document.querySelector('.keypad-grid')
};

/**
 * Utility Functions
 */

function parseIntegerStrict(value) {
    if (!value) return null;
    const str = String(value);
    if (str.trim() === '') return null;
    const cleanStr = str.replace(/[^\d-]/g, '');
    const regex = /^-?\d+$/;
    if (cleanStr === '-' || cleanStr === '') return null;
    if (!regex.test(cleanStr)) return NaN;
    return parseInt(cleanStr, 10);
}

function formatNumber(num) {
    if (num === null || isNaN(num)) return '';
    return new Intl.NumberFormat('en-US').format(num).replace(/,/g, ' ');
}

function clamp(val, min, max) {
    return Math.min(Math.max(val, min), max);
}

function autocorrectToMultiple(n, m) {
    return Math.floor((n + m / 2) / m) * m;
}

function t(key) {
    return i18n[state.lang][key] || key;
}

/**
 * Core Logic
 */

function setActiveField(fieldId) {
    state.activeField = fieldId;

    [el.wrapperA, el.wrapperB, el.wrapperC].forEach(w => w.classList.remove('active'));
    el[`wrapper${fieldId}`].classList.add('active');

    const currentVal = state[fieldId];
    if (currentVal !== null) {
        state.inputBuffer = String(currentVal);
    } else {
        state.inputBuffer = '';
    }
}

function updateUI() {
    // 1. Check Disabled Rules
    if (state.A === null) {
        el.wrapperB.classList.add('disabled');
        el.wrapperC.classList.add('disabled');
        // Disable sign buttons too?
        if (el.btnSignB) el.btnSignB.disabled = true;
        if (el.btnSignC) el.btnSignC.disabled = true;
    } else {
        el.wrapperB.classList.remove('disabled');
        el.wrapperC.classList.remove('disabled');
        if (el.btnSignB) el.btnSignB.disabled = false;
        if (el.btnSignC) el.btnSignC.disabled = false;
    }

    // 2. Put values
    el.inputA.value = state.activeField === 'A' ? formatBuffer(state.inputBuffer) : (state.A !== null ? formatNumber(Math.abs(state.A)) : '');
    el.inputB.value = state.activeField === 'B' ? formatBuffer(state.inputBuffer) : (state.B !== null ? formatNumber(Math.abs(state.B)) : '');
    el.inputC.value = state.activeField === 'C' ? formatBuffer(state.inputBuffer) : (state.C !== null ? formatNumber(Math.abs(state.C)) : '');

    // 3. Update Sign Buttons
    updateSignButton(el.btnSignB, state.B);
    updateSignButton(el.btnSignC, state.C);

    renderMessages();
}

function updateSignButton(btn, value) {
    if (!btn) return;
    // Determine mode based on value sign
    const isReceive = value !== null && value < 0;

    if (isReceive) {
        btn.textContent = t('btnReceive');
        btn.className = 'sign-toggle-btn receive-mode';
    } else {
        btn.textContent = t('btnPay');
        btn.className = 'sign-toggle-btn pay-mode';
    }
}

function formatBuffer(buf) {
    if (buf === '') return '';
    if (buf === '-') return '-';
    const parsed = parseInt(buf.replace(/[^\d-]/g, ''), 10);
    if (!isNaN(parsed)) return formatNumber(Math.abs(parsed)); // Show ABS
    return buf;
}

function renderMessages() {
    ['A', 'B', 'C'].forEach(f => {
        const m = el[`msg${f}`];
        if (!m) return;
        m.className = 'message-area description-text';
    });

    if (state.A !== null) {
        const val = formatNumber(state.A);
        const safeVal = `\u200E${val}\u200E`;
        el.msgA.textContent = t('descA').replace('{0}', safeVal);
    } else {
        el.msgA.textContent = '';
    }

    // B/C Messages...
    if (state.B !== null) {
        const val = formatNumber(Math.abs(state.B));
        const safeVal = `\u200E${val}\u200E`;
        if (state.B > 0) el.msgB.textContent = t('payOld').replace('{0}', safeVal);
        else if (state.B < 0) { el.msgB.textContent = t('receiveOld').replace('{0}', safeVal); el.msgB.classList.add('message-info'); }
        else el.msgB.textContent = t('payOld').replace('{0}', safeVal);
    } else { el.msgB.textContent = ''; }

    if (state.C !== null) {
        const val = formatNumber(Math.abs(state.C));
        const safeVal = `\u200E${val}\u200E`;
        if (state.C > 0) el.msgC.textContent = t('payShop').replace('{0}', safeVal);
        else if (state.C < 0) { el.msgC.textContent = t('shopPays').replace('{0}', safeVal); el.msgC.classList.add('message-info'); }
        else el.msgC.textContent = t('settled');
    } else { el.msgC.textContent = ''; }
}

function processInput(char) {
    let buf = state.inputBuffer;

    if (char === 'clear') {
        buf = '';
    } else if (char === 'backspace') {
        buf = buf.slice(0, -1);
    } else if (char === '-') {
        if (buf.startsWith('-')) buf = buf.substring(1);
        else buf = '-' + buf;
    } else {
        if (buf.replace(/[^\d]/g, '').length < 15) {
            buf += char;
        }
    }

    state.inputBuffer = buf;

    let val = null;
    if (buf !== '' && buf !== '-') {
        val = parseInt(buf, 10);
    }

    if (val !== null && !isNaN(val)) {
        let min, max;
        if (state.activeField === 'A') { min = MIN_A; max = MAX_A; }
        else if (state.activeField === 'B') { min = MIN_B; max = MAX_B; }
        else if (state.activeField === 'C') { min = MIN_C; max = MAX_C; }

        if (val < min || val > max) val = clamp(val, min, max);
        state[state.activeField] = val;
    } else {
        state[state.activeField] = null;
    }

    // Core Calc Trigger
    recalculateLoose();
    updateUI();
}

function recalculateLoose() {
    const f = state.activeField;
    const a = state.A;
    const b = state.B;
    const c = state.C;

    // If A is not set, we can't really calculate dependents properly
    // But specific logic handled in disabled states.

    if (f === 'A') {
        if (a !== null) {
            state.B = a * 100;
            state.C = 0;
        } else {
            state.B = null;
            state.C = null;
        }
    } else if (f === 'B') {
        if (a !== null) {
            // Treat empty B as 0 for calculation purposes
            const valB = b !== null ? b : 0;
            state.C = Math.round(a - (valB / 100));
        }
    } else if (f === 'C') {
        if (a !== null) {
            // Treat empty C as 0 for calculation purposes
            const valC = c !== null ? c : 0;
            state.B = Math.round((a - valC) * 100);
        }
    }
}

function finalizeInput() {
    if (state.A === null && state.B === null && state.C === null) return;

    let a = state.A;
    let b = state.B;
    let c = state.C;
    const f = state.activeField;

    if (f === 'A') {
        if (a !== null) {
            a = autocorrectToMultiple(a, MULTIPLE_A);
            a = clamp(a, MIN_A, MAX_A);

            // Should we reset B and C?
            // Only reset if the current B/C values are NOT consistent with A
            // Equation is: A = (B/100) + C
            // We use a small epsilon or loose equality since floating point might differ slightly,
            // but here we are dealing with integers mostly (or rounded).
            // Let's calculate expected C given current B

            const currentB = b !== null ? b : 0;
            const currentC = c !== null ? c : 0;

            const expectedC = a - (currentB / 100);

            // Check if currentC is effectively equal to expectedC
            // (allow for very minor diff due to rounding if any, but our logic is int-based mostly)
            if (Math.abs(expectedC - currentC) > 0.01 || b === null) {
                // Not consistent, or B didn't exist. Reset to default "Pay" mode.
                b = a * 100;
                b = autocorrectToMultiple(b, MULTIPLE_B);
                b = clamp(b, MIN_B, MAX_B);
                c = a - (b / 100);
            }
        }
    } else if (f === 'B') {
        if (b !== null) {
            b = autocorrectToMultiple(b, MULTIPLE_B);
            b = clamp(b, MIN_B, MAX_B);
            if (a !== null) {
                c = a - (b / 100);
                c = autocorrectToMultiple(c, MULTIPLE_C);
                c = clamp(c, MIN_C, MAX_C);
                b = (a - c) * 100;
            }
        }
    } else if (f === 'C') {
        if (c !== null) {
            c = autocorrectToMultiple(c, MULTIPLE_C);
            c = clamp(c, MIN_C, MAX_C);
            if (a !== null) {
                b = (a - c) * 100;
                b = autocorrectToMultiple(b, MULTIPLE_B);
                b = clamp(b, MIN_B, MAX_B);
            }
        }
    }

    state.A = a;
    state.B = b;
    state.C = c;

    const newVal = state[f];
    state.inputBuffer = newVal !== null ? String(newVal) : '';

    updateUI();
}

/**
 * Event Listeners
 */

// Toggle Buttons
function toggleSign(field) {
    if (state[field] === null) return; // Ignore if empty
    state[field] *= -1;

    // Update buffer if active
    if (state.activeField === field) {
        state.inputBuffer = String(state[field]);
    }

    const oldActive = state.activeField;
    state.activeField = field;
    finalizeInput(); // Run strict logic on the new signed value
    if (oldActive !== field) {
        state.activeField = oldActive;
        const val = state[oldActive];
        state.inputBuffer = val !== null ? String(val) : '';
    }

    updateUI();
}

if (el.btnSignB) {
    el.btnSignB.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); toggleSign('B'); });
}
if (el.btnSignC) {
    el.btnSignC.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); toggleSign('C'); });
}

// Keypad
el.keypad.addEventListener('click', (e) => {
    if (e.target.classList.contains('keypad-btn')) {
        // Check disabled if active field?
        if (state.activeField !== 'A' && state.A === null) return; // Prevent input if disabled

        const key = e.target.getAttribute('data-key');
        processInput(key);
    }
});

// Activation
['A', 'B', 'C'].forEach(f => {
    const w = el[`wrapper${f}`];

    const activate = (e) => {
        // Prevent activation if A is empty and target is B or C
        if (f !== 'A' && state.A === null) {
            return;
        }

        if (state.activeField !== f) {
            finalizeInput();
            setActiveField(f);
            updateUI();
        }
    };

    w.addEventListener('click', activate);
    w.addEventListener('mousedown', (e) => { e.preventDefault(); activate(e); });
    w.addEventListener('touchstart', (e) => { e.preventDefault(); activate(e); });

    // Map keyboard
    const inp = el[`input${f}`];
    inp.addEventListener('keydown', (e) => {
        if (f !== 'A' && state.A === null) { e.preventDefault(); return; }

        const key = e.key;
        if (/\d/.test(key)) processInput(key);
        else if (key === 'Backspace') processInput('backspace');
        else if (key === '-') processInput('-');
        else if (key === 'Enter') finalizeInput();

        e.preventDefault();
    });
});

function init() {
    setLanguage('ar');
    setActiveField('A');
    updateUI();
}

/**
 * I18N Helper
 */
function setLanguage(lang) {
    state.lang = lang;
    el.html.lang = lang;
    el.html.dir = lang === 'ar' ? 'rtl' : 'ltr';
    el.html.style.fontFamily = lang === 'ar' ? "var(--font-ar)" : "var(--font-en)";

    document.querySelectorAll('[data-i18n]').forEach(elem => {
        const key = elem.getAttribute('data-i18n');
        // Only update if translations exist
        if (t(key)) elem.textContent = t(key);
    });
    el.langBtnText.textContent = t('btnLang');
    updateUI();
}

el.langBtn.addEventListener('click', () => {
    const newLang = state.lang === 'ar' ? 'en' : 'ar';
    setLanguage(newLang);
});

// Theme Logic
const themeBtn = document.getElementById('theme-toggle');
const themeIcon = themeBtn.querySelector('.theme-icon');

function setTheme(theme) {
    el.html.setAttribute('data-theme', theme);
    themeIcon.textContent = theme === 'light' ? '☀️' : '🌙';
}

themeBtn.addEventListener('click', () => {
    const current = el.html.getAttribute('data-theme');
    const newTheme = current === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
});

init();
