import React, { useContext, useEffect, useState } from 'react';
import { Navigate, Route } from 'react-router-dom';
import { RolesContext } from './Contexts/FetchRolesContext';
import { toast } from 'react-toastify';

const ProtectedRoute = ({ children, requiredRoles }) => {
    // console.log('Required Roles:', requiredRoles);
    const { userRoles } = useContext(RolesContext);
    // console.log(userRoles);

    const [toastShown, setToastShown] = useState(false);

    const adminData = sessionStorage.getItem('slicUserData');
    // console.log('Admin Data:', adminData);

    useEffect(() => {
        const loginToastShown = localStorage.getItem('loginToastShown');

        // Check if admin data exists
        if (!adminData && !loginToastShown) {
            toast.error('Please log in to access this page');
            localStorage.setItem('loginToastShown', 'true');
            setToastShown(true);
        }
    }, [adminData]);

    if (!adminData) {
        return <Navigate to="/" />;
    }

    // Check if user has the required roles
    // const hasRequiredRole = userRoles.some(role => requiredRoles.includes(role.RoleName));
    
    const hasRequiredRole = userRoles.some(role => requiredRoles.includes(role.RoleName));
    // console.log(userRoles);

    // console.log(requiredRoles);
    // console.log(hasRequiredRole)
    // console.log(requiredRoles)
    if (userRoles && !hasRequiredRole) {
        const toastShownKey = `toastShown_${requiredRoles}`;
        if (!sessionStorage.getItem(toastShownKey)) {
            // console.log(`You don't have permission ${requiredRoles} to access this page`);
            toast.error(`You don't have permission to access this page`);
            sessionStorage.setItem(toastShownKey, 'true');
        }
        return <Navigate to="/gtin-management" />;
    }

    return children;
};

export default ProtectedRoute;
