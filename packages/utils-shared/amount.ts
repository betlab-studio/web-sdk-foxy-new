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

const MAX_CURRENCY_DECIMALS = 3;

// Smallest decimal precision (2..MAX_CURRENCY_DECIMALS) that preserves the fractional part
// of `value`. Returns 2 when the value already fits in 2 decimals.
export const detectCurrencyDecimalPrecision = (value: number) => {
	const abs = Math.abs(numberToFloat(value));
	if (abs === 0) return 2;
	for (let d = 2; d <= MAX_CURRENCY_DECIMALS; d++) {
		const factor = 10 ** d;
		if (Math.abs(Math.round(abs * factor) / factor - abs) < 1e-9) return d;
	}
	return MAX_CURRENCY_DECIMALS;
};

export const numberToCurrencyString = (value: number) => {
	const symbol = CURRENCY_SYMBOL_MAP[stateBet.currency] ?? stateBet.currency;
	const floatValue = numberToFloat(value);
	const abs = Math.abs(floatValue);
	// Always at least 2 decimals, never more than MAX_CURRENCY_DECIMALS. For tiny values
	// (< 0.1) bump precision so the win stays visible instead of rounding to $0.00. For
	// larger values with sub-cent precision (e.g. balance 988.75 gaining a 0.006 win
	// → 988.756) bump precision so the change is visible instead of collapsing to 2
	// decimals. toLocaleString strips trailing zeros down to the minimum.
	let maxDecimals = 2;
	if (abs > 0 && abs < 0.1) {
		maxDecimals = Math.min(MAX_CURRENCY_DECIMALS, Math.ceil(-Math.log10(abs)) + 1);
	} else if (abs > 0) {
		maxDecimals = detectCurrencyDecimalPrecision(abs);
	}
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
