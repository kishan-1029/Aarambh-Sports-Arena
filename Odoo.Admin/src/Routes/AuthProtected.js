import React from "react";
import { Navigate, Route } from "react-router-dom";

const AuthProtected = (props) => {
    if (!localStorage.getItem("_id")) {
        return <Navigate to="/" />;
    }

    return <>{props.children}</>;
};

const AccessRoute = ({ component: Component, ...rest }) => {
    return (
        <Route
            {...rest}
            render={(props) => {
                return (
                    <>
                        {" "}
                        <Component {...props} />{" "}
                    </>
                );
            }}
        />
    );
};

export { AuthProtected, AccessRoute };
