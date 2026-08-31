const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];
const TENS = [
  "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety",
];

function twoDigits(n: number): string {
  if (n < 20) return ONES[n];
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return TENS[tens] + (ones ? ` ${ONES[ones]}` : "");
}

function threeDigits(n: number): string {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const parts: string[] = [];
  if (hundreds) parts.push(`${ONES[hundreds]} Hundred`);
  if (rest) parts.push(twoDigits(rest));
  return parts.join(" ");
}

/**
 * Converts a whole number of rupees into words using the Indian numbering
 * system (lakh/crore rather than million/billion) — e.g. 152340 becomes
 * "One Lakh Fifty Two Thousand Three Hundred Forty".
 */
function numberToIndianWords(n: number): string {
  if (n === 0) return "Zero";

  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  const hundred = n;

  const parts: string[] = [];
  if (crore) parts.push(`${threeDigits(crore)} Crore`);
  if (lakh) parts.push(`${threeDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${threeDigits(thousand)} Thousand`);
  if (hundred) parts.push(threeDigits(hundred));

  return parts.join(" ");
}

/**
 * Formats a rupee amount as words for printing on a document, e.g.
 * 1750.50 -> "Rupees One Thousand Seven Hundred Fifty and Fifty Paise Only".
 * Whole-rupee amounts omit the paise clause entirely for a cleaner read.
 */
export function amountToWordsINR(amount: number): string {
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);

  const rupeeWords = numberToIndianWords(rupees);
  if (paise === 0) {
    return `Rupees ${rupeeWords} Only`;
  }
  const paiseWords = numberToIndianWords(paise);
  return `Rupees ${rupeeWords} and ${paiseWords} Paise Only`;
}
