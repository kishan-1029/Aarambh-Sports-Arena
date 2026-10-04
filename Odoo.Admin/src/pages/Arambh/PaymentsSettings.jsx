import React, { useCallback, useEffect, useState } from "react";
import { Card, CardBody, CardHeader, Col, Container, Row, Table } from "reactstrap";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import EmptyState from "../../Components/Common/EmptyState";
import ErrorState from "../../Components/Common/ErrorState";
import Skeleton from "../../Components/Common/Skeleton";
import StatusChip from "../../Components/Common/StatusChip";
import Money from "../../Components/Common/Money";
import { Can } from "../../Components/Common/Can";
import { getPaymentSettings, listPayments } from "../../api/arambhFinance.api";
import { apiErrorMessage } from "../../utils/apiErrorMessage";

const PaymentsSettings = () => {
  document.title = "Payments | Arambh Sports Arena";
  const [settings, setSettings] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sRes, pRes] = await Promise.all([
        getPaymentSettings(),
        listPayments({ pageSize: 25 }),
      ]);
      setSettings(sRes?.data?.data);
      setPayments(Array.isArray(pRes?.data?.data) ? pRes.data.data : []);
    } catch (err) {
      setError({
        message: apiErrorMessage(err, "Failed to load payments"),
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
      anyOf={["settings.manage", "payment.manage", "invoice.view"]}
      fallback={
        <div className="page-content">
          <Container fluid>
            <EmptyState icon="ri-lock-line" title="No access" />
          </Container>
        </div>
      }
    >
      <div className="page-content">
        <Container fluid>
          <BreadCrumb title="Payments" pageTitle="Settings" />
          {error && (
            <ErrorState message={error.message} requestId={error.requestId} onRetry={load} />
          )}
          {loading ? (
            <Skeleton rows={5} />
          ) : (
            <Row>
              <Col lg={4}>
                <Card>
                  <CardHeader>
                    <h5 className="mb-0">Provider</h5>
                  </CardHeader>
                  <CardBody>
                    <p className="mb-2">
                      Active:{" "}
                      <StatusChip
                        status="info"
                        label={settings?.provider || "mock"}
                      />
                    </p>
                    <p className="text-muted small mb-0">
                      Set <code>PAYMENTS_PROVIDER=mock</code> (default) for demo capture without
                      Razorpay keys.
                    </p>
                    <ul className="mt-3 small mb-0">
                      {(settings?.methods || []).map((m) => (
                        <li key={m}>{m}</li>
                      ))}
                    </ul>
                  </CardBody>
                </Card>
              </Col>
              <Col lg={8}>
                <Card>
                  <CardHeader>
                    <h5 className="mb-0">Recent payments</h5>
                  </CardHeader>
                  <CardBody>
                    {payments.length === 0 ? (
                      <EmptyState
                        icon="ri-bank-card-line"
                        title="No payments yet"
                        description="Record a payment from an invoice detail page."
                      />
                    ) : (
                      <Table size="sm" responsive>
                        <thead>
                          <tr>
                            <th>No</th>
                            <th>Method</th>
                            <th>Amount</th>
                            <th>Status</th>
                            <th>Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {payments.map((p) => (
                            <tr key={p._id}>
                              <td>{p.paymentNo}</td>
                              <td>{p.method}</td>
                              <td>
                                <Money paise={p.amountPaise} />
                              </td>
                              <td>{p.status}</td>
                              <td>{p.localDate}</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    )}
                  </CardBody>
                </Card>
              </Col>
            </Row>
          )}
        </Container>
      </div>
    </Can>
  );
};

export default PaymentsSettings;
