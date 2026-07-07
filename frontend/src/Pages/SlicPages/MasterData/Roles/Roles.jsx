import React, { useContext, useEffect, useRef, useState } from "react";
import SideNav from "../../../../components/Sidebar/SideNav";
import { usersColumn } from "../../../../utils/datatablesource";
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle';
import DataTable from "../../../../components/Datatable/Datatable";
import RightDashboardHeader from "../../../../components/RightDashboardHeader/RightDashboardHeader";
import { toast } from "react-toastify";
import newRequest from "../../../../utils/userRequest";
import AssignRolesPopUp from "./AssignRolesPopUp";
import RemoveRolesPopUp from "./RemoveRolesPopUp";
import { useTranslation } from "react-i18next";

const Roles = () => {
  const { t } = useTranslation();
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const memberDataString = sessionStorage.getItem('slicUserData');
  const memberData = JSON.parse(memberDataString);
  // console.log(memberData)
  const hasFetchedRef = useRef(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await newRequest.get("/users/v1/all", {
        headers: {
          Authorization: `Bearer ${memberData?.data?.token}`,
        },
      });
      // console.log(response?.data?.data);
      setData(response?.data?.data || []);
    } catch (err) {
      // console.log(err);
      toast.error(err?.response?.data?.message || err?.response?.data?.error || "failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!hasFetchedRef.current) {
      fetchData();
      hasFetchedRef.current = true;
    }
  },[])


  const [isUpdatePopupVisible, setUpdatePopupVisibility] = useState(false);
  const handleShowUpdatePopup = (row) => {
    setUpdatePopupVisibility(true);
    // console.log(row)
    sessionStorage.setItem("updateUserData", JSON.stringify(row));
  };


  const [isRemoveAssignRolesPopupVisible, setRemoveAssignRolesPopupVisibility] = useState(false);
  const handleShowRemoveRolesPopup = (row) => {
    setRemoveAssignRolesPopupVisibility(true);
    // console.log(row)
    sessionStorage.setItem("updateUserData", JSON.stringify(row));
  };


  const handleRowClickInParent = (item) => {
    if (!item || item?.length === 0) {
      // setTableSelectedRows(item)
      // setFilteredData(data);
      return;
    }
  };


  return (
    <div>
      <SideNav>
        <div>
          <RightDashboardHeader title={t("Assign Roles to User")} />
        </div>

        <div className="h-auto w-full">
          <div className="h-auto w-full p-0 bg-white shadow-xl rounded-md pb-10">
            {/* <div
              className={`flex justify-start items-center flex-wrap gap-2 py-7 px-5`}
            >
              <Button
                variant="contained"
                onClick={handleShowCreatePopup}
                style={{ backgroundColor: "#CFDDE0", color: "#1D2F90" }}
                startIcon={<PiBarcodeDuotone />}
              >
                Add Users
              </Button>
            </div> */}

            <div style={{marginTop: '-15px'}}>
              <DataTable
                data={data}
                title={t("Assign Roles")}
                columnsName={usersColumn(t)}
                loading={isLoading}
                secondaryColor="secondary"
                uniqueId="customerListId"
                handleRowClickInParent={handleRowClickInParent}
                checkboxSelection="disabled"
                dropDownOptions={[
                  {
                    label: t("Assign Roles"),
                    icon: (
                      <AssignmentTurnedInIcon
                        fontSize="small"
                        color="action"
                        style={{ color: "rgb(37 99 235)" }}
                      />
                    ),
                    action: handleShowUpdatePopup,
                  },
                  {
                    label: t("Remove Roles"),
                    icon: (
                      <RemoveCircleIcon
                        fontSize="small"
                        color="action"
                        style={{ color: "rgb(37 99 235)" }}
                      />
                    ),
                    action: handleShowRemoveRolesPopup,
                  },
                ]}
              />
            </div>
          </div>

          {/* add Roles PopUp */}
          {isUpdatePopupVisible && (
            <AssignRolesPopUp
              isVisible={isUpdatePopupVisible}
              setVisibility={setUpdatePopupVisibility}
              refreshRolesData={fetchData}
            />
          )}

          {/* add Remove Assign Roles PopUp */}
          {isRemoveAssignRolesPopupVisible && (
            <RemoveRolesPopUp
              isVisible={isRemoveAssignRolesPopupVisible}
              setVisibility={setRemoveAssignRolesPopupVisibility}
              refreshRolesData={fetchData}
            />
          )}
        </div>
      </SideNav>
    </div>
  );
};

export default Roles;
