import React, { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Col,
  Container,
  Input,
  Row,
  Table,
} from "reactstrap";
import BreadCrumb from "../../../Components/Common/BreadCrumb";
import EmptyState from "../../../Components/Common/EmptyState";
import ErrorState from "../../../Components/Common/ErrorState";
import Money from "../../../Components/Common/Money";
import Skeleton from "../../../Components/Common/Skeleton";
import StatusChip from "../../../Components/Common/StatusChip";
import { Can } from "../../../Components/Common/Can";
import config from "../../../config";
import {
  cancelShopOrder,
  getShopOrder,
  setOrderNote,
  updateOrderPayment,
  updateOrderStatus,
} from "../../../api/arambhEcommerce.api";
import {
  FULFILMENT_LABEL,
  ORDER_STATUS_LABEL,
  ORDER_STATUS_TONE,
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUS_LABEL,
  PAYMENT_STATUS_TONE,
} from "./shopLabels";
import { apiErrorMessage } from "../../../utils/apiErrorMessage";

function imageSrc(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  const base = config.api.API_URL || "";
  return `${base}/${String(url).replace(/^\/+/, "")}`;
}

function addressLines(a) {
  if (!a) return [];
  return [
    a.fullName,
    a.phone,
    a.line1,
    a.line2,
    [a.area, a.city].filter(Boolean).join(", "),
    [a.state, a.postalCode].filter(Boolean).join(" "),
    a.landmark ? `Landmark: ${a.landmark}` : "",
  ].filter(Boolean);
}

const OrderDetail = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [note, setNote] = useState("");

  document.title = `${order?.orderNumber || "Order"} | Arambh Sports Arena`;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getShopOrder(id);
      const data = res?.data?.data;
      setOrder(data || null);
      setNote(data?.adminNote || "");
    } catch (err) {
      setError({
        message: apiErrorMessage(err, "Failed to load the order"),
        requestId: err?.response?.data?.requestId,
      });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (fn, confirmText) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    setActionError("");
    try {
      await fn();
      await load();
    } catch (err) {
      setActionError(apiErrorMessage(err, "That action did not go through"));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="page-content">
        <Container fluid>
          <BreadCrumb title="Order" pageTitle="E-commerce" />
          <Card>
            <CardBody>
              <Skeleton rows={8} />
            </CardBody>
          </Card>
        </Container>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="page-content">
        <Container fluid>
          <BreadCrumb title="Order" pageTitle="E-commerce" />
          <Card>
            <CardBody>
              <ErrorState
                message={error?.message || "Order not found"}
                requestId={error?.requestId}
                onRetry={load}
              />
            </CardBody>
          </Card>
        </Container>
      </div>
    );
  }

  const nextStatuses = order.allowedNextStatuses || [];
  const canCancel = nextStatuses.includes("cancelled");
  const forwardStatuses = nextStatuses.filter((s) => s !== "cancelled");

  return (
    <Can
      anyOf={["order.view"]}
      fallback={
        <div className="page-content">
          <Container fluid>
            <EmptyState icon="ri-lock-line" title="No access" description="You need order.view permission." />
          </Container>
        </div>
      }
    >
      <div className="page-content">
        <Container fluid>
          <BreadCrumb title={order.orderNumber} pageTitle="E-commerce" />

          {actionError && <div className="alert alert-danger">{actionError}</div>}

          <Row>
            <Col xl={8}>
              <Card>
                <CardHeader className="d-flex flex-wrap gap-2 justify-content-between align-items-center">
                  <div>
                    <h5 className="mb-1">{order.orderNumber}</h5>
                    <span className="text-muted small">
                      Placed{" "}
                      {new Date(order.createdAt).toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                  </div>
                  <div className="d-flex gap-2 align-items-center">
                    <StatusChip
                      tone={ORDER_STATUS_TONE[order.orderStatus]}
                      label={ORDER_STATUS_LABEL[order.orderStatus]}
                    />
                    <StatusChip
                      tone={PAYMENT_STATUS_TONE[order.paymentStatus]}
                      label={PAYMENT_STATUS_LABEL[order.paymentStatus]}
                    />
                  </div>
                </CardHeader>
                <CardBody>
                  <div className="table-responsive">
                    <Table className="align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th colSpan={2}>Item</th>
                          <th className="text-center">Qty</th>
                          <th className="text-end">Unit</th>
                          <th className="text-end">Discount</th>
                          <th className="text-end">Tax</th>
                          <th className="text-end">Line total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {order.items.map((item, index) => (
                          <tr key={`${item.productId}-${item.variantId || index}`}>
                            <td style={{ width: 56 }}>
                              {item.image ? (
                                <img
                                  src={imageSrc(item.image)}
                                  alt={item.name}
                                  width={40}
                                  height={40}
                                  className="rounded"
                                  style={{ objectFit: "cover" }}
                                />
                              ) : (
                                <div
                                  className="rounded bg-light d-flex align-items-center justify-content-center text-muted"
                                  style={{ width: 40, height: 40 }}
                                >
                                  <i className="ri-image-line" />
                                </div>
                              )}
                            </td>
                            <td>
                              <div className="fw-medium">{item.name}</div>
                              <div className="text-muted small">
                                {[item.variantName, item.sku].filter(Boolean).join(" · ")}
                              </div>
                            </td>
                            <td className="text-center">{item.quantity}</td>
                            <td className="text-end">
                              <Money paise={item.unitPricePaise} />
                            </td>
                            <td className="text-end">
                              {item.discountPaise ? (
                                <span className="text-success">
                                  −<Money paise={item.discountPaise} />
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="text-end text-muted">
                              <Money paise={item.taxPaise} />
                            </td>
                            <td className="text-end fw-semibold">
                              <Money paise={item.lineTotalPaise} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>

                  <Row className="mt-3 justify-content-end">
                    <Col md={6}>
                      <Table borderless size="sm" className="mb-0">
                        <tbody>
                          <tr>
                            <td className="text-muted">Subtotal</td>
                            <td className="text-end">
                              <Money paise={order.subtotalPaise} />
                            </td>
                          </tr>
                          {order.discountPaise > 0 && (
                            <tr className="text-success">
                              <td>
                                Member discount
                                {order.memberDiscountPct ? ` (${order.memberDiscountPct}%)` : ""}
                              </td>
                              <td className="text-end">
                                −<Money paise={order.discountPaise} />
                              </td>
                            </tr>
                          )}
                          <tr>
                            <td className="text-muted">Tax</td>
                            <td className="text-end">
                              <Money paise={order.taxPaise} />
                            </td>
                          </tr>
                          <tr>
                            <td className="text-muted">Delivery</td>
                            <td className="text-end">
                              {order.deliveryChargePaise > 0 ? (
                                <Money paise={order.deliveryChargePaise} />
                              ) : (
                                "Free"
                              )}
                            </td>
                          </tr>
                          <tr className="border-top">
                            <td className="fw-semibold pt-2">Grand total</td>
                            <td className="text-end fw-semibold pt-2">
                              <Money paise={order.grandTotalPaise} />
                            </td>
                          </tr>
                        </tbody>
                      </Table>
                    </Col>
                  </Row>
                </CardBody>
              </Card>

              <Card>
                <CardHeader>
                  <h5 className="mb-0">Timeline</h5>
                </CardHeader>
                <CardBody>
                  <ul className="list-unstyled mb-0">
                    {order.statusHistory.map((h, index) => (
                      <li key={`${h.status}-${index}`} className="d-flex gap-3 pb-3">
                        <div className="text-muted small" style={{ minWidth: 150 }}>
                          {new Date(h.at).toLocaleString("en-IN", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </div>
                        <div>
                          <StatusChip
                            tone={ORDER_STATUS_TONE[h.status]}
                            label={ORDER_STATUS_LABEL[h.status] || h.status}
                          />
                          <div className="text-muted small mt-1">
                            {[h.byName, h.note].filter(Boolean).join(" · ") || "—"}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardBody>
              </Card>
            </Col>

            <Col xl={4}>
              <Card>
                <CardHeader>
                  <h5 className="mb-0">Move this order along</h5>
                </CardHeader>
                <CardBody>
                  {forwardStatuses.length === 0 && !canCancel ? (
                    <p className="text-muted mb-0">
                      This order is {ORDER_STATUS_LABEL[order.orderStatus].toLowerCase()} — nothing
                      left to do.
                    </p>
                  ) : (
                    <Can
                      anyOf={["order.edit", "order.cancel"]}
                      fallback={<p className="text-muted mb-0">You can view but not change orders.</p>}
                    >
                      <div className="d-flex flex-column gap-2">
                        {forwardStatuses.map((status) => (
                          <Can key={status} anyOf={["order.edit"]}>
                            <Button
                              color="success"
                              disabled={busy}
                              onClick={() =>
                                run(() => updateOrderStatus(order._id, { status }))
                              }
                            >
                              Mark {ORDER_STATUS_LABEL[status].toLowerCase()}
                            </Button>
                          </Can>
                        ))}
                        {canCancel && (
                          <Can anyOf={["order.cancel"]}>
                            <Button
                              color="soft-danger"
                              disabled={busy}
                              onClick={() => {
                                const reason = window.prompt("Reason for cancelling?");
                                if (reason === null) return;
                                run(() => cancelShopOrder(order._id, { reason }));
                              }}
                            >
                              Cancel order & restore stock
                            </Button>
                          </Can>
                        )}
                      </div>
                    </Can>
                  )}
                  {order.orderStatus === "cancelled" && (
                    <p className="text-muted small mb-0 mt-2">
                      {order.stockRestored
                        ? "Stock was returned to the shelf."
                        : "No stock was deducted for this order."}
                      {order.cancelReason ? ` Reason: ${order.cancelReason}` : ""}
                    </p>
                  )}
                </CardBody>
              </Card>

              <Card>
                <CardHeader>
                  <h5 className="mb-0">Payment</h5>
                </CardHeader>
                <CardBody>
                  <dl className="row mb-3 small">
                    <dt className="col-5 text-muted">Method</dt>
                    <dd className="col-7">
                      {PAYMENT_METHOD_LABEL[order.paymentMethod] || order.paymentMethod}
                    </dd>
                    <dt className="col-5 text-muted">Status</dt>
                    <dd className="col-7">
                      <StatusChip
                        tone={PAYMENT_STATUS_TONE[order.paymentStatus]}
                        label={PAYMENT_STATUS_LABEL[order.paymentStatus]}
                      />
                    </dd>
                    <dt className="col-5 text-muted">Paid</dt>
                    <dd className="col-7">
                      <Money paise={order.paidAmountPaise} />
                    </dd>
                    <dt className="col-5 text-muted">Reference</dt>
                    <dd className="col-7">{order.paymentReference || "—"}</dd>
                  </dl>
                  <Can anyOf={["payment.manage", "order.edit"]}>
                    <div className="d-flex flex-wrap gap-2">
                      {order.paymentStatus !== "paid" && (
                        <Button
                          size="sm"
                          color="success"
                          disabled={busy}
                          onClick={() => {
                            const reference = window.prompt("Payment reference (optional)") ?? "";
                            run(() =>
                              updateOrderPayment(order._id, { status: "paid", reference }),
                            );
                          }}
                        >
                          Mark paid
                        </Button>
                      )}
                      {order.paymentStatus === "paid" && (
                        <Button
                          size="sm"
                          color="soft-warning"
                          disabled={busy}
                          onClick={() =>
                            run(
                              () => updateOrderPayment(order._id, { status: "refunded" }),
                              "Mark this payment as refunded?",
                            )
                          }
                        >
                          Mark refunded
                        </Button>
                      )}
                    </div>
                  </Can>
                </CardBody>
              </Card>

              <Card>
                <CardHeader>
                  <h5 className="mb-0">Customer</h5>
                </CardHeader>
                <CardBody>
                  <dl className="row mb-0 small">
                    <dt className="col-5 text-muted">Name</dt>
                    <dd className="col-7">{order.customerName}</dd>
                    <dt className="col-5 text-muted">Mobile</dt>
                    <dd className="col-7">{order.customerPhone || "—"}</dd>
                    <dt className="col-5 text-muted">Email</dt>
                    <dd className="col-7">{order.customerEmail || "—"}</dd>
                    {order.member && (
                      <>
                        <dt className="col-5 text-muted">Member</dt>
                        <dd className="col-7">
                          <Link to={`/members/${order.member.memberId}`}>
                            {order.member.name || order.member.memberCode}
                          </Link>
                        </dd>
                        <dt className="col-5 text-muted">Tier</dt>
                        <dd className="col-7">
                          {(order.member.tierKey || "none").toUpperCase()}
                          {order.memberDiscountPct
                            ? ` · ${order.memberDiscountPct}% shop discount`
                            : ""}
                        </dd>
                      </>
                    )}
                  </dl>
                </CardBody>
              </Card>

              <Card>
                <CardHeader>
                  <h5 className="mb-0">{FULFILMENT_LABEL[order.fulfillmentType]}</h5>
                </CardHeader>
                <CardBody>
                  {order.fulfillmentType === "pickup" ? (
                    <p className="mb-0 small">{order.pickupLocation}</p>
                  ) : (
                    <address className="mb-0 small">
                      {addressLines(order.deliveryAddress).map((line) => (
                        <div key={line}>{line}</div>
                      ))}
                    </address>
                  )}
                  {order.customerNote && (
                    <p className="text-muted small mt-3 mb-0">
                      <strong>Customer note:</strong> {order.customerNote}
                    </p>
                  )}
                </CardBody>
              </Card>

              <Can anyOf={["order.edit"]}>
                <Card>
                  <CardHeader>
                    <h5 className="mb-0">Internal note</h5>
                  </CardHeader>
                  <CardBody>
                    <Input
                      type="textarea"
                      rows={3}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Only staff see this"
                    />
                    <Button
                      size="sm"
                      color="light"
                      className="mt-2"
                      disabled={busy || note === order.adminNote}
                      onClick={() => run(() => setOrderNote(order._id, note))}
                    >
                      Save note
                    </Button>
                  </CardBody>
                </Card>
              </Can>
            </Col>
          </Row>
        </Container>
      </div>
    </Can>
  );
};

export default OrderDetail;
