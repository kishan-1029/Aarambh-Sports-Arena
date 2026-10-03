import React from "react";
import PropTypes from "prop-types";
import { Card, CardBody } from "reactstrap";

/**
 * Dashboard KPI tile — muted title, large tabular value, optional delta.
 */
const KpiTile = ({ title, value, delta, deltaTone = "neutral", icon, onClick }) => {
  const deltaClass =
    deltaTone === "up"
      ? "text-success"
      : deltaTone === "down"
        ? "text-danger"
        : "text-muted";

  return (
    <Card
      className="h-100 border-0 shadow-sm"
      style={{
        borderRadius: "var(--arambh-radius)",
        cursor: onClick ? "pointer" : "default",
        background: "var(--arambh-surface)",
      }}
      onClick={onClick}
      role={onClick ? "button" : undefined}
    >
      <CardBody>
        <div className="d-flex justify-content-between align-items-start mb-2">
          <span className="text-muted small text-uppercase" style={{ letterSpacing: "0.04em" }}>
            {title}
          </span>
          {icon ? <i className={`${icon} fs-4`} style={{ color: "var(--arambh-brand)" }} /> : null}
        </div>
        <div className="arambh-kpi-value">{value}</div>
        {delta != null && delta !== "" ? (
          <div className={`small mt-2 ${deltaClass}`}>{delta}</div>
        ) : null}
      </CardBody>
    </Card>
  );
};

KpiTile.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.node]).isRequired,
  delta: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
  deltaTone: PropTypes.oneOf(["up", "down", "neutral"]),
  icon: PropTypes.string,
  onClick: PropTypes.func,
};

export default KpiTile;
