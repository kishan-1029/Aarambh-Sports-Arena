import React, { useCallback, useEffect, useState } from "react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Col,
  Container,
  Form,
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
import { Can } from "../../Components/Common/Can";
import {
  getSettings,
  patchSettings,
  listLocations,
} from "../../api/arambhFinance.api";

const FEATURE_FLAGS = [
  { key: "publicSiteEnabled", label: "Public website enabled" },
  { key: "showMembershipPlans", label: "Show membership plans" },
  { key: "showSports", label: "Show sports" },
  { key: "showAvailability", label: "Show availability" },
  { key: "showBlogs", label: "Show blogs" },
  { key: "showTrial", label: "Show trial booking" },
  { key: "showContact", label: "Show contact / enquiry" },
];

const SettingsClub = () => {
  document.title = "Club & locations | Arambh Sports Arena";

  const [settings, setSettings] = useState(null);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState("");
  const [error, setError] = useState(null);
  const [clubName, setClubName] = useState("");
  const [receiptFooter, setReceiptFooter] = useState("");
  const [paymentsProvider, setPaymentsProvider] = useState("mock");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sRes, lRes] = await Promise.all([getSettings(), listLocations()]);
      const s = sRes?.data?.data;
      const locs = lRes?.data?.data ?? [];
      setSettings(s);
      setClubName(s?.clubName || "Arambh Sports Arena");
      setReceiptFooter(s?.receiptFooter || "");
      setPaymentsProvider(s?.paymentsProvider || "mock");
      setLocations(Array.isArray(locs) ? locs : []);
    } catch (err) {
      setError({
        message: err?.response?.data?.message || err?.message || "Failed to load settings",
        requestId: err?.response?.data?.requestId,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await patchSettings({
        clubName,
        receiptFooter,
        paymentsProvider,
      });
      setSettings(res?.data?.data);
    } catch (err) {
      setError({
        message: err?.response?.data?.message || err?.message || "Save failed",
        requestId: err?.response?.data?.requestId,
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleFlag = async (key) => {
    const next = !(settings?.[key] !== false);
    setToggling(key);
    setError(null);
    try {
      const res = await patchSettings({ [key]: next });
      setSettings(res?.data?.data);
    } catch (err) {
      setError({
        message: err?.response?.data?.message || err?.message || "Toggle failed",
        requestId: err?.response?.data?.requestId,
      });
    } finally {
      setToggling("");
    }
  };

  return (
    <Can
      perm="settings.manage"
      fallback={
        <div className="page-content">
          <Container fluid>
            <EmptyState
              icon="ri-lock-line"
              title="No access"
              description="You need permission `settings.manage`."
            />
          </Container>
        </div>
      }
    >
      <div className="page-content">
        <Container fluid>
          <BreadCrumb title="Club & locations" pageTitle="Settings" />
          {error && (
            <ErrorState message={error.message} requestId={error.requestId} onRetry={load} />
          )}
          {loading ? (
            <Skeleton rows={8} />
          ) : (
            <Row>
              <Col lg={6}>
                <Card className="mb-3">
                  <CardHeader>
                    <h5 className="mb-0">Club</h5>
                  </CardHeader>
                  <CardBody>
                    <Form onSubmit={onSave}>
                      <FormGroup>
                        <Label>Club name</Label>
                        <Input
                          value={clubName}
                          onChange={(e) => setClubName(e.target.value)}
                          required
                        />
                      </FormGroup>
                      <FormGroup>
                        <Label>Receipt footer</Label>
                        <Input
                          type="textarea"
                          rows={2}
                          value={receiptFooter}
                          onChange={(e) => setReceiptFooter(e.target.value)}
                        />
                      </FormGroup>
                      <FormGroup>
                        <Label>Payments provider</Label>
                        <Input
                          type="select"
                          value={paymentsProvider}
                          onChange={(e) => setPaymentsProvider(e.target.value)}
                        >
                          <option value="mock">mock</option>
                          <option value="razorpay">razorpay</option>
                        </Input>
                      </FormGroup>
                      <Button color="success" type="submit" disabled={saving}>
                        {saving ? "Saving…" : "Save"}
                      </Button>
                      {settings?.currency && (
                        <span className="text-muted ms-3 small">
                          Currency {settings.currency} · tax-exclusive
                        </span>
                      )}
                    </Form>
                  </CardBody>
                </Card>

                <Card>
                  <CardHeader>
                    <h5 className="mb-0">Public website · one-click controls</h5>
                  </CardHeader>
                  <CardBody>
                    <p className="text-muted small">
                      Turn pages on/off for the customer site. Inactive membership plans and
                      courts still follow their own Active/Status toggles on those screens.
                    </p>
                    {FEATURE_FLAGS.map((f) => {
                      const on = settings?.[f.key] !== false;
                      return (
                        <div
                          key={f.key}
                          className="d-flex align-items-center justify-content-between border rounded px-3 py-2 mb-2"
                        >
                          <div>
                            <div className="fw-semibold">{f.label}</div>
                            <div className="small text-muted">{f.key}</div>
                          </div>
                          <div className="form-check form-switch m-0">
                            <Input
                              type="switch"
                              checked={on}
                              disabled={toggling === f.key}
                              onChange={() => toggleFlag(f.key)}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </CardBody>
                </Card>
              </Col>
              <Col lg={6}>
                <Card>
                  <CardHeader>
                    <h5 className="mb-0">Locations</h5>
                  </CardHeader>
                  <CardBody>
                    {locations.length === 0 ? (
                      <EmptyState
                        icon="ri-map-pin-line"
                        title="No locations"
                        description="Run npm run seed:demo on the server to load the Main location."
                      />
                    ) : (
                      <Table size="sm" responsive>
                        <thead>
                          <tr>
                            <th>Code</th>
                            <th>Name</th>
                            <th>Phone</th>
                          </tr>
                        </thead>
                        <tbody>
                          {locations.map((loc) => (
                            <tr key={loc._id}>
                              <td>{loc.code}</td>
                              <td>{loc.name}</td>
                              <td>{loc.phone || "—"}</td>
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

export default SettingsClub;
