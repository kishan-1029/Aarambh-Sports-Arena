import React, { useCallback, useEffect, useState } from "react";
import {
  Badge,
  Button,
  ButtonGroup,
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
import Skeleton from "../../Components/Common/Skeleton";
import Money from "../../Components/Common/Money";
import {
  listCourts,
  listSports,
  listCourtBlocks,
  listSocialSessions,
} from "../../api/arambhBooking.api";

const Courts = () => {
  document.title = "Courts | Arambh Sports Arena";
  const [tab, setTab] = useState("courts");
  const [sports, setSports] = useState([]);
  const [courts, setCourts] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [social, setSocial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, c, b, soc] = await Promise.all([
        listSports({ pageSize: 50 }),
        listCourts({ pageSize: 100 }),
        listCourtBlocks({ pageSize: 50 }),
        listSocialSessions({ pageSize: 50 }),
      ]);
      setSports(Array.isArray(s?.data?.data) ? s.data.data : []);
      setCourts(Array.isArray(c?.data?.data) ? c.data.data : []);
      setBlocks(Array.isArray(b?.data?.data) ? b.data.data : []);
      setSocial(Array.isArray(soc?.data?.data) ? soc.data.data : []);
    } catch (err) {
      setError({
        message: err?.response?.data?.message || err?.message || "Failed to load",
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
    <div className="page-content">
      <Container fluid>
        <BreadCrumb title="Courts & sports" pageTitle="Front Desk" />
        <Row>
          <Col>
            <Card>
              <CardHeader className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                <h5 className="mb-0">Facilities</h5>
                <ButtonGroup size="sm">
                  {[
                    ["courts", "Courts"],
                    ["sports", "Sports"],
                    ["blocks", "Blocks"],
                    ["social", "Social play"],
                  ].map(([id, label]) => (
                    <Button
                      key={id}
                      color={tab === id ? "primary" : "light"}
                      onClick={() => setTab(id)}
                    >
                      {label}
                    </Button>
                  ))}
                </ButtonGroup>
              </CardHeader>
              <CardBody>
                {loading && <Skeleton rows={6} />}
                {!loading && error && <ErrorState {...error} onRetry={load} />}
                {!loading && !error && tab === "courts" && (
                  <>
                    {!courts.length ? (
                      <EmptyState title="No courts" description="Run seed:demo to load demo courts." />
                    ) : (
                      <Table responsive hover className="align-middle mb-0">
                        <thead>
                          <tr>
                            <th>Code</th>
                            <th>Name</th>
                            <th>Sport</th>
                            <th>Status</th>
                            <th>Walk-in peak</th>
                          </tr>
                        </thead>
                        <tbody>
                          {courts.map((c) => (
                            <tr key={c._id}>
                              <td>{c.code}</td>
                              <td>{c.name}</td>
                              <td>{c.sportId?.name || c.sportId?.key || "—"}</td>
                              <td>
                                <Badge color={c.status === "active" ? "success" : "secondary"}>
                                  {c.status}
                                </Badge>
                              </td>
                              <td>
                                <Money paise={c.pricing?.walkInPaise?.peak ?? 0} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    )}
                  </>
                )}
                {!loading && !error && tab === "sports" && (
                  <>
                    {!sports.length ? (
                      <EmptyState title="No sports" />
                    ) : (
                      <Table responsive hover className="align-middle mb-0">
                        <thead>
                          <tr>
                            <th>Key</th>
                            <th>Name</th>
                            <th>Session</th>
                            <th>Step</th>
                            <th>Active</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sports.map((s) => (
                            <tr key={s._id}>
                              <td>{s.key}</td>
                              <td>{s.name}</td>
                              <td>{s.sessionMinutes} min</td>
                              <td>{s.slotStepMinutes} min</td>
                              <td>{s.active ? "Yes" : "No"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    )}
                  </>
                )}
                {!loading && !error && tab === "blocks" && (
                  <>
                    {!blocks.length ? (
                      <EmptyState
                        title="No court blocks"
                        description="Create blocks via API or front desk (Phase 7)."
                      />
                    ) : (
                      <Table responsive hover className="align-middle mb-0">
                        <thead>
                          <tr>
                            <th>Court</th>
                            <th>Reason</th>
                            <th>Start</th>
                            <th>End</th>
                          </tr>
                        </thead>
                        <tbody>
                          {blocks.map((b) => (
                            <tr key={b._id}>
                              <td>{b.courtId?.name || b.courtId}</td>
                              <td>{b.reason}</td>
                              <td>{new Date(b.start).toLocaleString()}</td>
                              <td>{new Date(b.end).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    )}
                  </>
                )}
                {!loading && !error && tab === "social" && (
                  <>
                    {!social.length ? (
                      <EmptyState
                        title="No social sessions"
                        description="Create a Friday social session via API."
                      />
                    ) : (
                      <Table responsive hover className="align-middle mb-0">
                        <thead>
                          <tr>
                            <th>Title</th>
                            <th>Start</th>
                            <th>Capacity</th>
                            <th>Joined</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {social.map((s) => (
                            <tr key={s._id}>
                              <td>{s.title}</td>
                              <td>{new Date(s.start).toLocaleString()}</td>
                              <td>{s.capacity}</td>
                              <td>{s.joinedCount}</td>
                              <td>
                                <Badge color={s.status === "full" ? "warning" : "success"}>
                                  {s.status}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    )}
                  </>
                )}
              </CardBody>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Courts;
