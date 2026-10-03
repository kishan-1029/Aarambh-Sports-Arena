import React from "react";
import { Col, Container, Row } from "reactstrap";

const Footer = () => {
    return (
        <footer className="footer">
            <Container fluid>
                <Row className="gy-1">
                    <Col xs={12} sm={6} className="text-center text-sm-start">
                        {new Date().getFullYear()} © Arambh Sports Arena
                    </Col>
                    <Col xs={12} sm={6} className="text-center text-sm-end text-muted">
                        Club operations · Courts · Membership
                    </Col>
                </Row>
            </Container>
        </footer>
    );
};

export default Footer;
