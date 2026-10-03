import React from "react";
import PropTypes from "prop-types";
import { Button } from "reactstrap";

/**
 * Consistent error surface with retry and optional requestId.
 */
const ErrorState = ({
  title = "Something went wrong",
  message = "We could not load this data. Please try again.",
  requestId,
  onRetry,
  className = "",
}) => (
  <div className={`text-center py-5 px-3 ${className}`}>
    <i
      className="ri-error-warning-line mb-3"
      style={{ fontSize: "2.75rem", color: "var(--arambh-danger)" }}
      aria-hidden="true"
    />
    <h5 className="mb-2">{title}</h5>
    <p className="text-muted mb-2 mx-auto" style={{ maxWidth: 420 }}>
      {message}
    </p>
    {requestId ? (
      <p className="small text-muted mb-3">
        Request ID: <code>{requestId}</code>
      </p>
    ) : null}
    {onRetry ? (
      <Button color="primary" outline onClick={onRetry}>
        Retry
      </Button>
    ) : null}
  </div>
);

ErrorState.propTypes = {
  title: PropTypes.string,
  message: PropTypes.string,
  requestId: PropTypes.string,
  onRetry: PropTypes.func,
  className: PropTypes.string,
};

export default ErrorState;
