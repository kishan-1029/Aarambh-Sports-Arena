import React, { useContext } from "react";
import { Container, Row, Col, Card, CardBody } from "reactstrap";
import { useLocation } from "react-router-dom";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import EmptyState from "../../Components/Common/EmptyState";
import { AuthContext } from "../../context/AuthContext";
import { ARAMBH_ROUTES } from "../../config/arambhNav";
import { Can } from "../../Components/Common/Can";

const ComingSoon = () => {
  const { adminData } = useContext(AuthContext);
  const location = useLocation();
  const route = ARAMBH_ROUTES.find((r) => r.path === location.pathname);
  const title = route?.label || "Module";
  const perm = route?.perm;

  document.title = `${title} | Arambh Sports Arena`;

  const body = (
    <div className="page-content">
      <Container fluid>
        <BreadCrumb title={title} pageTitle="Arambh" />
        <Row className="justify-content-center">
          <Col lg={8}>
            <Card className="border-0 shadow-sm" style={{ borderRadius: "var(--arambh-radius)" }}>
              <CardBody>
                <EmptyState
                  icon={route?.icon || "ri-time-line"}
                  title={`${title} — Coming soon`}
                  description="This Arambh Sports Arena module is planned for a later phase. Navigation and permissions are wired so the screen can ship without a second redesign."
                />
              </CardBody>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );

  if (perm) {
    return (
      <Can perm={perm} fallback={
        <div className="page-content">
          <Container fluid>
            <EmptyState
              icon="ri-lock-line"
              title="No access"
              description={`You need permission \`${perm}\` to open ${title}.`}
            />
          </Container>
        </div>
      }>
        {body}
      </Can>
    );
  }

  return body;
};

export default ComingSoon;
