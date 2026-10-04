import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button, Card, CardBody, CardHeader, Col, Container, Row, Table } from "reactstrap";
import BreadCrumb from "../../../Components/Common/BreadCrumb";
import EmptyState from "../../../Components/Common/EmptyState";
import ErrorState from "../../../Components/Common/ErrorState";
import KpiTile from "../../../Components/Common/KpiTile";
import Money from "../../../Components/Common/Money";
import Skeleton from "../../../Components/Common/Skeleton";
import StatusChip from "../../../Components/Common/StatusChip";
import { Can } from "../../../Components/Common/Can";
import { getEcommerceDashboard, listLowStock } from "../../../api/arambhEcommerce.api";
import {
  FULFILMENT_LABEL,
  ORDER_STATUS_LABEL,
  ORDER_STATUS_TONE,
  PAYMENT_STATUS_LABEL,
  PAYMENT_STATUS_TONE,
  STOCK_STATUS_LABEL,
  STOCK_STATUS_TONE,
} from "./shopLabels";
import { apiErrorMessage } from "../../../utils/apiErrorMessage";

const EcommerceDashboard = () => {
  document.title = "E-commerce | Arambh Sports Arena";
  const [stats, setStats] = useState(null);
  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dash, low] = await Promise.all([getEcommerceDashboard(), listLowStock()]);
      setStats(dash?.data?.data || null);
      setLowStock(Array.isArray(low?.data?.data) ? low.data.data : []);
    } catch (err) {
      setError({
        message: apiErrorMessage(err, "Failed to load the shop overview"),
        requestId: err?.response?.data?.requestId,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Can
      anyOf={["product.view", "order.view", "inventory.view"]}
      fallback={
        <div className="page-content">
          <Container fluid>
            <EmptyState
              icon="ri-lock-line"
              title="No access"
              description="You need product.view, order.view or inventory.view permission."
            />
          </Container>
        </div>
      }
    >
      <div className="page-content">
        <Container fluid>
          <BreadCrumb title="E-commerce" pageTitle="Pro Shop" />

          {error && <ErrorState message={error.message} requestId={error.requestId} onRetry={load} />}

          {loading ? (
            <Card>
              <CardBody>
                <Skeleton rows={6} />
              </CardBody>
            </Card>
          ) : (
            stats && (
              <>
                <Row className="g-3">
                  <Col xl={3} md={6}>
                    <KpiTile
                      title="Revenue today"
                      value={<Money paise={stats.revenueTodayPaise} />}
                      icon="ri-money-rupee-circle-line"
                      delta={`${stats.ordersToday} order(s) today`}
                    />
                  </Col>
                  <Col xl={3} md={6}>
                    <KpiTile
                      title="Pending orders"
                      value={stats.pendingOrders}
                      icon="ri-time-line"
                      delta="Awaiting pick & pack"
                    />
                  </Col>
                  <Col xl={3} md={6}>
                    <KpiTile
                      title="Active products"
                      value={`${stats.activeProducts} / ${stats.totalProducts}`}
                      icon="ri-shopping-bag-3-line"
                      delta={`${stats.categories} categories`}
                    />
                  </Col>
                  <Col xl={3} md={6}>
                    <KpiTile
                      title="Needs restocking"
                      value={stats.lowStockProducts + stats.outOfStockProducts}
                      icon="ri-alert-line"
                      deltaTone={stats.outOfStockProducts > 0 ? "down" : "neutral"}
                      delta={`${stats.outOfStockProducts} out of stock · ${stats.lowStockProducts} low`}
                    />
                  </Col>
                </Row>

                <Row className="mt-1">
                  <Col xl={8}>
                    <Card>
                      <CardHeader className="d-flex justify-content-between align-items-center">
                        <h5 className="mb-0">Recent orders</h5>
                        <Button size="sm" color="light" tag={Link} to="/ecommerce/orders">
                          All orders
                        </Button>
                      </CardHeader>
                      <CardBody>
                        {stats.recentOrders.length === 0 ? (
                          <EmptyState
                            icon="ri-shopping-cart-2-line"
                            title="No orders yet"
                            description="Orders placed on the website will appear here."
                          />
                        ) : (
                          <div className="table-responsive">
                            <Table className="align-middle table-nowrap mb-0">
                              <thead className="table-light">
                                <tr>
                                  <th>Order</th>
                                  <th>Customer</th>
                                  <th className="text-center">Items</th>
                                  <th className="text-end">Amount</th>
                                  <th>Payment</th>
                                  <th>Fulfilment</th>
                                  <th>Status</th>
                                  <th>Date</th>
                                  <th />
                                </tr>
                              </thead>
                              <tbody>
                                {stats.recentOrders.map((o) => (
                                  <tr key={o.id}>
                                    <td>
                                      <Link to={`/ecommerce/orders/${o.id}`} className="fw-medium">
                                        {o.orderNumber}
                                      </Link>
                                    </td>
                                    <td>{o.customerName}</td>
                                    <td className="text-center">{o.itemCount}</td>
                                    <td className="text-end">
                                      <Money paise={o.grandTotalPaise} />
                                    </td>
                                    <td>
                                      <StatusChip
                                        tone={PAYMENT_STATUS_TONE[o.paymentStatus]}
                                        label={PAYMENT_STATUS_LABEL[o.paymentStatus]}
                                      />
                                    </td>
                                    <td>{FULFILMENT_LABEL[o.fulfillmentType]}</td>
                                    <td>
                                      <StatusChip
                                        tone={ORDER_STATUS_TONE[o.orderStatus]}
                                        label={ORDER_STATUS_LABEL[o.orderStatus]}
                                      />
                                    </td>
                                    <td>{new Date(o.createdAt).toLocaleDateString("en-IN")}</td>
                                    <td>
                                      <Button
                                        size="sm"
                                        color="soft-primary"
                                        tag={Link}
                                        to={`/ecommerce/orders/${o.id}`}
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

                  <Col xl={4}>
                    <Card>
                      <CardHeader className="d-flex justify-content-between align-items-center">
                        <h5 className="mb-0">Low & out of stock</h5>
                        <Button size="sm" color="light" tag={Link} to="/ecommerce/inventory">
                          Inventory
                        </Button>
                      </CardHeader>
                      <CardBody>
                        {lowStock.length === 0 ? (
                          <EmptyState
                            icon="ri-checkbox-circle-line"
                            title="Every shelf is stocked"
                            description="Nothing has fallen below its threshold."
                          />
                        ) : (
                          <div className="table-responsive">
                            <Table className="align-middle mb-0" size="sm">
                              <tbody>
                                {lowStock.slice(0, 12).map((row) => (
                                  <tr key={`${row.productId}-${row.variantId || "base"}`}>
                                    <td>
                                      <div className="fw-medium">{row.productName}</div>
                                      <div className="text-muted small">
                                        {row.variantName || row.sku}
                                      </div>
                                    </td>
                                    <td className="text-end">
                                      <div className="fw-semibold">{row.stockQuantity}</div>
                                      <StatusChip
                                        tone={STOCK_STATUS_TONE[row.stockStatus]}
                                        label={STOCK_STATUS_LABEL[row.stockStatus]}
                                      />
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
              </>
            )
          )}
        </Container>
      </div>
    </Can>
  );
};

export default EcommerceDashboard;
