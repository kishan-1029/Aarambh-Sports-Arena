import React, { useContext, useState, useEffect } from "react";
import PropTypes from "prop-types";
import {
    Card,
    CardBody,
    Col,
    Container,
    Input,
    Label,
    Row,
    Button,
    Form,
} from "reactstrap";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import withRouter from "../../Components/Common/withRouter";
import { AuthContext } from "../../context/AuthContext";
import { MenuContext } from "../../context/MenuContext";
import loginHeroBg from "../../assets/images/brand/login-hero-bg.jpg";
import loginLeftLogo from "../../assets/images/brand/login-left-logo.png";
import logoHorizontal from "../../assets/images/brand/logo-horizontal.png";
import { getPublicCompanyDetails } from "../../api/companies.api";
import config from "../../config";
import {
    loginCompany,
    sendOtp,
    verifyOtp,
    resetPassword,
} from "../../api/auth.api";
import { useLoginAttempt } from "../../hooks/useLoginAttempt";

const initialState = {
    email: "",
    password: "",
};

// Format seconds to MM:SS
const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
};

// Function to get user's IP address
const getUserIP = async () => {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        console.error('Failed to get IP address:', error);
        return 'unknown';
    }
};

// Function to get user's location with high accuracy
const getUserLocation = () => {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            console.warn('Geolocation is not supported by this browser');
            resolve({ latitude: null, longitude: null });
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                console.log('Geolocation obtained:', {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy + ' meters'
                });
                resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                });
            },
            (error) => {
                console.error('Geolocation error:', error);
                resolve({ latitude: null, longitude: null });
            },
            {
                timeout: 15000,
                maximumAge: 120000
            }
        );
    });
};

const ForgotPasswordForm = ({
    forgotPasswordStep,
    setForgotPasswordStep,
    forgotPasswordEmail,
    setForgotPasswordEmail,
    isSendOtpLoading,
    handleSendOTP,
    handleBackToLogin,
    otp,
    setOtp,
    isVerifyOtpLoading,
    otpCountdown,
    handleVerifyOTP,
    otpResendDisabled,
    isResendOtpLoading,
    handleResendOTP,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    isResetPasswordLoading,
    handleResetPassword,
}) => {
    switch (forgotPasswordStep) {
        case 1: // Email input
            return (
                <>
                    <div className="text-center">
                        <h2
                            className="mobile-heading"
                            style={{ color: "#0d6efd", fontWeight: "700" }}
                        >
                            FORGOT PASSWORD
                        </h2>
                        <p className="text-muted">
                            Enter your email to reset password
                        </p>
                    </div>
                    <div className="p-2 mt-4">
                        <div className="mb-3">
                            <Label
                                htmlFor="forgotPasswordEmail"
                                className="form-label"
                            >
                                Email
                            </Label>
                            <Input
                                id="forgotPasswordEmail"
                                className="form-control"
                                placeholder="Enter email"
                                type="email"
                                value={forgotPasswordEmail}
                                onChange={(e) =>
                                    setForgotPasswordEmail(e.target.value)
                                }
                                disabled={isSendOtpLoading}
                            />
                        </div>
                        <div className="mt-4">
                            <Button
                                color="primary"
                                className="w-100"
                                onClick={handleSendOTP}
                                disabled={isSendOtpLoading}
                            >
                                {isSendOtpLoading ? (
                                    <>
                                        <output
                                            className="spinner-border spinner-border-sm me-2"
                                            aria-hidden="true"
                                        ></output>
                                        Sending...
                                    </>
                                ) : (
                                    "Send OTP"
                                )}
                            </Button>
                        </div>
                        <div className="mt-3 text-center">
                            <p className="mb-0">
                                <button
                                    type="button"
                                    className="btn btn-link fw-medium text-primary p-0 border-0 align-baseline text-decoration-none"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        handleBackToLogin();
                                    }}
                                    disabled={isSendOtpLoading}
                                >
                                    Back to Login
                                </button>
                            </p>
                        </div>
                    </div>
                </>
            );
        case 2: // OTP verification
            return (
                <>
                    <div className="text-center">
                        <h2
                            className="mobile-heading"
                            style={{ color: "#0d6efd", fontWeight: "700" }}
                        >
                            VERIFY OTP
                        </h2>
                        <p className="text-muted">
                            Enter the OTP sent to your email
                        </p>
                    </div>
                    <div className="p-2 mt-4">
                        <div className="mb-3">
                            <Label htmlFor="otp" className="form-label">
                                OTP
                            </Label>
                            <Input
                                id="otp"
                                className="form-control"
                                placeholder="Enter 6-digit OTP"
                                type="text"
                                maxLength={6}
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                disabled={isVerifyOtpLoading}
                            />
                            {otpCountdown > 0 && (
                                <small className="text-muted">
                                    You can resend OTP in{" "}
                                    {formatTime(otpCountdown)}
                                </small>
                            )}
                        </div>
                        <div className="mt-4">
                            <Button
                                color="primary"
                                className="w-100"
                                onClick={handleVerifyOTP}
                                disabled={isVerifyOtpLoading}
                            >
                                {isVerifyOtpLoading ? (
                                    <>
                                        <output
                                            className="spinner-border spinner-border-sm me-2"
                                            aria-hidden="true"
                                        ></output>
                                        Verifying...
                                    </>
                                ) : (
                                    "Verify OTP"
                                )}
                            </Button>
                        </div>
                        <div className="mt-3 d-flex justify-content-between">
                            <p className="mb-0">
                                <button
                                    type="button"
                                    className="btn btn-link fw-medium text-primary p-0 border-0 align-baseline text-decoration-none"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setForgotPasswordStep(1);
                                    }}
                                    disabled={isVerifyOtpLoading}
                                >
                                    Back
                                </button>
                            </p>
                            <p className="mb-0">
                                <button
                                    type="button"
                                    className={`btn btn-link fw-medium p-0 border-0 align-baseline text-decoration-none ${otpResendDisabled ||
                                        isResendOtpLoading
                                        ? "text-muted"
                                        : "text-primary"
                                        }`}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        if (
                                            !otpResendDisabled &&
                                            !isResendOtpLoading
                                        ) {
                                            handleResendOTP();
                                        }
                                    }}
                                    style={{
                                        cursor:
                                            otpResendDisabled ||
                                                isResendOtpLoading
                                                ? "default"
                                                : "pointer",
                                    }}
                                    disabled={otpResendDisabled || isResendOtpLoading}
                                >
                                    {isResendOtpLoading ? (
                                        <>
                                            <output
                                                className="spinner-border spinner-border-sm me-2"
                                                aria-hidden="true"
                                            ></output>
                                            Resending...
                                        </>
                                    ) : (
                                        "Resend OTP"
                                    )}
                                </button>
                            </p>
                        </div>
                    </div>
                </>
            );
        case 3: // Reset password
            return (
                <>
                    <div className="text-center">
                        <h2
                            className="mobile-heading"
                            style={{ color: "#0d6efd", fontWeight: "700" }}
                        >
                            RESET PASSWORD
                        </h2>
                        <p className="text-muted">
                            Enter your new password
                        </p>
                    </div>
                    <div className="p-2 mt-4">
                        <div className="mb-3">
                            <Label
                                htmlFor="newPassword"
                                className="form-label"
                            >
                                New Password
                            </Label>
                            <Input
                                id="newPassword"
                                className="form-control"
                                placeholder="Enter new password"
                                type="password"
                                value={newPassword}
                                onChange={(e) =>
                                    setNewPassword(e.target.value)
                                }
                                disabled={isResetPasswordLoading}
                            />
                        </div>
                        <div className="mb-3">
                            <Label
                                htmlFor="confirmPassword"
                                className="form-label"
                            >
                                Confirm Password
                            </Label>
                            <Input
                                id="confirmPassword"
                                className="form-control"
                                placeholder="Confirm new password"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) =>
                                    setConfirmPassword(e.target.value)
                                }
                                disabled={isResetPasswordLoading}
                            />
                        </div>
                        <div className="mt-4">
                            <Button
                                color="primary"
                                className="w-100"
                                onClick={handleResetPassword}
                                disabled={isResetPasswordLoading}
                            >
                                {isResetPasswordLoading ? (
                                    <>
                                        <output
                                            className="spinner-border spinner-border-sm me-2"
                                            aria-hidden="true"
                                        ></output>
                                        Resetting...
                                    </>
                                ) : (
                                    "Reset Password"
                                )}
                            </Button>
                        </div>
                    </div>
                </>
            );
        default:
            return null;
    }
};

ForgotPasswordForm.propTypes = {
    forgotPasswordStep: PropTypes.number.isRequired,
    setForgotPasswordStep: PropTypes.func.isRequired,
    forgotPasswordEmail: PropTypes.string.isRequired,
    setForgotPasswordEmail: PropTypes.func.isRequired,
    isSendOtpLoading: PropTypes.bool.isRequired,
    handleSendOTP: PropTypes.func.isRequired,
    handleBackToLogin: PropTypes.func.isRequired,
    otp: PropTypes.string.isRequired,
    setOtp: PropTypes.func.isRequired,
    isVerifyOtpLoading: PropTypes.bool.isRequired,
    otpCountdown: PropTypes.number.isRequired,
    handleVerifyOTP: PropTypes.func.isRequired,
    otpResendDisabled: PropTypes.bool.isRequired,
    isResendOtpLoading: PropTypes.bool.isRequired,
    handleResendOTP: PropTypes.func.isRequired,
    newPassword: PropTypes.string.isRequired,
    setNewPassword: PropTypes.func.isRequired,
    confirmPassword: PropTypes.string.isRequired,
    setConfirmPassword: PropTypes.func.isRequired,
    isResetPasswordLoading: PropTypes.bool.isRequired,
    handleResetPassword: PropTypes.func.isRequired,
};

const getLoginErrorMessage = (status, data) => {
    if (status === 423) {
        return data.message || "Your account is locked due to multiple failed login attempts.";
    }
    if (status === 401) {
        const remaining = data.attemptsRemaining;
        if (remaining === undefined) {
            return data.message || "Invalid credentials";
        } else {
            if (remaining === 0) {
                return "Your account has been locked due to too many failed attempts.";
            }
            return `Invalid credentials. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`;
        }
    }
    return null;
};

const validate = (values, setErrEmail, setErrPassword) => {
    const errors = {};
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (values.email) {
        if (regex.test(values.email)) {
            setErrEmail(false);
        } else {
            errors.email = "Invalid Email address!";
            setErrEmail(true);
        }
    } else {
        errors.email = "Email is required!";
        setErrEmail(true);
    }
    if (values.password) {
        setErrPassword(false);
    } else {
        errors.password = "Password is required!";
        setErrPassword(true);
    }
    return errors;
};

const handleLoginError = (err, updateFromResponse) => {
    if (err?.response) {
        const { status, data } = err.response;
        if (status === 423) {
            updateFromResponse(data);
            toast.error(
                data.message ||
                "Your account is locked due to multiple failed login attempts."
            );
        } else if (status === 401) {
            updateFromResponse(data);
            const remaining = data.attemptsRemaining;
            if (remaining === undefined) {
                toast.error(data.message || "Invalid credentials");
            } else {
                toast.error(
                    `Invalid credentials. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`
                );
            }
        } else {
            toast.error(data.message || "Authentication failed!");
        }
    } else {
        toast.error(err.message || "Authentication failed!");
    }
};

const resetForgotPasswordState = (
    setForgotPasswordMode,
    setForgotPasswordStep,
    setForgotPasswordEmail,
    setOtp,
    setNewPassword,
    setConfirmPassword
) => {
    setForgotPasswordMode(false);
    setForgotPasswordStep(1);
    setForgotPasswordEmail("");
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
};

const performSendOTP = (
    forgotPasswordEmail,
    setIsSendOtpLoading,
    setForgotPasswordStep,
    setOtpResendDisabled,
    setOtpCountdown
) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!forgotPasswordEmail || !regex.test(forgotPasswordEmail)) {
        toast.error("Please enter a valid email address");
        return;
    }

    setIsSendOtpLoading(true);
    sendOtp({
        email: forgotPasswordEmail,
    })
        .then((res) => {
            setIsSendOtpLoading(false);
            if (res.data.isOk) {
                toast.success("OTP sent to your email");
                setForgotPasswordStep(2);
                setOtpResendDisabled(true);
                setOtpCountdown(60);
            } else {
                toast.error(res.data.message || "Failed to send OTP");
                if (res.data.remainingTime) {
                    setOtpResendDisabled(true);
                    setOtpCountdown(res.data.remainingTime);
                }
            }
        })
        .catch((err) => {
            setIsSendOtpLoading(false);
            if (
                err?.response?.status === 429 &&
                err?.response?.data?.remainingTime
            ) {
                toast.error(
                    err.message || "Please wait before requesting a new OTP"
                );
                setOtpResendDisabled(true);
                setOtpCountdown(err?.response?.data?.remainingTime);
            } else {
                toast.error(
                    err?.response?.data?.message ||
                    err.message ||
                    "Failed to send OTP"
                );
            }
        });
};

const performResendOTP = (
    forgotPasswordEmail,
    otpResendDisabled,
    setIsResendOtpLoading,
    setOtpResendDisabled,
    setOtpCountdown
) => {
    if (otpResendDisabled) return;

    setIsResendOtpLoading(true);
    sendOtp({
        email: forgotPasswordEmail,
    })
        .then((res) => {
            setIsResendOtpLoading(false);
            if (res.data.isOk) {
                toast.success("OTP resent to your email");
                setOtpResendDisabled(true);
                setOtpCountdown(60);
            } else {
                toast.error(res.data.message || "Failed to resend OTP");
                if (res.data.remainingTime) {
                    setOtpResendDisabled(true);
                    setOtpCountdown(res.data.remainingTime);
                }
            }
        })
        .catch((err) => {
            setIsResendOtpLoading(false);
            if (
                err?.response?.status === 429 &&
                err?.response?.data?.remainingTime
            ) {
                toast.error(
                    err.message || "Please wait before requesting a new OTP"
                );
                setOtpResendDisabled(true);
                setOtpCountdown(err?.response?.data?.remainingTime);
            } else {
                toast.error(err.message || "Failed to resend OTP");
            }
        });
};

const performVerifyOTP = (
    forgotPasswordEmail,
    otp,
    setIsVerifyOtpLoading,
    setForgotPasswordStep
) => {
    if (otp?.length !== 6) {
        toast.error("Please enter a valid 6-digit OTP");
        return;
    }

    setIsVerifyOtpLoading(true);
    verifyOtp({
        email: forgotPasswordEmail,
        otp: otp,
    })
        .then((res) => {
            setIsVerifyOtpLoading(false);
            if (res.data.isOk) {
                toast.success("OTP verified successfully");
                setForgotPasswordStep(3);
            } else {
                toast.error(res.data.message || "Invalid OTP");
            }
        })
        .catch((err) => {
            setIsVerifyOtpLoading(false);
            toast.error(err.message || "Failed to verify OTP");
        });
};

const performResetPassword = ({
    forgotPasswordEmail,
    otp,
    newPassword,
    confirmPassword,
    setIsResetPasswordLoading,
    setForgotPasswordMode,
    setForgotPasswordStep,
    setForgotPasswordEmail,
    setOtp,
    setNewPassword,
    setConfirmPassword,
}) => {
    if (newPassword.length < 6) {
        toast.error("Password should be at least 6 characters long");
        return;
    }

    if (newPassword !== confirmPassword) {
        toast.error("Passwords don't match");
        return;
    }

    setIsResetPasswordLoading(true);
    resetPassword({
        email: forgotPasswordEmail,
        otp: otp,
        newPassword: newPassword,
    })
        .then((res) => {
            setIsResetPasswordLoading(false);
            if (res.data.isOk) {
                toast.success("Password reset successfully");
                setForgotPasswordMode(false);
                setForgotPasswordStep(1);
                setForgotPasswordEmail("");
                setOtp("");
                setNewPassword("");
                setConfirmPassword("");
            } else {
                toast.error(res.message || "Failed to reset password");
            }
        })
        .catch((err) => {
            setIsResetPasswordLoading(false);
            toast.error(err.message || "Failed to reset password");
        });
};

const handleLoginResponse = (res, updateFromResponse, setAdminData, setRole, fetchMenus, navigate, setStringPermissions, setArambhRoleKey) => {
    const status = res.status || res.data?.status;

    if (status === 423 || status === 401) {
        updateFromResponse(res.data);
        const errorMsg = getLoginErrorMessage(status, res.data);
        if (errorMsg) {
            toast.error(errorMsg);
        }
        return;
    }

    if (res.data.isOk) {
        const rawRole = typeof res.data.role === "string"
            ? res.data.role.toUpperCase().trim()
            : (res.data.data?.role ? res.data.data.role.toUpperCase().trim() : "");
        const sanitizedRole = (rawRole === "ADMIN" || rawRole === "EMPLOYEE") ? rawRole : "";
        localStorage.setItem("role", sanitizedRole);
        if (setRole) setRole(sanitizedRole);
        if (setStringPermissions) {
            setStringPermissions(Array.isArray(res.data.permissions) ? res.data.permissions : []);
        }
        if (setArambhRoleKey) {
            setArambhRoleKey(res.data.arambhRoleKey || null);
        }
        setAdminData({ ...res.data.data });
        fetchMenus();
        navigate("/dashboard", { replace: true });
    } else {
        toast.error(res.data.message || "Authentication failed!");
    }
};

const executeLogin = async ({
    values,
    locationConsent,
    ipConsent,
    updateFromResponse,
    setAdminData,
    setRole,
    fetchMenus,
    navigate,
    setIsLoginLoading,
    fetchLoginStatus,
    setStringPermissions,
    setArambhRoleKey,
}) => {
    setIsLoginLoading(true);
    try {
        const userLocation = await getUserLocation();
        const securityHeaders = {
            'X-Client-Latitude': userLocation.latitude?.toString() || '',
            'X-Client-Longitude': userLocation.longitude?.toString() || '',
        };

        const res = await loginCompany({
            email: values.email,
            password: values.password,
            locationConsent: locationConsent,
            ipConsent: ipConsent,
            clientLatitude: userLocation.latitude,
            clientLongitude: userLocation.longitude,
        }, securityHeaders);

        handleLoginResponse(res, updateFromResponse, setAdminData, setRole, fetchMenus, navigate, setStringPermissions, setArambhRoleKey);
    } catch (error) {
        handleLoginError(error, updateFromResponse);
    } finally {
        setIsLoginLoading(false);
        fetchLoginStatus();
    }
};

const performLogin = async (e, {
    values,
    setErrEmail,
    setErrPassword,
    setIsSubmit,
    setFormErrors,
    locationConsent,
    ipConsent,
    isLocked,
    formattedTime,
    updateFromResponse,
    setAdminData,
    setRole,
    fetchMenus,
    navigate,
    setIsLoginLoading,
    fetchLoginStatus,
    setStringPermissions,
    setArambhRoleKey,
}) => {
    if (e) {
        e.preventDefault();
    }

    setIsSubmit(true);
    const errors = validate(values, setErrEmail, setErrPassword);
    setFormErrors(errors);

    if (Object.keys(errors).length > 0) return;
    if (!locationConsent || !ipConsent) return;

    const confirmMessage = `By proceeding, you confirm that you agree to share:

• Your IP Address - for security logging
• Your Location - for security verification

This information will be used to monitor and protect your account from unauthorized access.

Do you want to continue?`;

    if (!globalThis.confirm(confirmMessage)) {
        toast.info("Login cancelled. Please accept the sharing consent to continue.");
        return;
    }

    if (isLocked) {
        toast.error(`Your account is locked. Try again in ${formattedTime}`);
        return;
    }

    await executeLogin({
        values,
        locationConsent,
        ipConsent,
        updateFromResponse,
        setAdminData,
        setRole,
        fetchMenus,
        navigate,
        setIsLoginLoading,
        fetchLoginStatus,
        setStringPermissions,
        setArambhRoleKey,
    });
};

const Login = () => {
    const { fetchMenus } = useContext(MenuContext);
    const { setAdminData, setRole, setStringPermissions, setArambhRoleKey } = useContext(AuthContext);
    const navigate = useNavigate();

    const [publicCompany, setPublicCompany] = useState(null);

    void publicCompany;

    const loadBranding = (emailVal = "") => {
        getPublicCompanyDetails(emailVal)
            .then((res) => {
                if (res.data.isOk && res.data.data) {
                    setPublicCompany(res.data.data);
                    
                    // Update favicon dynamically on login page mount
                    if (res.data.data.favicon) {
                        const faviconUrl = `${config.api.API_URL}/${res.data.data.favicon.replace(/^\/+/, "")}`;
                        let link = document.querySelector("link[rel~='icon']");
                        if (!link) {
                            link = document.createElement("link");
                            link.rel = "icon";
                            document.getElementsByTagName("head")[0].appendChild(link);
                        }
                        link.href = faviconUrl;
                    }
                }
            })
            .catch((err) => {
                console.error("Failed to load public company details:", err);
            });
    };

    useEffect(() => {
        loadBranding("");
    }, []);
    const [values, setValues] = useState(initialState);
    const [formErrors, setFormErrors] = useState({});
    const [isSubmit, setIsSubmit] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [errEmail, setErrEmail] = useState(false);
    const [errPassword, setErrPassword] = useState(false);

    // Forgot password states
    const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
    const [forgotPasswordStep, setForgotPasswordStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
    const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    // Loading states
    const [isLoginLoading, setIsLoginLoading] = useState(false);
    const [isSendOtpLoading, setIsSendOtpLoading] = useState(false);
    const [isResendOtpLoading, setIsResendOtpLoading] = useState(false);
    const [isVerifyOtpLoading, setIsVerifyOtpLoading] = useState(false);
    const [isResetPasswordLoading, setIsResetPasswordLoading] = useState(false);

    // Countdown timer for OTP resend
    const [otpCountdown, setOtpCountdown] = useState(0);
    const [otpResendDisabled, setOtpResendDisabled] = useState(false);

    // Consent checkboxes for location and IP tracking
    const [locationConsent, setLocationConsent] = useState(false);
    const [ipConsent, setIpConsent] = useState(false);

    // Login attempt limitation hook
    const {
        isLocked,
        attemptsRemaining,
        formattedTime,
        updateFromResponse,
        fetchStatus: fetchLoginStatus,
    } = useLoginAttempt(values.email);

    // Timer interval ref
    const timerRef = React.useRef(null);

    // Handle timer effect
    React.useEffect(() => {
        if (otpCountdown > 0) {
            timerRef.current = setInterval(() => {
                setOtpCountdown((prev) => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current);
                        setOtpResendDisabled(false);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [otpCountdown]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setValues({ ...values, [name]: value });

        if (name === "email") {
            const emailVal = value.trim();
            if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
                loadBranding(emailVal);
            } else if (emailVal === "") {
                loadBranding("");
            }
        }
    };

    const login = async (e) => {
        await performLogin(e, {
            values,
            setErrEmail,
            setErrPassword,
            setIsSubmit,
            setFormErrors,
            locationConsent,
            ipConsent,
            isLocked,
            formattedTime,
            updateFromResponse,
            setAdminData,
            setRole,
            fetchMenus,
            navigate,
            setIsLoginLoading,
            fetchLoginStatus,
            setStringPermissions,
            setArambhRoleKey,
        });
    };

    // Handle forgot password email submission with countdown
    const handleSendOTP = () => {
        performSendOTP(
            forgotPasswordEmail,
            setIsSendOtpLoading,
            setForgotPasswordStep,
            setOtpResendDisabled,
            setOtpCountdown
        );
    };

    // Handle OTP resend
    const handleResendOTP = () => {
        performResendOTP(
            forgotPasswordEmail,
            otpResendDisabled,
            setIsResendOtpLoading,
            setOtpResendDisabled,
            setOtpCountdown
        );
    };

    // Handle OTP verification
    const handleVerifyOTP = () => {
        performVerifyOTP(
            forgotPasswordEmail,
            otp,
            setIsVerifyOtpLoading,
            setForgotPasswordStep
        );
    };

    // Handle password reset
    const handleResetPassword = () => {
        performResetPassword({
            forgotPasswordEmail,
            otp,
            newPassword,
            confirmPassword,
            setIsResetPasswordLoading,
            setForgotPasswordMode,
            setForgotPasswordStep,
            setForgotPasswordEmail,
            setOtp,
            setNewPassword,
            setConfirmPassword,
        });
    };

    // Handle back to login
    const handleBackToLogin = () => {
        resetForgotPasswordState(
            setForgotPasswordMode,
            setForgotPasswordStep,
            setForgotPasswordEmail,
            setOtp,
            setNewPassword,
            setConfirmPassword
        );
    };

    document.title = `Sign in | Arambh Sports Arena`;



    return (
        <>
            <style>
                {`
                    @media (max-width: 767px) {
                        .auth-wrapper {
                            flex-direction: column;
                            overflow-y: auto;
                        }
                        .left-panel {
                            display: none !important;
                        }
                        .right-panel {
                            width: 100% !important;
                            min-height: 100vh !important;
                            height: auto !important;
                        }
                        .mobile-logo {
                            width: 80px !important;
                        }
                        .mobile-heading {
                            font-size: 1.5rem !important;
                        }
                        .mobile-card-body {
                            padding: 2rem 1.5rem !important;
                        }
                    }
                    @media (min-width: 768px) and (max-width: 991px) {
                        .left-panel {
                            width: 50% !important;
                        }
                        .right-panel {
                            width: 50% !important;
                        }
                    }
                    .arambh-login-input {
                        border: 1.5px solid #d5e6db !important;
                        border-radius: 10px !important;
                        background: #fff !important;
                        box-shadow: none !important;
                    }
                    .arambh-login-input:focus {
                        border-color: #3eb474 !important;
                        box-shadow: 0 0 0 3px rgba(62, 180, 116, 0.18) !important;
                    }
                    .arambh-login-input:-webkit-autofill,
                    .arambh-login-input:-webkit-autofill:hover,
                    .arambh-login-input:-webkit-autofill:focus {
                        -webkit-box-shadow: 0 0 0 1000px #fff inset !important;
                        -webkit-text-fill-color: #111 !important;
                        caret-color: #111;
                        transition: background-color 9999s ease-in-out 0s;
                    }
                    .arambh-login-btn {
                        background: linear-gradient(180deg, #2bb86a, #1f9d55) !important;
                        border: none !important;
                        color: #fff !important;
                        border-radius: 12px !important;
                        font-weight: 700 !important;
                        letter-spacing: 0.01em;
                        padding: 0.8rem 1rem !important;
                        box-shadow: 0 10px 22px rgba(31, 157, 85, 0.28);
                    }
                    .arambh-login-btn:hover:not(:disabled),
                    .arambh-login-btn:focus:not(:disabled) {
                        background: linear-gradient(180deg, #249e5b, #18864a) !important;
                        color: #fff !important;
                        box-shadow: 0 10px 24px rgba(62, 180, 116, 0.35);
                    }
                    .arambh-login-btn:disabled {
                        opacity: 0.65;
                    }
                    .form-check-input:checked {
                        background-color: #1f9d55 !important;
                        border-color: #1f9d55 !important;
                    }
                    .login-hero {
                        position: relative;
                        width: 50%;
                        min-height: 100vh;
                        overflow: hidden;
                        color: #fff;
                        background: #07150F url(${loginHeroBg}) center / cover no-repeat;
                    }
                    .login-hero-content {
                        position: relative;
                        z-index: 1;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        padding: 2.5rem;
                    }
                    .login-hero-logo {
                        width: min(420px, 78%);
                        height: auto;
                        display: block;
                    }
                    .login-hero-foot {
                        position: absolute;
                        left: 0;
                        right: 0;
                        bottom: 2rem;
                        z-index: 1;
                        text-align: center;
                        letter-spacing: 0.22em;
                        font-size: 0.72rem;
                        font-weight: 600;
                        color: rgba(255, 255, 255, 0.72);
                    }
                    .login-stage {
                        position: relative;
                        flex: 1;
                        min-height: 100vh;
                        overflow: auto;
                        background: #f3faf4;
                    }
                    .login-stage::before,
                    .login-stage::after {
                        content: "";
                        position: absolute;
                        border-radius: 50%;
                        border: 1px solid rgba(31, 157, 85, 0.12);
                        pointer-events: none;
                    }
                    .login-stage::before {
                        width: 280px;
                        height: 280px;
                        top: -80px;
                        right: -70px;
                    }
                    .login-stage::after {
                        width: 220px;
                        height: 220px;
                        left: -80px;
                        bottom: -40px;
                    }
                    .login-card {
                        position: relative;
                        z-index: 1;
                        width: min(440px, calc(100% - 2rem));
                        margin: 2rem auto;
                        background: #fff;
                        border: none !important;
                        border-radius: 28px !important;
                        box-shadow: 0 18px 50px rgba(16, 55, 32, 0.08);
                    }
                    .login-title {
                        margin: 0.35rem 0 0.25rem;
                        font-size: 1.85rem;
                        font-weight: 700;
                        color: #1a1a1a;
                        letter-spacing: -0.03em;
                    }
                    .login-subtitle {
                        margin: 0 0 1.5rem;
                        color: #7b8794;
                        font-size: 0.95rem;
                    }
                    .login-field-control {
                        position: relative;
                    }
                    .login-field-control > i {
                        position: absolute;
                        left: 14px;
                        top: 50%;
                        transform: translateY(-50%);
                        color: #9aa5b1;
                        font-size: 1.05rem;
                        z-index: 2;
                        pointer-events: none;
                    }
                    .login-field-control .arambh-login-input {
                        height: 48px;
                        padding-left: 42px !important;
                        border-radius: 12px !important;
                        border-color: #e4ebe6 !important;
                    }
                    .login-forgot {
                        border: 0;
                        background: transparent;
                        color: #1f9d55;
                        font-size: 0.86rem;
                        font-weight: 600;
                        padding: 0;
                    }
                    .login-consent {
                        background: #f3faf5;
                        border: 1px solid #d7efe0;
                        border-radius: 14px;
                    }
                    .login-secure {
                        margin-top: 1.25rem;
                        text-align: center;
                        color: #8b97a3;
                        font-size: 0.82rem;
                    }
                `}
            </style>
            <div className="auth-wrapper d-flex" style={{ minHeight: "100vh", background: "#f3faf4" }}>
                <div className="login-hero left-panel d-none d-lg-flex align-items-center justify-content-center">
                    <div className="login-hero-content">
                        <img
                            className="login-hero-logo"
                            src={loginLeftLogo}
                            alt="Aarambh Sports Arena"
                        />
                    </div>
                    <div className="login-hero-foot">SPORTS • COMMUNITY • PERFORMANCE</div>
                </div>
                <div className="login-stage right-panel d-flex align-items-center justify-content-center">
                    <Container>
                        <Row className="justify-content-center">
                            <Col xs={12}>
                                <Card className="login-card">
                                    <CardBody className="p-4 p-md-5 mobile-card-body">
                                         {forgotPasswordMode ? (
                                             <ForgotPasswordForm
                                                 forgotPasswordStep={forgotPasswordStep}
                                                 setForgotPasswordStep={setForgotPasswordStep}
                                                 forgotPasswordEmail={forgotPasswordEmail}
                                                 setForgotPasswordEmail={setForgotPasswordEmail}
                                                 isSendOtpLoading={isSendOtpLoading}
                                                 handleSendOTP={handleSendOTP}
                                                 handleBackToLogin={handleBackToLogin}
                                                 otp={otp}
                                                 setOtp={setOtp}
                                                 isVerifyOtpLoading={isVerifyOtpLoading}
                                                 otpCountdown={otpCountdown}
                                                 handleVerifyOTP={handleVerifyOTP}
                                                 otpResendDisabled={otpResendDisabled}
                                                 isResendOtpLoading={isResendOtpLoading}
                                                 handleResendOTP={handleResendOTP}
                                                 newPassword={newPassword}
                                                 setNewPassword={setNewPassword}
                                                 confirmPassword={confirmPassword}
                                                 setConfirmPassword={setConfirmPassword}
                                                 isResetPasswordLoading={isResetPasswordLoading}
                                                 handleResetPassword={handleResetPassword}
                                             />
                                         ) : (
                                            <>
                                                <div className="text-center">
                                                    <img
                                                        src={logoHorizontal}
                                                        alt="Arambh Sports Arena"
                                                        style={{
                                                            width: "100%",
                                                            maxWidth: 210,
                                                            height: "auto",
                                                            objectFit: "contain",
                                                        }}
                                                    />
                                                    <h2 className="login-title">Welcome back</h2>
                                                    <p className="login-subtitle">Sign in to your club admin panel</p>
                                                </div>
                                                <Form>
                                                    {/* Account Lock Warning */}
                                                    {isLocked && (
                                                        <div
                                                            style={{
                                                                backgroundColor: "#ff7675",
                                                                color: "white",
                                                                padding: "12px 16px",
                                                                borderRadius: "8px",
                                                                marginBottom: "16px",
                                                                borderLeft: "4px solid #d63031",
                                                            }}
                                                        >
                                                            <div style={{ fontWeight: "600", marginBottom: "4px" }}>
                                                                🔒 Account Locked
                                                            </div>
                                                            <div style={{ fontSize: "0.9rem" }}>
                                                                Your account is locked due to multiple failed login attempts.
                                                                {formattedTime && (
                                                                    <span>
                                                                        {" "}Try again in <strong>{formattedTime}</strong>
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div style={{ marginTop: "8px", fontSize: "0.85rem" }}>
                                                                <a
                                                                    href="#forgot"
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        setForgotPasswordMode(true);
                                                                    }}
                                                                    style={{
                                                                        color: "white",
                                                                        textDecoration: "underline",
                                                                    }}
                                                                >
                                                                    Forgot Password?
                                                                </a>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Low Attempts Warning */}
                                                    {!isLocked && attemptsRemaining > 0 && attemptsRemaining < 3 && (
                                                        <div
                                                            style={{
                                                                backgroundColor: "#ffeaa7",
                                                                color: "#856404",
                                                                padding: "12px 16px",
                                                                borderRadius: "8px",
                                                                marginBottom: "16px",
                                                                borderLeft: "4px solid #fdcb6e",
                                                            }}
                                                        >
                                                            <div style={{ fontWeight: "600" }}>
                                                                ⚠️ Warning: {attemptsRemaining} attempt{attemptsRemaining === 1 ? "" : "s"} remaining
                                                            </div>
                                                            <div style={{ fontSize: "0.85rem", marginTop: "4px" }}>
                                                                Your account will be locked after {attemptsRemaining} more failed {attemptsRemaining === 1 ? "attempt" : "attempts"}.
                                                            </div>
                                                        </div>
                                                    )}
                                                    <div className="mt-2">
                                                        <div className="mb-3">
                                                            <Label
                                                                htmlFor="email"
                                                                className="form-label"
                                                                style={{
                                                                    fontWeight: "600",
                                                                    color: "#243042",
                                                                }}
                                                            >
                                                                Email
                                                            </Label>
                                                            <div className="login-field-control">
                                                                <i className="ri-mail-line" />
                                                                <Input
                                                                    id="email"
                                                                    onSubmit={login}
                                                                    name="email"
                                                                    className={
                                                                        errEmail &&
                                                                            isSubmit
                                                                            ? "form-control is-invalid arambh-login-input"
                                                                            : "form-control arambh-login-input"
                                                                    }
                                                                    placeholder="Enter your email"
                                                                    type="email"
                                                                    onChange={
                                                                        handleChange
                                                                    }
                                                                    value={
                                                                        values.email
                                                                    }
                                                                />
                                                            </div>
                                                            {isSubmit &&
                                                                formErrors.email && (
                                                                    <p className="text-danger">
                                                                        {
                                                                            formErrors.email
                                                                        }
                                                                    </p>
                                                                )}
                                                        </div>
                                                        <div className="mb-3">
                                                            <Label
                                                                className="form-label"
                                                                htmlFor="password-input"
                                                                style={{
                                                                    fontWeight: "600",
                                                                    color: "#243042",
                                                                }}
                                                            >
                                                                Password
                                                            </Label>
                                                            <div className="login-field-control">
                                                                <i className="ri-lock-2-line" />
                                                                <Input
                                                                    id="password-input"
                                                                    onSubmit={
                                                                        login
                                                                    }
                                                                    name="password"
                                                                    type={
                                                                        showPassword
                                                                            ? "text"
                                                                            : "password"
                                                                    }
                                                                    className={
                                                                        errPassword &&
                                                                            isSubmit
                                                                            ? "form-control is-invalid arambh-login-input pe-5"
                                                                            : "form-control arambh-login-input pe-5"
                                                                    }
                                                                    placeholder="Enter your password"
                                                                    onChange={
                                                                        handleChange
                                                                    }
                                                                    value={
                                                                        values.password
                                                                    }
                                                                />
                                                                <button
                                                                    className="btn btn-link position-absolute end-0 top-0 text-decoration-none text-muted"
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setShowPassword(
                                                                            !showPassword
                                                                        )
                                                                    }
                                                                    style={{ zIndex: 2 }}
                                                                >
                                                                    {showPassword ? (
                                                                        <i className="ri-eye-off-line align-middle"></i>
                                                                    ) : (
                                                                        <i className="ri-eye-line align-middle"></i>
                                                                    )}
                                                                </button>
                                                            </div>
                                                            <div className="text-end mt-2">
                                                                <button
                                                                    type="button"
                                                                    className="login-forgot"
                                                                    onClick={() => setForgotPasswordMode(true)}
                                                                >
                                                                    Forgot password?
                                                                </button>
                                                            </div>
                                                            {isSubmit &&
                                                                formErrors.password && (
                                                                    <p className="text-danger">
                                                                        {formErrors.password}
                                                                    </p>
                                                                )}
                                                           
                                                        </div>

                                                        {/* Consent Checkboxes */}
                                                        <div className="login-consent mb-3 p-3">
                                                            <p
                                                                className="mb-2"
                                                                style={{
                                                                    fontSize: "0.92rem",
                                                                    color: "#3d4a42",
                                                                    fontWeight: "700"
                                                                }}
                                                            >
                                                                <i className="ri-shield-check-line me-1" style={{ color: "#1f9d55" }}></i> Security Consent Required
                                                            </p>
                                                            <div className="form-check mb-2">
                                                                <Input
                                                                    type="checkbox"
                                                                    className="form-check-input"
                                                                    id="locationConsent"
                                                                    checked={locationConsent}
                                                                    onChange={(e) => setLocationConsent(e.target.checked)}
                                                                    style={{
                                                                        cursor: "pointer",
                                                                        width: "18px",
                                                                        height: "18px"
                                                                    }}
                                                                />
                                                                <Label
                                                                    className="form-check-label"
                                                                    htmlFor="locationConsent"
                                                                    style={{
                                                                        fontSize: "0.85rem",
                                                                        cursor: "pointer",
                                                                        marginLeft: "4px"
                                                                    }}
                                                                >
                                                                    I consent to location tracking for security purposes.
                                                                    {isSubmit && !locationConsent && (
                                                                        <span className="text-danger ms-1" style={{ fontSize: "0.8rem" }}>*Required</span>
                                                                    )}
                                                                </Label>
                                                            </div>
                                                            <div className="form-check">
                                                                <Input
                                                                    type="checkbox"
                                                                    className="form-check-input"
                                                                    id="ipConsent"
                                                                    checked={ipConsent}
                                                                    onChange={(e) => setIpConsent(e.target.checked)}
                                                                    style={{
                                                                        cursor: "pointer",
                                                                        width: "18px",
                                                                        height: "18px"
                                                                    }}
                                                                />
                                                                <Label
                                                                    className="form-check-label"
                                                                    htmlFor="ipConsent"
                                                                    style={{
                                                                        fontSize: "0.85rem",
                                                                        cursor: "pointer",
                                                                        marginLeft: "4px"
                                                                    }}
                                                                >
                                                                    I consent to IP address tracking for security purposes.
                                                                    {isSubmit && !ipConsent && (
                                                                        <span className="text-danger ms-1" style={{ fontSize: "0.8rem" }}>*Required</span>
                                                                    )}
                                                                </Label>
                                                            </div>
                                                        </div>
                                                        <div className="mt-4">
                                                            <Button
                                                                type="button"
                                                                className="w-100 arambh-login-btn"
                                                                onClick={login}
                                                                disabled={
                                                                    isLoginLoading || isLocked
                                                                }
                                                            >
                                                                {isLoginLoading ? (
                                                                    <>
                                                                        <output
                                                                            className="spinner-border spinner-border-sm me-2"
                                                                            aria-hidden="true"
                                                                        ></output>
                                                                        Logging
                                                                        in...
                                                                    </>
                                                                ) : (
                                                                    <>Login <i className="ri-arrow-right-line align-middle ms-1"></i></>
                                                                )}
                                                            </Button>
                                                        </div>
                                                        <p className="login-secure mb-0">
                                                            <i className="ri-lock-2-line me-1"></i>
                                                            Secure access • Aarambh Sports Arena
                                                        </p>
                                                    </div>
                                                </Form>
                                            </>
                                         )}
                                    </CardBody>
                                </Card>
                            </Col>
                        </Row>
                    </Container>
                </div>
            </div>
        </>
    );
};

export default withRouter(Login);
