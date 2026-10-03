import React from "react";
import PropTypes from "prop-types";

/**
 * Format integer paise as ₹ with Indian grouping (e.g. ₹1,23,456.00).
 * @param {number} paise
 */
export function formatPaiseINR(paise) {
  if (paise == null || Number.isNaN(Number(paise))) return "—";
  const n = Math.trunc(Number(paise));
  if (!Number.isFinite(n)) return "—";
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  const rupees = Math.floor(abs / 100);
  const rem = abs % 100;
  const grouped = rupees.toLocaleString("en-IN");
  return `${sign}₹${grouped}.${String(rem).padStart(2, "0")}`;
}

const Money = ({ paise, className = "" }) => (
  <span className={`arambh-kpi-value ${className}`} style={{ fontSize: "inherit" }}>
    {formatPaiseINR(paise)}
  </span>
);

Money.propTypes = {
  paise: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  className: PropTypes.string,
};

export default Money;
