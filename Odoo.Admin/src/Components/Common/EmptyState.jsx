import React from "react";
import PropTypes from "prop-types";
import { Button } from "reactstrap";

/**
 * Friendly empty list / page state with optional primary action.
 */
const EmptyState = ({
  title = "Nothing here yet",
  description = "When records appear, they will show up in this list.",
  icon = "ri-inbox-line",
  actionLabel,
  onAction,
  className = "",
}) => (
  <div className={`text-center py-5 px-3 ${className}`}>
    <i
      className={`${icon} mb-3`}
      style={{ fontSize: "2.75rem", color: "var(--arambh-brand)" }}
      aria-hidden="true"
    />
    <h5 className="mb-2">{title}</h5>
    {description ? (
      <p className="text-muted mb-3 mx-auto" style={{ maxWidth: 360 }}>
        {description}
      </p>
    ) : null}
    {actionLabel && onAction ? (
      <Button color="primary" onClick={onAction}>
        {actionLabel}
      </Button>
    ) : null}
  </div>
);

EmptyState.propTypes = {
  title: PropTypes.string,
  description: PropTypes.string,
  icon: PropTypes.string,
  actionLabel: PropTypes.string,
  onAction: PropTypes.func,
  className: PropTypes.string,
};

export default EmptyState;
