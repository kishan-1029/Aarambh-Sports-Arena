import React, { useState, useEffect, useContext, useMemo } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Col,
  Container,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Label,
  Input,
  Row,
} from "reactstrap";
import DataTable from "react-data-table-component";
import {
  getAllCountries,
  getAllStates,
  getCityById,
  createCity,
  updateCity,
  deleteCity,
  searchCities,
} from "../../api/locations.api";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import GridActionButton from "../../Components/Common/GridActionButton";
import DeleteModal from "../../Components/Common/DeleteModal";
import ReferenceErrorModal from "../../Components/Common/ReferenceErrorModal";
import FormsHeader from "../../Components/Common/FormsModalHeader";
import FormsFooter from "../../Components/Common/FormAddFooter";
import FormUpdateFooter from "../../Components/Common/FormUpdateFooter";
import { toast } from "react-toastify";
import { apiErrorMessage } from "../../utils/apiErrorMessage";
import { AuthContext } from "../../context/AuthContext";
import { MenuContext } from "../../context/MenuContext";

const initialState = {
  countryId: "",
  stateId: "",
  cityName: "",
  cityCode: "",
  isActive: false,
};

function countryKey(country) {
  if (!country) return "";
  if (typeof country === "object") return country._id || "";
  return country;
}

const getColumns = ({ currentPagePermissions, handleTog_edit, tog_delete }) => [
  {
    name: "Sr No",
    selector: (row, index) => index + 1, 
    sortable: true,
    maxWidth: "20px",
  },
  {
    name: "Country Name",
    selector: (row) => row.countryName,
    minWidth: "130px",
  },
  {
    name: "State Name",
    selector: (row) => row.stateName,
    minWidth: "130px",
  },
  {
    name: "City Name",
    selector: (row) => row.cityName,
    minWidth: "130px",
  },
  {
    name: "City Code",
    selector: (row) => row.cityCode,
    sortable: false,
    sortField: "Status",
  },
  {
    name: "Action",
    cell: (row) => (
      <div className="grid-actions">
        {currentPagePermissions.edit && (
          <GridActionButton
            label="Edit"
            onClick={() => handleTog_edit(row._id)}
          />
        )}
        {currentPagePermissions.delete && (
          <GridActionButton
            label="Remove"
            onClick={() => tog_delete(row._id)}
          />
        )}
        {!currentPagePermissions.edit && !currentPagePermissions.delete && (
          <span className="text-muted">No actions available</span>
        )}
      </div>
    ),
    sortable: false,
    minWidth: "96px",
  },
];

const City = () => {
  const { adminData } = useContext(AuthContext);
  const { currentPagePermissions } = useContext(MenuContext);
  const [values, setValues] = useState(initialState);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmit, setIsSubmit] = useState(false);
  const [filter, setFilter] = useState(true);
  const [countryList, setCountryList] = useState([]);
  const [stateList,setStateList] = useState([]);
  
  // Separate loading states for different operations
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  const [isUpdateLoading, setIsUpdateLoading] = useState(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const [isEditFetching, setIsEditFetching] = useState(false);

  const [query, setQuery] = useState("");

  const [selectedId, setSelectedId] = useState("");
  const [remove_id, setRemove_id] = useState("");

  const [countries, setCountries] = useState([]);

  const fetchCountries = ()=>{
    getAllCountries().then((res)=>{
        setCountryList(Array.isArray(res.data?.data) ? res.data.data : []);
        }).catch((err)=>{
            console.log(err);
            setCountryList([]);
        });
  }

  const fetchStates = ()=>{
    getAllStates().then((res)=>{
        setStateList(Array.isArray(res.data?.data) ? res.data.data : []);
        }).catch((err)=>{
            console.log(err);
            setStateList([]);
        });
  }

  const statesForCountry = stateList.filter(
    (s) => String(countryKey(s.countryId)) === String(values.countryId || "")
  );

  useEffect(() => {
    fetchCountries();
    fetchStates();
    }, []);

  useEffect(() => {
    if (Object.keys(formErrors).length === 0 && isSubmit) {
      console.log("no errors");
    }
  }, [formErrors, isSubmit]);

  const [modal_list, setmodal_list] = useState(false);
  const tog_list = () => {
    setmodal_list(!modal_list);
    setValues(initialState);
    setIsSubmit(false);
  };

  const [modal_delete, setmodal_delete] = useState(false);
  const [referenceModal, setReferenceModal] = useState(false);
  const [referenceData, setReferenceData] = useState(null);
  const tog_delete = (id) => {
    setmodal_delete(!modal_delete);
    setRemove_id(id);
  };

  const [modal_edit, setmodal_edit] = useState(false);
  const handleTog_edit = (id) => {
    setmodal_edit(!modal_edit);
    setIsSubmit(false);
    setSelectedId(id);
    setIsEditFetching(true);
    getCityById(id)
      .then((res) => {
        setValues({
          countryId	: res.data.data.countryId,
          stateId:res.data.data.stateId,
          cityName: res.data.data.cityName,
          cityCode: res.data.data.cityCode,
          isActive: res.data.data.isActive,
        });
      })
      .catch((err) => {
        console.log(err);
        toast.error(apiErrorMessage(err, "Failed to fetch city details"));
      }).finally(() => {
        setIsEditFetching(false);
      });
  };

  const handleChange = (e) => {
    setValues({ ...values, [e.target.name]: e.target.value });
  };

  const handleCheck = (e) => {
    setValues({ ...values, isActive: e.target.checked });
  };

  const handleSubmitCancel = () => {
    setmodal_list(false);
    setValues(initialState);
    setIsSubmit(false);
  };

  const handleClick = (e) => {
    e.preventDefault();
    setFormErrors({});
    let errors = validate(values);
    setFormErrors(errors);
    setIsSubmit(true);
    if (
      Object.keys(errors).length === 0
    ) {
      setIsSubmitLoading(true);
      createCity(values)
        .then((res) => {
          if (res.data.isOk) {
            toast.success("City Added Successfully!");
            setmodal_list(!modal_list);
            setValues(initialState);
            fetchCities();
          }
        })
        .catch((error) => {
          console.log(error);
          toast.error(apiErrorMessage(error, "Failed to add city. Please try again."));
        }).finally(() => {
          setIsSubmitLoading(false);
        });
    }
  };

  const handleDelete = (e) => {
    e.preventDefault();
    setIsDeleteLoading(true);
    deleteCity(remove_id)
      .then((res) => {
        setmodal_delete(!modal_delete);
        fetchCities();
        toast.success("City Removed Successfully!");
      })
      .catch((err) => {
        console.log(err);
        setmodal_delete(false);
        if (err.response?.status === 409) {
          setReferenceData(err.response.data);
          setReferenceModal(true);
        } else {
          toast.error(apiErrorMessage(err, "Failed to remove city. Please try again."));
        }
      }).finally(() => {
        setIsDeleteLoading(false);
      });
  };

  const handleDeleteClose = (e) => {
    e.preventDefault();
    setmodal_delete(false);
  };

  const handleUpdateCancel = (e) => {
    setmodal_edit(false);
    setIsSubmit(false);
    setFormErrors({});
  };

  const handleUpdate = (e) => {
    e.preventDefault();
    let erros = validate(values);
    setFormErrors(erros);
    setIsSubmit(true);
    if (Object.keys(erros).length === 0) {
      setIsUpdateLoading(true);
      updateCity(selectedId, values)
        .then((res) => {
          setmodal_edit(!modal_edit);
          fetchCities();
          toast.success("City Updated Successfully!");
        })
        .catch((err) => {
          console.log(err);
          toast.error(apiErrorMessage(err, "Failed to update city. Please try again."));
        }).finally(() => {
          setIsUpdateLoading(false);
        });
    }
  };

  const validate = (values) => {
    const errors = {};

    if (values.countryId === "") {
      errors.countryId = "Country is required!";
    }
    if (values.stateId === "") {
      errors.stateId = "Stste is required!";
    }
    if(values.cityCode === "") {
      errors.cityCode = "City Code is required!";
    }
    if(values.cityName === "") {
      errors.cityName = "City Name is required!";
    }

    return errors;
  };

  const [loading, setLoading] = useState(false);
  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage] = useState(100);
  const [pageNo, setPageNo] = useState(0);
  const [column, setcolumn] = useState();
  const [sortDirection, setsortDirection] = useState();

  const handleSort = (column, sortDirection) => {
    setcolumn(column.sortField);
    setsortDirection(sortDirection);
  };

  useEffect(() => {
    fetchCities();
  }, [pageNo, perPage, column, sortDirection, query, filter]);

  const fetchCities = async () => {
    setLoading(true);
    let skip = (pageNo - 1) * perPage;
    if (skip < 0) {
      skip = 0;
    }

    try {
      const response = await searchCities({
        skip: skip,
        per_page: perPage,
        sorton: column,
        sortdir: sortDirection,
        match: query,
        isActive: filter,
      });
      const page = Array.isArray(response.data?.data) ? response.data.data[0] : null;
      setCountries(Array.isArray(page?.data) ? page.data : []);
      setTotalRows(page?.count || 0);
    } catch (err) {
      console.log(err);
      setCountries([]);
      setTotalRows(0);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page) => {
    setPageNo(page);
  };

  const handlePerRowsChange = async (newPerPage, page) => {
    setPerPage(newPerPage);
  };
  const handleFilter = (e) => {
    setFilter(e.target.checked);
  };
    const col = useMemo(
        () =>
            getColumns({
                currentPagePermissions,
                handleTog_edit,
                tog_delete,
            }),
        [currentPagePermissions, handleTog_edit, tog_delete]
    );

  document.title = `City | ${adminData?.companyName}`;

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <BreadCrumb
            maintitle="Master"
            title="City"
            pageTitle="Master"
          />
          <Row>
            <Col lg={12}>
              <Card>
                <CardHeader>
                  <FormsHeader
                    formName="City"
                    filter={filter}
                    handleFilter={handleFilter}
                    tog_list={tog_list}
                    setQuery={setQuery}
                    currentPagePermissions={currentPagePermissions}
                    showAddButton={currentPagePermissions.write}
                  />
                </CardHeader>

                <CardBody>
                  <div id="customerList">
                    <div className="table-responsive table-card mt-1 mb-1 text-right">
                      <DataTable
                        columns={col}
                        data={countries}
                        progressPending={loading}
                        sortServer
                        onSort={(column, sortDirection, sortedRows) => {
                          handleSort(column, sortDirection);
                        }}
                        pagination
                        paginationServer
                        paginationTotalRows={totalRows}
                        paginationPerPage={100}
                        paginationRowsPerPageOptions={[
                          50,100,200,300,totalRows
                      ]} 
                        onChangeRowsPerPage={handlePerRowsChange}
                        onChangePage={handlePageChange}
                      />
                    </div>
                  </div>
                </CardBody>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>

      {/* Add Modal */}
      <Modal
        isOpen={modal_list}
        toggle={() => {
          tog_list();
        }}
        centered
      >
        <ModalHeader
          className="bg-light p-3"
          toggle={() => {
            setmodal_list(false);
            setIsSubmit(false);
          }}
        >
          Add City
        </ModalHeader>
        <form>
          <ModalBody>
            <div className="form-floating mb-3">
              <select
                className="form-select"
                name="countryId"
                value={values.countryId}
                onChange={handleChange}
              >
                <option value={""}>Select Country <span className="text-danger">*</span></option>
                {countryList.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.countryName}
                  </option>
                ))}
              </select>
              {isSubmit && (
                <p className="text-danger">{formErrors.countryId}</p>
              )}
            </div>
            <div className="form-floating mb-3">
              <select
                className="form-select"
                name="stateId"
                value={values.stateId}
                onChange={handleChange}
              >
                <option value={""}>Select State <span className="text-danger">*</span></option>
                {statesForCountry.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.stateName}
                  </option>
                ))}
              </select>
              {isSubmit && (
                <p className="text-danger">{formErrors.countryId}</p>
              )}
            </div>
            <div className="form-floating mb-3">
              <Input
                type="text"
                placeholder="Enter City Name"
                required
                name="cityName"
                value={values.cityName}
                onChange={handleChange}
              />
              <Label>
                City <span className="text-danger">*</span>{" "}
              </Label>
              {isSubmit && (
                <p className="text-danger">{formErrors.cityName}</p>
              )}
            </div>
            <div className="form-floating mb-3">
              <Input
                type="text"
                placeholder="Enter Country Code"
                required
                name="cityCode"
                value={values.cityCode}
                onChange={handleChange}
              />
              <Label>
                City Code <span className="text-danger">*</span>{" "}
              </Label>
              {isSubmit && (
                <p className="text-danger">{formErrors.cityCode}</p>
              )}
            </div>

            <div className=" mb-3">
              <Input
                type="checkbox"
                className="form-check-input"
                name="isActive"
                value={values.isActive}
                onChange={handleCheck}
              />
              <Label className="form-check-label ms-1">Is Active</Label>
            </div>
          </ModalBody>
          <ModalFooter>
            <FormsFooter
              handleSubmit={handleClick}
              handleSubmitCancel={handleSubmitCancel}
              isLoading={isSubmitLoading}
            />
          </ModalFooter>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={modal_edit}
        toggle={() => {
          handleTog_edit();
        }}
        centered
        >
        <ModalHeader
          className="bg-light p-3"
          toggle={() => {
            setmodal_edit(false);
            setIsSubmit(false);
          }}
        >
          Edit City
        </ModalHeader>
        <form>
          <ModalBody>
          <div className="form-floating mb-3">
              <select
                className="form-select"
                name="countryId"
                value={values.countryId}
                onChange={handleChange}
              >
                <option value={""}>Select Country <span className="text-danger">*</span></option>
                {countryList.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.countryName}
                  </option>
                ))}
              </select>
              {isSubmit && (
                <p className="text-danger">{formErrors.countryId}</p>
              )}
            </div>
            <div className="form-floating mb-3">
              <select
                className="form-select"
                name="stateId"
                value={values.stateId}
                onChange={handleChange}
              >
                <option value={""}>Select State <span className="text-danger">*</span></option>
                {statesForCountry.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.stateName}
                  </option>
                ))}
              </select>
              {isSubmit && (
                <p className="text-danger">{formErrors.countryId}</p>
              )}
            </div>
            <div className="form-floating mb-3">
              <Input
                type="text"
                placeholder="Enter City Name"
                required
                name="cityName"
                value={values.cityName}
                onChange={handleChange}
              />
              <Label>
                City <span className="text-danger">*</span>{" "}
              </Label>
              {isSubmit && (
                <p className="text-danger">{formErrors.cityName}</p>
              )}
            </div>
            <div className="form-floating mb-3">
              <Input
                type="text"
                placeholder="Enter Country Code"
                required
                name="cityCode"
                value={values.cityCode}
                onChange={handleChange}
              />
              <Label>
                City Code <span className="text-danger">*</span>{" "}
              </Label>
              {isSubmit && (
                <p className="text-danger">{formErrors.cityCode}</p>
              )}
            </div>

            <div className=" mb-3">
              <Input
                type="checkbox"
                className="form-check-input"
                name="isActive"
                value={values.isActive}
                checked={values.isActive}
                onChange={handleCheck}
              />
              <Label className="form-check-label ms-1">Is Active</Label>
            </div>
          </ModalBody>

          <ModalFooter>
            <FormUpdateFooter
              handleUpdate={handleUpdate}
              handleUpdateCancel={handleUpdateCancel}
              isLoading={isUpdateLoading || isEditFetching}
            />
          </ModalFooter>
        </form>
      </Modal>

      <DeleteModal
        show={modal_delete}
        handleDelete={handleDelete}
        toggle={handleDeleteClose}
        setmodal_delete={setmodal_delete}
        disabled={isDeleteLoading}
      />
      <ReferenceErrorModal
        isOpen={referenceModal}
        toggle={() => setReferenceModal(false)}
        title="Cannot Delete City"
        referenceData={referenceData}
      />
    </React.Fragment>
  );
};

export default City;
