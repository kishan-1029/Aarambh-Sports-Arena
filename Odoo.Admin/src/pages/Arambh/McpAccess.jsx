import React, { useCallback, useEffect, useState } from "react";
import {
  Badge,
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
import GridActionButton from "../../Components/Common/GridActionButton";
import { createMcpKey, listMcpKeys, revokeMcpKey } from "../../api/arambhMcp.api";
import { apiErrorMessage } from "../../utils/apiErrorMessage";

const McpAccess = () => {
  document.title = "MCP access | Arambh Sports Arena";
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [name, setName] = useState("Claude / ChatGPT");
  const [scopes, setScopes] = useState("mcp.read,mcp.write");
  const [saving, setSaving] = useState(false);
  const [createdKey, setCreatedKey] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listMcpKeys();
      setRows(Array.isArray(res?.data?.data) ? res.data.data : []);
    } catch (err) {
      setError({
        message: apiErrorMessage(err, "Failed to load keys"),
        requestId: err?.response?.data?.requestId,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setCreatedKey("");
    try {
      const res = await createMcpKey({
        name,
        scopes: scopes
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        expiresInDays: 90,
      });
      setCreatedKey(res?.data?.data?.apiKey || "");
      await load();
    } catch (err) {
      setError({
        message: apiErrorMessage(err, "Create failed"),
        requestId: err?.response?.data?.requestId,
      });
    } finally {
      setSaving(false);
    }
  };

  const onRevoke = async (id) => {
    try {
      await revokeMcpKey(id);
      await load();
    } catch (err) {
      setError({
        message: apiErrorMessage(err, "Revoke failed"),
      });
    }
  };

  return (
    <Can
      perm="mcp.manage"
      fallback={
        <div className="page-content">
          <Container fluid>
            <EmptyState title="No access" description="Need permission mcp.manage (owner)." />
          </Container>
        </div>
      }
    >
      <div className="page-content">
        <Container fluid>
          <BreadCrumb title="MCP access" pageTitle="Settings" />
          <p className="text-muted">
            API keys for ChatGPT / Claude admin MCP. Host runs in <code>mcp/</code> — see{" "}
            <code>mcp/CONNECT.md</code>. Connector URL default{" "}
            <code>http://localhost:7337/mcp</code>.
          </p>
          {error && <ErrorState {...error} onRetry={load} />}
          {createdKey && (
            <div className="alert alert-success">
              <strong>Copy now — shown once:</strong>
              <div className="mt-1">
                <code style={{ wordBreak: "break-all" }}>{createdKey}</code>
              </div>
            </div>
          )}
          <Row>
            <Col lg={4}>
              <Card>
                <CardHeader>
                  <h5 className="mb-0">Create key</h5>
                </CardHeader>
                <CardBody>
                  <Form onSubmit={onCreate}>
                    <FormGroup>
                      <Label>Name</Label>
                      <Input value={name} onChange={(e) => setName(e.target.value)} required />
                    </FormGroup>
                    <FormGroup>
                      <Label>Scopes (comma)</Label>
                      <Input
                        value={scopes}
                        onChange={(e) => setScopes(e.target.value)}
                        placeholder="mcp.read,mcp.write"
                      />
                    </FormGroup>
                    <Button color="success" type="submit" disabled={saving}>
                      {saving ? "Creating…" : "Create key"}
                    </Button>
                  </Form>
                </CardBody>
              </Card>
            </Col>
            <Col lg={8}>
              <Card>
                <CardHeader>
                  <h5 className="mb-0">Keys</h5>
                </CardHeader>
                <CardBody>
                  {loading ? (
                    <Skeleton rows={5} />
                  ) : !rows.length ? (
                    <EmptyState title="No keys" description="Create one for Claude or ChatGPT." />
                  ) : (
                    <Table responsive hover className="align-middle mb-0">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Prefix</th>
                          <th>Scopes</th>
                          <th>Last used</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r) => (
                          <tr key={r.id}>
                            <td>{r.name}</td>
                            <td>
                              <code>{r.prefix}</code>
                            </td>
                            <td>
                              {(r.scopes || []).map((s) => (
                                <Badge key={s} color="light" className="text-dark me-1">
                                  {s}
                                </Badge>
                              ))}
                              {r.revokedAt && (
                                <Badge color="danger" className="ms-1">
                                  revoked
                                </Badge>
                              )}
                            </td>
                            <td className="small text-muted">
                              {r.lastUsedAt ? new Date(r.lastUsedAt).toLocaleString() : "—"}
                            </td>
                            <td className="text-end">
                              {!r.revokedAt && (
                                <GridActionButton label="Revoke" onClick={() => onRevoke(r.id)} />
                              )}
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
        </Container>
      </div>
    </Can>
  );
};

export default McpAccess;
