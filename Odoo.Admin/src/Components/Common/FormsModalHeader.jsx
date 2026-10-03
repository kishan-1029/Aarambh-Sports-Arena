import React from "react";
import PropTypes from "prop-types";
import {
  Button,
  Col,
  Label,
  Input,
  Row,
} from "reactstrap";

const FormsHeader = ({
  formName,
  filter,
  handleFilter,
  tog_list,
  setQuery,
  showAddButton = true,
}) => {
  return (
    <Row className="g-2 g-md-3 mb-2 align-items-center list-page-toolbar">
        <Col xs={12} md={4}>
          <h2 className="card-title mb-0 list-page-title">{formName}</h2>
        </Col>

        <Col xs={12} md={3}>
          <div className="list-page-filter">
            <Input
              type="checkbox"
              className="form-check-input"
              name="filter"
              value={filter}
              defaultChecked={true}
              onChange={handleFilter}
            />
            <Label className="form-check-label ms-2 mb-0">Active</Label>
          </div>
        </Col>
        <Col xs={12} md={5}>
          <div className="d-flex flex-wrap gap-2 align-items-center justify-content-md-end page-toolbar">
            {showAddButton && (
              <Button
                color="success"
                size="sm"
                className="add-btn"
                onClick={() => tog_list()}
                id="create-btn"
              >
                <i className="ri-add-line align-bottom me-1"></i>
                Add
              </Button>
            )}
            <div className="search-box toolbar-field">
              <input
                type="text"
                className="form-control search"
                placeholder="Search..."
                onChange={(e) => setQuery(e.target.value)}
              />
              <i className="ri-search-line search-icon"></i>
            </div>
          </div>
        </Col>
      </Row>
  );
};

FormsHeader.propTypes = {
  formName: PropTypes.string.isRequired,
  filter: PropTypes.bool,
  handleFilter: PropTypes.func,
  tog_list: PropTypes.func.isRequired,
  setQuery: PropTypes.func.isRequired,
  showAddButton: PropTypes.bool,
};

export default FormsHeader;
