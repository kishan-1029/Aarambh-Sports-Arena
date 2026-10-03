import React from "react";
import PropTypes from "prop-types";

/**
 * Lightweight skeleton placeholders. Prefer over full-page spinners after first load.
 * For full-page boot, reuse LoadingScreen.
 */
const Skeleton = ({ rows = 4, height = 14, className = "" }) => (
  <div className={`arambh-skeleton ${className}`} aria-busy="true" aria-live="polite">
    {Array.from({ length: rows }).map((_, i) => (
      <div
        key={i}
        className="mb-2 rounded"
        style={{
          height,
          width: i === rows - 1 ? "70%" : "100%",
          background:
            "linear-gradient(90deg, var(--arambh-surface-2) 25%, var(--arambh-border) 50%, var(--arambh-surface-2) 75%)",
          backgroundSize: "200% 100%",
          animation: "arambh-skeleton-pulse 1.2s ease-in-out infinite",
        }}
      />
    ))}
    <style>{`
      @keyframes arambh-skeleton-pulse {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
    `}</style>
  </div>
);

Skeleton.propTypes = {
  rows: PropTypes.number,
  height: PropTypes.number,
  className: PropTypes.string,
};

export default Skeleton;
