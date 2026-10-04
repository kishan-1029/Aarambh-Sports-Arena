import React, { useCallback, useEffect, useState } from "react";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import { Link } from "react-router-dom";
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
import { listShopOrders } from "../../../api/arambhEcommerce.api";
import {
  FULFILMENT_LABEL,
  ORDER_STATUS_LABEL,
  ORDER_STATUS_TONE,
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUS_LABEL,
  PAYMENT_STATUS_TONE,
} from "./shopLabels";
import { apiErrorMessage } from "../../../utils/apiErrorMessage";

const Orders = () => {
  document.title = "Shop orders | Arambh Sports Arena";
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query);
  const [orderStatus, setOrderStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [fulfillmentType, setFulfillmentType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listShopOrders({
        pageSize: 100,
        q: debouncedQuery || undefined,
        orderStatus: orderStatus || undefined,
        paymentStatus: paymentStatus || undefined,
        fulfillmentType: fulfillmentType || undefined,
        from: from || undefined,
        to: to || undefined,
      });
      setRows(Array.isArray(res?.data?.data) ? res.data.data : []);
    } catch (err) {
      setError({
        message: apiErrorMessage(err, "Failed to load orders"),
        requestId: err?.response?.data?.requestId,
      });
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, orderStatus, paymentStatus, fulfillmentType, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Can
      anyOf={["order.view"]}
      fallback={
        <div className="page-content">
          <Container fluid>
            <EmptyState
              icon="ri-lock-line"
              title="No access"
              description="You need order.view permission."
            />
          </Container>
        </div>
      }
    >
      <div className="page-content">
        <Container fluid>
          <BreadCrumb title="Orders" pageTitle="E-commerce" />
          <Row>
            <Col>
              <Card>
                <CardHeader>
                  <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center">
                    <h5 className="mb-0">Online orders ({rows.length})</h5>
                    <div className="d-flex flex-wrap gap-2">
                      <Input
                        type="select"
                        style={{ maxWidth: 170 }}
                        value={orderStatus}
                        onChange={(e) => setOrderStatus(e.target.value)}
                      >
                        <option value="">All statuses</option>
                        {Object.entries(ORDER_STATUS_LABEL).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </Input>
                      <Input
                        type="select"
                        style={{ maxWidth: 150 }}
                        value={paymentStatus}
                        onChange={(e) => setPaymentStatus(e.target.value)}
                      >
                        <option value="">All payments</option>
                        {Object.entries(PAYMENT_STATUS_LABEL).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </Input>
                      <Input
                        type="select"
                        style={{ maxWidth: 150 }}
                        value={fulfillmentType}
                        onChange={(e) => setFulfillmentType(e.target.value)}
                      >
                        <option value="">Pickup & delivery</option>
                        <option value="pickup">Club pickup</option>
                        <option value="delivery">Delivery</option>
                      </Input>
                      <Input
                        style={{ maxWidth: 240 }}
                        placeholder="Order no, name, mobile, email…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="d-flex flex-wrap gap-2 mt-2 align-items-center">
                    <span className="text-muted small">Date range</span>
                    <Input
                      type="date"
                      style={{ maxWidth: 160 }}
                      value={from}
                      onChange={(e) => setFrom(e.target.value)}
                    />
                    <span className="text-muted">→</span>
                    <Input
                      type="date"
                      style={{ maxWidth: 160 }}
                      value={to}
                      onChange={(e) => setTo(e.target.value)}
                    />
                    {(from || to) && (
                      <Button
                        size="sm"
                        color="light"
                        onClick={() => {
                          setFrom("");
                          setTo("");
                        }}
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardBody>
                  {error && (
                    <ErrorState message={error.message} requestId={error.requestId} onRetry={load} />
                  )}
                  {loading ? (
                    <Skeleton rows={6} />
                  ) : rows.length === 0 && !error ? (
                    <EmptyState
                      icon="ri-shopping-cart-2-line"
                      title="No orders match"
                      description="Try a wider date range, or clear the filters."
                    />
                  ) : (
                    <div className="table-responsive">
                      <Table className="align-middle table-nowrap mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>Order number</th>
                            <th>Customer</th>
                            <th className="text-center">Items</th>
                            <th className="text-end">Total</th>
                            <th>Payment</th>
                            <th>Fulfilment</th>
                            <th>Order status</th>
                            <th>Created</th>
                            <th className="text-end">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((o) => (
                            <tr key={o._id}>
                              <td>
                                <Link to={`/ecommerce/orders/${o._id}`} className="fw-medium">
                                  {o.orderNumber}
                                </Link>
                              </td>
                              <td>
                                <div>{o.customerName}</div>
                                <div className="text-muted small">
                                  {o.customerPhone || o.customerEmail || "—"}
                                  {o.membershipTierKey && o.membershipTierKey !== "none"
                                    ? ` · ${o.membershipTierKey.toUpperCase()}`
                                    : ""}
                                </div>
                              </td>
                              <td className="text-center">{o.itemCount}</td>
                              <td className="text-end">
                                <Money paise={o.grandTotalPaise} />
                              </td>
                              <td>
                                <StatusChip
                                  tone={PAYMENT_STATUS_TONE[o.paymentStatus]}
                                  label={PAYMENT_STATUS_LABEL[o.paymentStatus]}
                                />
                                <div className="text-muted small">
                                  {PAYMENT_METHOD_LABEL[o.paymentMethod] || o.paymentMethod}
                                </div>
                              </td>
                              <td>{FULFILMENT_LABEL[o.fulfillmentType]}</td>
                              <td>
                                <StatusChip
                                  tone={ORDER_STATUS_TONE[o.orderStatus]}
                                  label={ORDER_STATUS_LABEL[o.orderStatus]}
                                />
                              </td>
                              <td className="text-muted small">
                                {new Date(o.createdAt).toLocaleString("en-IN", {
                                  dateStyle: "medium",
                                  timeStyle: "short",
                                })}
                              </td>
                              <td className="text-end">
                                <Button
                                  size="sm"
                                  color="soft-primary"
                                  tag={Link}
                                  to={`/ecommerce/orders/${o._id}`}
                                >
                                  Open
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  )}
                </CardBody>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>
    </Can>
  );
};

export default Orders;
