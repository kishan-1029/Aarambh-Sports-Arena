import React from "react";
import PropTypes from "prop-types";

const TONE_MAP = {
  success: "tone-success",
  active: "tone-success",
  confirmed: "tone-success",
  paid: "tone-success",
  warning: "tone-warning",
  pending: "tone-warning",
  expiring: "tone-warning",
  held: "tone-warning",
  danger: "tone-danger",
  cancelled: "tone-danger",
  failed: "tone-danger",
  void: "tone-danger",
  inactive: "tone-danger",
  info: "tone-info",
  draft: "tone-info",
  neutral: "tone-neutral",
};

/**
 * One colour map for statuses — text + dot (never colour alone).
 */
const StatusChip = ({ status, tone, label }) => {
  const key = String(tone || status || "neutral").toLowerCase();
  const toneClass = TONE_MAP[key] || "tone-neutral";
  const text = label || status || "—";

  return (
    <span className={`arambh-status-chip ${toneClass}`}>
      <span className="arambh-status-dot" aria-hidden="true" />
      <span>{text}</span>
    </span>
  );
};

StatusChip.propTypes = {
  status: PropTypes.string,
  tone: PropTypes.string,
  label: PropTypes.string,
};

export default StatusChip;
