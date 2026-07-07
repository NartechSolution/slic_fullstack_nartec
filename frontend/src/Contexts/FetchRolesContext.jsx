import React, { createContext, useEffect, useState } from "react";
import newRequest from "../utils/userRequest.jsx";
export const RolesContext = createContext();

const RolesProvider = ({ children }) => {
  const [userRoles, setUserRoles] = useState([]);

  //new code On mount, check if roles are stored in sessionStorage
  useEffect(() => {
    const storedRoles = localStorage.getItem('userRoles');
    if (storedRoles) {
      setUserRoles(JSON.parse(storedRoles));
    }
  }, []);

  const fetchRoles = (userID) => {
    // console.log(userID)
    newRequest.post("/roles/v1/get-roles", {
      userLoginID: userID,
  }).then((response) => {
      setUserRoles(response.data.data);
      localStorage.setItem('userRoles', JSON.stringify(response.data.data)); // Persist roles
      // console.log(response.data.data);
    })
    .catch((error) => {
      console.error("Error fetching permissions:", error);
    });
};

  return (
    <RolesContext.Provider
      value={{
        userRoles,
        fetchRoles,
      }}
    >
      {children}
    </RolesContext.Provider>
  );
};

export default RolesProvider;
