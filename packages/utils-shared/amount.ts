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

export const numberToCurrencyString = (value: number) => {
	const symbol = CURRENCY_SYMBOL_MAP[stateBet.currency] ?? stateBet.currency;
	const floatValue = numberToFloat(value);
	const abs = Math.abs(floatValue);
	// Always at least 2 decimals. For tiny values (< 0.005, would round to $0.00) bump max precision
	// so the win is visible. toLocaleString strips trailing zeros down to the minimum.
	let maxDecimals = 2;
	if (abs > 0 && abs < 0.1) {
		maxDecimals = Math.min(8, Math.ceil(-Math.log10(abs)) + 1);
	}
	const formatted = floatValue.toLocaleString('en-US', {
		minimumFractionDigits: 2,
		maximumFractionDigits: maxDecimals,
	});
	return `${symbol} ${formatted}`;
};

export const bookEventAmountToCurrencyString = (bookEventAmount: number) => {
	const normalisedAmount = bookEventAmountToNormalisedAmount(bookEventAmount);
	return numberToCurrencyString(normalisedAmount);
};
