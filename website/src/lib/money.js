/** Format integer paise as Indian rupees. */
export function formatPaise(paise) {
  const n = Number(paise) || 0;
  const rupees = n / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: n % 100 === 0 ? 0 : 2,
  }).format(rupees);
}
