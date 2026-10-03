import React, { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Col,
  Container,
  FormGroup,
  Input,
  Label,
  Row,
  Table,
} from "reactstrap";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import EmptyState from "../../Components/Common/EmptyState";
import ErrorState from "../../Components/Common/ErrorState";
import Skeleton from "../../Components/Common/Skeleton";
import StatusChip from "../../Components/Common/StatusChip";
import Money from "../../Components/Common/Money";
import { Can } from "../../Components/Common/Can";
import {
  getInvoice,
  recordPayment,
  downloadInvoicePdf,
  creditNoteInvoice,
} from "../../api/arambhFinance.api";

const InvoiceDetail = () => {
  const { id } = useParams();
  document.title = "Invoice | Arambh Sports Arena";

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("cash");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getInvoice(id);
      const data = res?.data?.data;
      setInvoice(data);
      if (data?.totals?.duePaise != null) {
        setPayAmount(String(data.totals.duePaise));
      }
    } catch (err) {
      setError({
        message: err?.response?.data?.message || err?.message || "Failed to load invoice",
        requestId: err?.response?.data?.requestId,
      });
      setInvoice(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const onPay = async () => {
    setBusy(true);
    setError(null);
    try {
      const amountPaise = Number(payAmount);
      await recordPayment(id, {
        amountPaise,
        method: payMethod,
        capture: true,
      });
      await load();
    } catch (err) {
      setError({
        message: err?.response?.data?.message || err?.message || "Payment failed",
        requestId: err?.response?.data?.requestId,
      });
    } finally {
      setBusy(false);
    }
  };

  const onPdf = async () => {
    try {
      const res = await downloadInvoicePdf(id);
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${invoice?.number || "invoice"}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError({
        message: err?.response?.data?.message || err?.message || "PDF download failed",
      });
    }
  };

  const onCredit = async () => {
    if (!window.confirm("Create a full credit note and void this invoice?")) return;
    setBusy(true);
    try {
      await creditNoteInvoice(id, { reason: "Admin credit note" });
      await load();
    } catch (err) {
      setError({
        message: err?.response?.data?.message || err?.message || "Credit note failed",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Can
      perm="invoice.view"
      fallback={
        <div className="page-content">
          <Container fluid>
            <EmptyState icon="ri-lock-line" title="No access" description="Need invoice.view" />
          </Container>
        </div>
      }
    >
      <div className="page-content">
        <Container fluid>
          <BreadCrumb title="Invoice detail" pageTitle="Finance" />
          <p className="mb-3">
            <Link to="/finance/invoices">← Back to invoices</Link>
          </p>
          {error && (
            <ErrorState message={error.message} requestId={error.requestId} onRetry={load} />
          )}
          {loading ? (
            <Skeleton rows={8} />
          ) : !invoice ? (
            <EmptyState icon="ri-file-damage-line" title="Invoice not found" />
          ) : (
            <Row>
              <Col lg={8}>
                <Card>
                  <CardHeader className="d-flex justify-content-between align-items-center">
                    <div>
                      <h5 className="mb-1">{invoice.number}</h5>
                      <span className="text-muted small">
                        {invoice.customerId?.name || "—"} · {invoice.localDate}
                      </span>
                    </div>
                    <StatusChip status="info" label={invoice.status} />
                  </CardHeader>
                  <CardBody>
                    <Table size="sm" responsive>
                      <thead>
                        <tr>
                          <th>Description</th>
                          <th>Qty</th>
                          <th>Unit</th>
                          <th>Tax</th>
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(invoice.lines || []).map((line, i) => (
                          <tr key={i}>
                            <td>{line.description}</td>
                            <td>{line.qty}</td>
                            <td>
                              <Money paise={line.unitPricePaise} />
                            </td>
                            <td>
                              <Money paise={line.taxPaise} />
                            </td>
                            <td>
                              <Money paise={line.totalPaise} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                    <div className="text-end">
                      <div>
                        Subtotal: <Money paise={invoice.totals?.subtotalPaise} />
                      </div>
                      <div>
                        Tax: <Money paise={invoice.totals?.taxPaise} />
                      </div>
                      <div className="fw-semibold">
                        Total: <Money paise={invoice.totals?.totalPaise} />
                      </div>
                      <div>
                        Paid: <Money paise={invoice.totals?.paidPaise} /> · Due:{" "}
                        <Money paise={invoice.totals?.duePaise} />
                      </div>
                    </div>
                    <div className="mt-3 d-flex gap-2 flex-wrap">
                      <Button color="secondary" outline size="sm" onClick={onPdf}>
                        Download PDF
                      </Button>
                      {["posted", "partially_paid", "paid"].includes(invoice.status) && (
                        <Button
                          color="warning"
                          outline
                          size="sm"
                          onClick={onCredit}
                          disabled={busy}
                        >
                          Credit note
                        </Button>
                      )}
                    </div>
                  </CardBody>
                </Card>
              </Col>
              <Col lg={4}>
                <Card>
                  <CardHeader>
                    <h5 className="mb-0">Record payment (mock)</h5>
                  </CardHeader>
                  <CardBody>
                    {invoice.totals?.duePaise > 0 ? (
                      <>
                        <FormGroup>
                          <Label>Amount (paise)</Label>
                          <Input
                            type="number"
                            value={payAmount}
                            onChange={(e) => setPayAmount(e.target.value)}
                          />
                          <small className="text-muted">
                            Due <Money paise={invoice.totals.duePaise} />
                          </small>
                        </FormGroup>
                        <FormGroup>
                          <Label>Method</Label>
                          <Input
                            type="select"
                            value={payMethod}
                            onChange={(e) => setPayMethod(e.target.value)}
                          >
                            <option value="cash">cash</option>
                            <option value="card">card</option>
                            <option value="upi">upi</option>
                            <option value="online">online (mock capture)</option>
                          </Input>
                        </FormGroup>
                        <Can anyOf={["payment.create", "invoice.manage"]}>
                          <Button color="primary" onClick={onPay} disabled={busy} block>
                            {busy ? "Recording…" : "Pay"}
                          </Button>
                        </Can>
                      </>
                    ) : (
                      <EmptyState
                        icon="ri-check-line"
                        title="Nothing due"
                        description="This invoice is fully paid or void."
                      />
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

export default InvoiceDetail;
