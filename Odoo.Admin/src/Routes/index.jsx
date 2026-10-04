import React, { useContext } from 'react';
import { Routes, Route } from "react-router-dom";

//Layouts
import NonAuthLayout from "../Layouts/NonAuthLayout";
import VerticalLayout from "../Layouts/index";
import FullscreenLayout from "../Layouts/FullscreenLayout";

//routes
import { authProtectedRoutes, publicRoutes, fullscreenRoutes } from "./allRoutes";
import { AuthProtected } from './AuthProtected';
import { PermissionProtected } from './PermissionProtected';
import { AuthContext } from '../context/AuthContext';


const Index = () => {

    const { role, isSessionVerified } = useContext(AuthContext);
    const signedIn = isSessionVerified && Boolean(role);

    if (!isSessionVerified) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "100vh" }}>
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    return (
        <Routes>
            <Route>
                {!signedIn && publicRoutes.map((route) => (
                    <Route
                        path={route.path}
                        element={
                            <NonAuthLayout>
                                {route.component}
                            </NonAuthLayout>
                        }
                        key={route.path}
                        exact={true}
                    />
                ))}
            </Route>

            {signedIn && (
                <Route
                    element={
                        <AuthProtected>
                            <FullscreenLayout />
                        </AuthProtected>
                    }
                >
                    {fullscreenRoutes.map((route) => (
                        <Route
                            path={route.path}
                            element={
                                <PermissionProtected>
                                    {route.component}
                                </PermissionProtected>
                            }
                            key={route.path}
                            exact={true}
                        />
                    ))}
                </Route>
            )}

            {signedIn && (
                <Route
                    element={
                        <AuthProtected>
                            <VerticalLayout />
                        </AuthProtected>
                    }
                >
                    {authProtectedRoutes.map((route) => (
                        <Route
                            path={route.path}
                            element={
                                <PermissionProtected>
                                    {route.component}
                                </PermissionProtected>
                            }
                            key={route.path}
                            exact={true}
                        />
                    ))}
                </Route>
            )}
        </Routes>
    );
};

export default Index;
