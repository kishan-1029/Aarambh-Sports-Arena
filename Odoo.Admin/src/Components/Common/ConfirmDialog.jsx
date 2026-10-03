import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { Modal, ModalBody, ModalFooter, ModalHeader, Input, Label } from "reactstrap";

/**
 * Confirm dialog wrapping DeleteModal patterns.
 * Destructive + requireReason: user must type a reason (audited actions).
 */
const ConfirmDialog = ({
  show,
  title = "Confirm",
  message = "Are you sure you want to continue?",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  requireReason = false,
  reasonLabel = "Reason (required)",
  loading = false,
  onConfirm,
  onCancel,
}) => {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!show) setReason("");
  }, [show]);

  const canConfirm = !requireReason || reason.trim().length > 0;

  return (
    <Modal fade isOpen={show} toggle={loading ? undefined : onCancel} centered>
      <ModalHeader className="bg-light p-3" toggle={loading ? undefined : onCancel}>
        {title}
      </ModalHeader>
      <ModalBody className="py-3 px-4">
        <p className="mb-0 text-muted">{message}</p>
        {requireReason ? (
          <div className="mt-3">
            <Label for="arambh-confirm-reason">{reasonLabel}</Label>
            <Input
              id="arambh-confirm-reason"
              type="textarea"
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={loading}
              placeholder="Enter reason for the audit log"
            />
          </div>
        ) : null}
      </ModalBody>
      <ModalFooter>
        <div className="hstack gap-2 justify-content-end">
          <button
            type="button"
            className={`btn ${destructive ? "btn-danger" : "btn-primary"}`}
            disabled={loading || !canConfirm}
            onClick={() => onConfirm?.(requireReason ? reason.trim() : undefined)}
          >
            {loading ? (
              <>
                <output className="spinner-border spinner-border-sm me-1" aria-hidden="true" />
                Working…
              </>
            ) : (
              confirmLabel
            )}
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </button>
        </div>
      </ModalFooter>
    </Modal>
  );
};

ConfirmDialog.propTypes = {
  show: PropTypes.bool,
  title: PropTypes.string,
  message: PropTypes.string,
  confirmLabel: PropTypes.string,
  cancelLabel: PropTypes.string,
  destructive: PropTypes.bool,
  requireReason: PropTypes.bool,
  reasonLabel: PropTypes.string,
  loading: PropTypes.bool,
  onConfirm: PropTypes.func,
  onCancel: PropTypes.func,
};

export default ConfirmDialog;
