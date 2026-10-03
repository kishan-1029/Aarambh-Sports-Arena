/** ₹ with Indian grouping; dates noted as IST. */

export function formatPaise(paise) {
  const n = Number(paise) || 0;
  const rupees = n / 100;
  return `₹${rupees.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function toToolText(data, { title } = {}) {
  const body =
    typeof data === 'string' ? data : JSON.stringify(data, null, 0);
  const text = title ? `${title}\n${body}` : body;
  return { content: [{ type: 'text', text }] };
}

export function toToolError(err) {
  const message = err?.message || String(err);
  const status = err?.status || err?.statusCode;
  const details = err?.payload || err?.details;
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ error: message, status, details }, null, 0),
      },
    ],
    isError: true,
  };
}

export default { formatPaise, toToolText, toToolError };
