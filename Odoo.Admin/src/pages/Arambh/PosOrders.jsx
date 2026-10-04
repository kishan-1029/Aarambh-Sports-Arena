import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Col,
  Container,
  Input,
  Label,
  Row,
  Table,
} from "reactstrap";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import EmptyState from "../../Components/Common/EmptyState";
import ErrorState from "../../Components/Common/ErrorState";
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

function formatTime(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

const PosOrders = () => {
  document.title = "POS Orders | Arambh Sports Arena";
  const [cafes, setCafes] = useState([]);
  const [cafeId, setCafeId] = useState("");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadCafes = useCallback(async () => {
    try {
      const res = await api.get("/api/admin/pos/cafes");
      setCafes(Array.isArray(res?.data?.data) ? res.data.data : []);
    } catch {
      /* non-blocking */
    }
  }, []);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/api/admin/pos/orders/today", {
        params: cafeId ? { cafeId } : {},
      });
      setOrders(Array.isArray(res?.data?.data) ? res.data.data : []);
    } catch (err) {
      setError({
        message: err?.response?.data?.message || err?.message || "Failed to load orders",
      });
    } finally {
      setLoading(false);
    }
  }, [cafeId]);

  useEffect(() => {
    loadCafes();
  }, [loadCafes]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const totalPaise = useMemo(
    () => orders.reduce((s, o) => s + (Number(o.totalPaise) || 0), 0),
    [orders],
  );

  return (
    <Can perm="pos.create">
      <div className="page-content">
        <Container fluid>
          <BreadCrumb title="Today's orders" pageTitle="POS" />
          <Row className="mb-3 g-2 align-items-end">
            <Col md={4}>
              <Label>Café</Label>
              <Input
                type="select"
                value={cafeId}
                onChange={(e) => setCafeId(e.target.value)}
              >
                <option value="">All cafés</option>
                {cafes.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </Input>
            </Col>
            <Col md={8} className="d-flex gap-2 justify-content-md-end flex-wrap">
              <Button color="light" size="sm" tag={Link} to="/pos/dashboard">
                Dashboard
              </Button>
              <Button color="success" size="sm" tag={Link} to="/pos">
                Open POS
              </Button>
            </Col>
          </Row>

          <Card>
            <CardHeader className="d-flex justify-content-between align-items-center flex-wrap gap-2">
              <div>
                <h5 className="mb-0">Paid orders today</h5>
                <small className="text-muted">
                  {orders.length} orders · {formatPaise(totalPaise)}
                </small>
              </div>
              <Button color="light" size="sm" onClick={loadOrders}>
                Refresh
              </Button>
            </CardHeader>
            <CardBody>
              {loading ? (
                <Skeleton rows={8} />
              ) : error ? (
                <ErrorState message={error.message} onRetry={loadOrders} />
              ) : !orders.length ? (
                <EmptyState
                  title="No orders yet"
                  description="Sales from the POS terminal appear here for today."
                />
              ) : (
                <div className="table-responsive">
                  <Table className="align-middle table-nowrap mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Time</th>
                        <th>Order</th>
                        <th>Café</th>
                        <th>Guest</th>
                        <th>Type</th>
                        <th>Items</th>
                        <th>Pay</th>
                        <th className="text-end">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((o) => (
                        <tr key={o._id}>
                          <td>{formatTime(o.createdAt)}</td>
                          <td>
                            <Badge color="success">{o.number}</Badge>
                            {o.note ? (
                              <div className="small text-muted text-truncate" style={{ maxWidth: 160 }}>
                                {o.note}
                              </div>
                            ) : null}
                          </td>
                          <td>{o.cafeName || o.cafeCode}</td>
                          <td>{o.guestLabel || "—"}</td>
                          <td>{o.orderType || "counter"}</td>
                          <td>
                            {(o.lines || [])
                              .map((l) => `${l.name}×${l.qty}`)
                              .join(", ")
                              .slice(0, 80) || "—"}
                          </td>
                          <td>{o.paymentMethod}</td>
                          <td className="text-end fw-semibold">
                            {formatPaise(o.totalPaise)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </CardBody>
          </Card>
        </Container>
      </div>
    </Can>
  );
};

export default PosOrders;
