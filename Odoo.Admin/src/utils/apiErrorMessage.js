/**
 * User-facing text from an API error or an isOk:false body.
 * Prefers field-level validation details over generic envelopes
 * such as "Invalid input data" or "Validation failed".
 */

const GENERIC = new Set([
  "invalid input data",
  "validation failed",
  "validation error",
  "not found",
  "an unexpected error occurred",
  "internal server error",
  "error",
]);

const isGeneric = (text) => {
  if (typeof text !== "string") return true;
  const trimmed = text.trim().toLowerCase();
  return !trimmed || GENERIC.has(trimmed);
};

const isErrorCode = (text) => /^[A-Z0-9_]+$/.test(text.trim());

const detailLines = (details) => {
  if (!Array.isArray(details) || details.length === 0) return "";
  return details
    .map((item) => {
      const msg = item?.message || item?.msg;
      if (!msg || isGeneric(msg)) return "";
      const field = item.field || (Array.isArray(item.path) ? item.path.join(".") : item.path);
      return field ? `${field}: ${msg}` : String(msg);
    })
    .filter(Boolean)
    .join(". ");
};

const bodyFrom = (error) => {
  if (!error || typeof error !== "object") return null;
  if (error.response?.data && typeof error.response.data === "object") {
    return error.response.data;
  }
  if (error.data && typeof error.data === "object" && (error.data.message || error.data.details || error.data.error || error.data.isOk === false)) {
    return error.data;
  }
  if (error.message || error.details || error.error || error.isOk === false) {
    return error;
  }
  return null;
};

/**
 * @param {unknown} error Axios error, Axios response, or `{ isOk:false }` body
 * @param {string} [fallback]
 * @returns {string}
 */
export function apiErrorMessage(error, fallback = "Something went wrong") {
  const data = bodyFrom(error);
  if (!data) return fallback;

  const fromDetails = detailLines(data.details);
  if (fromDetails) return fromDetails;

  const errObj = data.error;
  if (errObj && typeof errObj === "object") {
    const fromErrDetails = detailLines(errObj.details);
    if (fromErrDetails) return fromErrDetails;
    if (!isGeneric(errObj.message)) return String(errObj.message).trim();
  }

  if (!isGeneric(data.message)) return String(data.message).trim();

  if (typeof errObj === "string" && errObj.trim() && !isGeneric(errObj) && !isErrorCode(errObj)) {
    return errObj.trim();
  }

  if (typeof data.message === "string" && data.message.trim()) {
    return data.message.trim();
  }

  return fallback;
}

export default apiErrorMessage;
