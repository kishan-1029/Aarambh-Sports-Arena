import React, { useId } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { UncontrolledTooltip } from "reactstrap";

const PRESETS = {
  edit: { icon: "ri-edit-2-line", tone: "success" },
  delete: { icon: "ri-delete-bin-6-line", tone: "danger" },
  remove: { icon: "ri-delete-bin-6-line", tone: "danger" },
  preview: { icon: "ri-eye-line", tone: "info" },
  view: { icon: "ri-eye-line", tone: "info" },
  open: { icon: "ri-arrow-right-up-line", tone: "primary" },
  archive: { icon: "ri-archive-line", tone: "danger" },
  publish: { icon: "ri-send-plane-2-line", tone: "primary" },
  unlock: { icon: "ri-lock-unlock-line", tone: "success" },
  reset: { icon: "ri-restart-line", tone: "warning" },
  block: { icon: "ri-forbid-line", tone: "danger" },
  unblock: { icon: "ri-shield-check-line", tone: "success" },
  "check-in": { icon: "ri-login-circle-line", tone: "success" },
  cancel: { icon: "ri-close-circle-line", tone: "danger" },
  revoke: { icon: "ri-indeterminate-circle-line", tone: "danger" },
  maintenance: { icon: "ri-tools-line", tone: "warning" },
  activate: { icon: "ri-checkbox-circle-line", tone: "success" },
};

const presetFor = (label) => {
  const key = String(label || "").trim().toLowerCase();
  return PRESETS[key] || { icon: "ri-more-2-line", tone: "secondary" };
};

/**
 * Icon-only control for a grid row. The visible name lives on the tooltip
 * and aria-label so page-level buttons stay labelled.
 */
const GridActionButton = ({
  label,
  icon,
  tone,
  onClick,
  href,
  to,
  disabled = false,
  target,
  rel,
}) => {
  const tipId = `grid-act-${useId().replace(/:/g, "")}`;
  const preset = presetFor(label);
  const iconClass = icon || preset.icon;
  const toneClass = tone || preset.tone;
  const className = `btn btn-sm btn-icon btn-soft-${toneClass} grid-action-btn`;
  const iconEl = <i className={iconClass} aria-hidden="true" />;

  let control;
  if (to) {
    control = (
      <Link
        to={disabled ? "#" : to}
        className={`${className}${disabled ? " disabled" : ""}`}
        aria-label={label}
        aria-disabled={disabled || undefined}
        tabIndex={disabled ? -1 : undefined}
        style={disabled ? { pointerEvents: "none" } : undefined}
        onClick={(event) => {
          if (disabled) {
            event.preventDefault();
            return;
          }
          onClick?.(event);
        }}
      >
        {iconEl}
      </Link>
    );
  } else if (href) {
    control = (
      <a
        href={disabled ? undefined : href}
        className={`${className}${disabled ? " disabled" : ""}`}
        aria-label={label}
        target={target}
        rel={rel}
        style={disabled ? { pointerEvents: "none" } : undefined}
        onClick={(event) => {
          if (disabled) {
            event.preventDefault();
            return;
          }
          onClick?.(event);
        }}
      >
        {iconEl}
      </a>
    );
  } else {
    control = (
      <button
        type="button"
        className={className}
        aria-label={label}
        disabled={disabled}
        style={disabled ? { pointerEvents: "none" } : undefined}
        onClick={onClick}
      >
        {iconEl}
      </button>
    );
  }

  return (
    <span className="grid-action-wrap" id={tipId}>
      {control}
      <UncontrolledTooltip placement="top" target={tipId} container="body" fade={false}>
        {label}
      </UncontrolledTooltip>
    </span>
  );
};

GridActionButton.propTypes = {
  label: PropTypes.string.isRequired,
  icon: PropTypes.string,
  tone: PropTypes.string,
  onClick: PropTypes.func,
  href: PropTypes.string,
  to: PropTypes.string,
  disabled: PropTypes.bool,
  target: PropTypes.string,
  rel: PropTypes.string,
};

export default GridActionButton;
