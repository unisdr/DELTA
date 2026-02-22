/**
 * List of systems supported currency.
 *
 * @returns array of string
 */
export function getCurrencyList(): string[] {
	// below values was taken from: console.log( Intl.supportedValuesOf('currency') );
	const currencyList: string[] = [
		"AED",
		"AFN",
		"ALL",
		"AMD",
		"ANG",
		"AOA",
		"ARS",
		"AUD",
		"AWG",
		"AZN",
		"BAM",
		"BBD",
		"BDT",
		"BGN",
		"BHD",
		"BIF",
		"BMD",
		"BND",
		"BOB",
		"BRL",
		"BSD",
		"BTN",
		"BWP",
		"BYN",
		"BZD",
		"CAD",
		"CDF",
		"CHF",
		"CLP",
		"CNY",
		"COP",
		"CRC",
		"CUC",
		"CUP",
		"CVE",
		"CZK",
		"DJF",
		"DKK",
		"DOP",
		"DZD",
		"EGP",
		"ERN",
		"ETB",
		"EUR",
		"FJD",
		"FKP",
		"GBP",
		"GEL",
		"GHS",
		"GIP",
		"GMD",
		"GNF",
		"GTQ",
		"GYD",
		"HKD",
		"HNL",
		"HRK",
		"HTG",
		"HUF",
		"IDR",
		"ILS",
		"INR",
		"IQD",
		"IRR",
		"ISK",
		"JMD",
		"JOD",
		"JPY",
		"KES",
		"KGS",
		"KHR",
		"KMF",
		"KPW",
		"KRW",
		"KWD",
		"KYD",
		"KZT",
		"LAK",
		"LBP",
		"LKR",
		"LRD",
		"LSL",
		"LYD",
		"MAD",
		"MDL",
		"MGA",
		"MKD",
		"MMK",
		"MNT",
		"MOP",
		"MRU",
		"MUR",
		"MVR",
		"MWK",
		"MXN",
		"MYR",
		"MZN",
		"NAD",
		"NGN",
		"NIO",
		"NOK",
		"NPR",
		"NZD",
		"OMR",
		"PAB",
		"PEN",
		"PGK",
		"PHP",
		"PKR",
		"PLN",
		"PYG",
		"QAR",
		"RON",
		"RSD",
		"RUB",
		"RWF",
		"SAR",
		"SBD",
		"SCR",
		"SDG",
		"SEK",
		"SGD",
		"SHP",
		"SLL",
		"SOS",
		"SRD",
		"SSP",
		"STN",
		"SVC",
		"SYP",
		"SZL",
		"THB",
		"TJS",
		"TMT",
		"TND",
		"TOP",
		"TRY",
		"TTD",
		"TWD",
		"TZS",
		"UAH",
		"UGX",
		"USD",
		"UYU",
		"UZS",
		"VES",
		"VND",
		"VUV",
		"WST",
		"XAF",
		"XCD",
		"XDR",
		"XOF",
		"XPF",
		"XSU",
		"YER",
		"ZAR",
		"ZMW",
		"ZWL",
	];

	return currencyList;
}

/**
 * Returns the currency symbol for a given ISO 4217 currency code.
 *
 * @param currencyCode - The three-letter currency code (e.g., 'USD', 'EUR', 'JPY').
 * @param locale - Optional BCP 47 locale string (defaults to 'en-US').
 * @returns The localized currency symbol (e.g., '$', '€', '¥').
 *
 * @example
 * getCurrencySymbol('USD'); // "$"
 * getCurrencySymbol('EUR', 'de-DE'); // "€"
 */
export function getCurrencySymbol(
	currencyCode: string,
	locale = "en-US",
): string {
	// Create a number formatter for the given locale and currency
	const formatter = new Intl.NumberFormat(locale, {
		style: "currency",
		currency: currencyCode,
		currencyDisplay: "symbol", // Ensures we get the symbol, not the code or name
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	});

	// Break the formatted string into parts to isolate the currency symbol
	const parts = formatter.formatToParts(1);

	// Find the part labeled as 'currency' and return its value
	const symbolPart = parts.find((p) => p.type === "currency");

	// Fallback to currency code if symbol is not found (shouldn't happen for supported codes)
	return symbolPart?.value ?? currencyCode;
}

/**
 * Check if currency is in the list.
 *
 * @param value
 * @returns boolean either true or false
 */
export function checkValidCurrency(value: string): boolean {
	const currencyList = getCurrencyList();
	return currencyList.includes(value.toUpperCase());
}

export function formatNumber(
	value: number,
	locale: string = "en-US",
	options: Intl.NumberFormatOptions = {},
): string {
	return new Intl.NumberFormat(locale, options).format(value);
}

/**
 * format number without decimals
 * @param value
 * @returns
 */
export const formatNumberWithoutDecimals = (value: number) => {
	if (value == null || isNaN(value)) return "N/A";
	return new Intl.NumberFormat("en-US", {
		style: "decimal",
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(value);
};
