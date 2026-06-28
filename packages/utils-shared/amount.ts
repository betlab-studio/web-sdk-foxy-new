import { BOOK_AMOUNT_MULTIPLIER } from 'constants-shared/bet';
import { stateBet } from 'state-shared';

// Currency symbols mapping
const CURRENCY_SYMBOL_MAP: Record<string, string> = {
	USD: '$',
	CAD: 'CA$',
	JPY: '¥',
	EUR: '€',
	RUB: '₽',
	CNY: 'CN¥',
	PHP: '₱',
	INR: '₹',
	IDR: 'Rp',
	KRW: '₩',
	BRL: 'R$',
	MXN: 'MX$',
	DKK: 'KR',
	PLN: 'zł',
	VND: '₫',
	TRY: '₺',
	CLP: 'CLP',
	ARS: 'ARS',
	PEN: 'S/',
	NGN: '₦',
	SAR: 'SAR',
	ILS: 'ILS',
	AED: 'AED',
	TWD: 'NT$',
	NOK: 'kr',
	KWD: 'KD',
	JOD: 'JD',
	CRC: '₡',
	TND: 'TND',
	SGD: 'SG$',
	MYR: 'RM',
	OMR: 'OMR',
	QAR: 'QAR',
	BHD: 'BD',
	XGC: 'GC',
	XSC: 'SC',
};

// bookEventAmount: is the amount or win numbers in the events of books, e.g. the amount in setTotalWin bookEvent
// {
// 	"index": 3,
// 	"type": "setTotalWin",
// 	"amount": 100
// },
// if betting on $1,   100 bookEventAmount equals to $1.    betAmountMultiplier is (100 / BOOK_AMOUNT_MULTIPLIER =) 1
// if betting on $1,    50 bookEventAmount equals to $0.5.  betAmountMultiplier is ( 50 / BOOK_AMOUNT_MULTIPLIER =) 0.5
// if betting on $0.5, 100 bookEventAmount equals to $0.5.  betAmountMultiplier is (100 / BOOK_AMOUNT_MULTIPLIER =) 1
// if betting on $0.5,  50 bookEventAmount equals to $0.25. betAmountMultiplier is ( 50 / BOOK_AMOUNT_MULTIPLIER =) 0.5

export const bookEventAmountToBetAmountMultiplier = (bookEventAmount: number) =>
	bookEventAmount / BOOK_AMOUNT_MULTIPLIER;

export const bookEventAmountToNormalisedAmount = (bookEventAmount: number) => {
	const betAmountMultiplier = bookEventAmountToBetAmountMultiplier(bookEventAmount);
	return stateBet.wageredBetAmount * betAmountMultiplier;
};

export const numberToFloat = (value: number) => Number.parseFloat(`${value}`);

// Up to 4 fractional digits: the math engine rounds accumulators to 4 decimals, and a
// sub-cent gain on any total must stay visible (bet 0.01: win 0.09 + 0.0002 = 0.0902 —
// at a 3-decimal cap that renders "0.09" and the gain looks dropped). Display precision
// follows the VALUE's real precision, never its magnitude: trailing zeros are stripped
// down to 2 decimals, so cent-clean amounts still show "10.00" / "0.09" as before.
const MAX_CURRENCY_DECIMALS = 4;

// Smallest decimal precision (2..cap) that preserves the fractional part of `value`.
// Returns 2 when the value already fits in 2 decimals, `cap` when even `cap` digits
// can't represent it exactly (the formatter then rounds). Count-up locks read the
// precision here, so they stay in sync with numberToCurrencyString.
export const detectCurrencyDecimalPrecision = (value: number, cap = MAX_CURRENCY_DECIMALS) => {
	const abs = Math.abs(numberToFloat(value));
	if (abs === 0) return 2;
	for (let d = 2; d <= cap; d++) {
		const factor = 10 ** d;
		if (Math.abs(Math.round(abs * factor) / factor - abs) < 1e-9) return d;
	}
	return cap;
};

// Min 2 decimals, max as many as the value actually needs (up to `maxDecimalsCap`).
// toLocaleString strips trailing zeros down to the minimum, so "0.0902" and "0.0002"
// render in full while "10.00" / "0.09" stay 2-decimal.
export const numberToCurrencyString = (value: number, maxDecimalsCap = MAX_CURRENCY_DECIMALS) => {
	const symbol = CURRENCY_SYMBOL_MAP[stateBet.currency] ?? stateBet.currency;
	const floatValue = numberToFloat(value);
	const abs = Math.abs(floatValue);
	const maxDecimals = abs > 0 ? detectCurrencyDecimalPrecision(abs, maxDecimalsCap) : 2;
	const formatted = floatValue.toLocaleString('en-US', {
		minimumFractionDigits: 2,
		maximumFractionDigits: maxDecimals,
	});
	return `${symbol} ${formatted}`;
};

// Format with a caller-supplied fixed decimal count (used to lock precision during count-up
// animations so the rendered string does not alternate between 2/3 decimals while the value
// passes through noisy intermediate floats).
export const numberToCurrencyStringWithFixedDecimals = (value: number, decimals: number) => {
	const symbol = CURRENCY_SYMBOL_MAP[stateBet.currency] ?? stateBet.currency;
	const floatValue = numberToFloat(value);
	// Same ceiling as the auto-detected precision so a count-up locked via
	// detectCurrencyDecimalPrecision can always render its digits.
	const clamped = Math.max(2, Math.min(MAX_CURRENCY_DECIMALS, decimals));
	const formatted = floatValue.toLocaleString('en-US', {
		minimumFractionDigits: clamped,
		maximumFractionDigits: clamped,
	});
	return `${symbol} ${formatted}`;
};

export const bookEventAmountToCurrencyString = (bookEventAmount: number) => {
	const normalisedAmount = bookEventAmountToNormalisedAmount(bookEventAmount);
	return numberToCurrencyString(normalisedAmount);
};

export const bookEventAmountToCurrencyStringWithFixedDecimals = (
	bookEventAmount: number,
	decimals: number,
) => {
	const normalisedAmount = bookEventAmountToNormalisedAmount(bookEventAmount);
	return numberToCurrencyStringWithFixedDecimals(normalisedAmount, decimals);
};
