import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Col,
  Container,
  Row,
  Table,
} from "reactstrap";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import EmptyState from "../../Components/Common/EmptyState";
import ErrorState from "../../Components/Common/ErrorState";
import KpiTile from "../../Components/Common/KpiTile";
import Skeleton from "../../Components/Common/Skeleton";
import { Can } from "../../Components/Common/Can";
import api from "../../api";

function formatPaise(paise) {
  if (paise == null || Number.isNaN(Number(paise))) return "—";
  return `₹${(Number(paise) / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

const PosDashboard = () => {
  document.title = "POS Dashboard | Arambh Sports Arena";
  const navigate = useNavigate();
  const [cafes, setCafes] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cafeRes, orderRes] = await Promise.all([
        api.get("/api/admin/pos/cafes"),
        api.get("/api/admin/pos/orders/today"),
      ]);
      setCafes(Array.isArray(cafeRes?.data?.data) ? cafeRes.data.data : []);
      setOrders(Array.isArray(orderRes?.data?.data) ? orderRes.data.data : []);
    } catch (err) {
      setError({
        message: err?.response?.data?.message || err?.message || "Failed to load POS dashboard",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => {
    const totalPaise = orders.reduce((s, o) => s + (Number(o.totalPaise) || 0), 0);
    const byMethod = { cash: 0, upi: 0, card: 0, other: 0 };
    const byCafe = {};
    for (const o of orders) {
      const m = o.paymentMethod || "other";
      byMethod[m] = (byMethod[m] || 0) + (Number(o.totalPaise) || 0);
      const key = o.cafeName || o.cafeCode || "—";
      byCafe[key] = (byCafe[key] || 0) + (Number(o.totalPaise) || 0);
    }
    const activeCafes = cafes.filter((c) => c.isActive !== false && c.isAcceptingOrders !== false);
    return {
      orderCount: orders.length,
      totalPaise,
      byMethod,
      byCafe,
      activeCafes: activeCafes.length,
      cafeCount: cafes.length,
    };
  }, [orders, cafes]);

  const recent = orders.slice(0, 8);

  return (
    <Can perm="pos.create">
      <div className="page-content">
        <Container fluid>
          <BreadCrumb title="POS Dashboard" pageTitle="POS" />
          <div className="d-flex flex-wrap gap-2 mb-3">
            <Button color="success" tag={Link} to="/pos">
              Open POS terminal
            </Button>
            <Button color="light" tag={Link} to="/pos/orders">
              Today&apos;s orders
            </Button>
            <Button color="light" tag={Link} to="/pos/cafes">
              Café master
            </Button>
            <Button color="light" tag={Link} to="/pos/items">
              Menu items
            </Button>
          </div>

          {loading ? (
            <Skeleton rows={6} />
          ) : error ? (
            <ErrorState message={error.message} onRetry={load} />
          ) : (
            <>
              <Row className="g-3 mb-3">
                <Col md={3} sm={6}>
                  <KpiTile
                    title="Today sales"
                    value={formatPaise(stats.totalPaise)}
                    icon="ri-money-rupee-circle-line"
                    onClick={() => navigate("/pos/orders")}
                  />
                </Col>
                <Col md={3} sm={6}>
                  <KpiTile
                    title="Orders today"
                    value={String(stats.orderCount)}
                    icon="ri-receipt-line"
                    onClick={() => navigate("/pos/orders")}
                  />
                </Col>
                <Col md={3} sm={6}>
                  <KpiTile
                    title="Active cafés"
                    value={`${stats.activeCafes}/${stats.cafeCount}`}
                    icon="ri-store-3-line"
                    onClick={() => navigate("/pos/cafes")}
                  />
                </Col>
                <Col md={3} sm={6}>
                  <KpiTile
                    title="Cash / UPI / Card"
                    value={`${formatPaise(stats.byMethod.cash)} · ${formatPaise(stats.byMethod.upi)} · ${formatPaise(stats.byMethod.card)}`}
                    icon="ri-bank-card-line"
                  />
                </Col>
              </Row>

              <Row className="g-3">
                <Col lg={5}>
                  <Card>
                    <CardHeader className="d-flex justify-content-between align-items-center">
                      <h5 className="mb-0">Cafés</h5>
                      <Button tag={Link} to="/pos/cafes" color="light" size="sm">
                        Manage
                      </Button>
                    </CardHeader>
                    <CardBody>
                      {!cafes.length ? (
                        <EmptyState
                          title="No cafés"
                          description="Create a café, then put items on its menu."
                          actionLabel="Café master"
                          onAction={() => navigate("/pos/cafes")}
                        />
                      ) : (
                        <Table className="align-middle table-nowrap mb-0" size="sm">
                          <thead className="table-light">
                            <tr>
                              <th>Name</th>
                              <th>Status</th>
                              <th className="text-end">Today</th>
                            </tr>
                          </thead>
                          <tbody>
                            {cafes.map((c) => (
                              <tr key={c._id}>
                                <td>
                                  <div className="fw-semibold">{c.name}</div>
                                  <div className="small text-muted">{c.code}</div>
                                </td>
                                <td>
                                  {c.isAcceptingOrders === false ? (
                                    <Badge color="secondary">Paused</Badge>
                                  ) : c.isActive === false ? (
                                    <Badge color="danger">Off</Badge>
                                  ) : (
                                    <Badge color="success">Open</Badge>
                                  )}
                                </td>
                                <td className="text-end">
                                  {formatPaise(stats.byCafe[c.name] || 0)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      )}
                    </CardBody>
                  </Card>
                </Col>
                <Col lg={7}>
                  <Card>
                    <CardHeader className="d-flex justify-content-between align-items-center">
                      <h5 className="mb-0">Recent orders</h5>
                      <Button tag={Link} to="/pos/orders" color="light" size="sm">
                        View all
                      </Button>
                    </CardHeader>
                    <CardBody>
                      {!recent.length ? (
                        <EmptyState
                          title="No sales yet today"
                          description="Open the POS terminal to take an order."
                          actionLabel="Open POS"
                          onAction={() => navigate("/pos")}
                        />
                      ) : (
                        <Table className="align-middle table-nowrap mb-0" size="sm">
                          <thead className="table-light">
                            <tr>
                              <th>Order</th>
                              <th>Café</th>
                              <th>Type</th>
                              <th>Pay</th>
                              <th className="text-end">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {recent.map((o) => (
                              <tr key={o._id}>
                                <td>
                                  <Badge color="success">{o.number}</Badge>
                                  {o.guestLabel ? (
                                    <div className="small text-muted">{o.guestLabel}</div>
                                  ) : null}
                                </td>
                                <td>{o.cafeName || o.cafeCode}</td>
                                <td>{o.orderType || "counter"}</td>
                                <td>{o.paymentMethod}</td>
                                <td className="text-end fw-semibold">
                                  {formatPaise(o.totalPaise)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      )}
                    </CardBody>
                  </Card>
                </Col>
              </Row>
            </>
          )}
        </Container>
      </div>
    </Can>
  );
};

export default PosDashboard;
