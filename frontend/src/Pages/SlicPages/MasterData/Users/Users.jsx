import React, { useContext, useEffect, useState } from "react";
import SideNav from "../../../../components/Sidebar/SideNav";
import { GtinColumn, usersColumn } from "../../../../utils/datatablesource";
import { Button } from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import DataTable from "../../../../components/Datatable/Datatable";
import { PiBarcodeDuotone } from "react-icons/pi";
import { MdPrint } from "react-icons/md";
import { FcPrint } from "react-icons/fc";
import RightDashboardHeader from "../../../../components/RightDashboardHeader/RightDashboardHeader";
import { DataTableContext } from "../../../../Contexts/DataTableContext";
import { toast } from "react-toastify";
import newRequest from "../../../../utils/userRequest";
import Swal from "sweetalert2";
import UpdateUserPopUp from "./UpdateUserPopUp";
import CreateUserPopUp from "./CreateUserPopUp";
import { useTranslation } from "react-i18next";

const Users = () => {

  const { t, i18n } = useTranslation();
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const memberDataString = sessionStorage.getItem('slicUserData');
  const memberData = JSON.parse(memberDataString);
  // console.log(memberData)

  const {
    rowSelectionModel,
    setRowSelectionModel,
    tableSelectedRows,
    setTableSelectedRows,
  } = useContext(DataTableContext);


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
      console.log(err);
      toast.error(err?.response?.data?.error || "failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  },[])

 
  const [isCreatePopupVisible, setCreatePopupVisibility] = useState(false);
  const handleShowCreatePopup = () => {
    setCreatePopupVisibility(true);
  };

  const [isUpdatePopupVisible, setUpdatePopupVisibility] = useState(false);
  const handleShowUpdatePopup = (row) => {
    setUpdatePopupVisibility(true);
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


  const handleDelete = (row) => {
    console.log(row);
    Swal.fire({
       title: `${t("Are you sure to delete this record?")}!`,
      text: `${t("You will not be able to recover this Products!")}`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: `${t("Yes Delete!")}`,
      cancelButtonText: `${t("No, keep it!")}`,
      confirmButtonColor: '#1E3B8B',
      cancelButtonColor: '#FF0032',
    }).then((result) => {
      if (result.isConfirmed) {
        const deletePromise = new Promise(async (resolve, reject) => {
          try {
            const response = await newRequest.delete("/users/v1/" + row?.TblSysNoID);
            if (response) {
              // await refetch();
              resolve(response?.data?.message || 'Products deleted successfully');
              const updatedData = data.filter(item => item.TblSysNoID !== row.TblSysNoID);
              setData(updatedData);
            } else {
              reject(new Error('Failed to delete product'));
            }
          } catch (error) {
            console.error("Error deleting product:", error);
            reject(error);
          }
        });
  
        toast.promise(
          deletePromise,
          {
            pending: 'Deleting product...',
            success: {
              render({ data }) {
                return data;
              }
            },
            error: {
              render({ data }) {
                return data.message || 'Failed to delete product';
              }
            }
          }
        );
      } else if (result.dismiss === Swal.DismissReason.cancel) {
        return;
      }
    });
  };
  

  return (
    <div>
      <SideNav>
        <div>
          <RightDashboardHeader title={t("Users")} />
        </div>

        <div className="h-auto w-full">
          <div className="h-auto w-full p-0 bg-white shadow-xl rounded-md pb-10">
            <div
              className={`flex justify-end items-center flex-wrap gap-2 px-5`}
            >
              <Button
                variant="contained"
                onClick={handleShowCreatePopup}
                style={{ backgroundColor: "#CFDDE0", color: "#1D2F90" }}
                startIcon={<PiBarcodeDuotone />}
              >
                {t("Add Users")}
              </Button>
            </div>

            <div style={{ marginTop: "-15px" }}>
              <DataTable
                data={data}
                title={t("Users")}
                columnsName={usersColumn(t)}
                loading={isLoading}
                secondaryColor="secondary"
                uniqueId="customerListId"
                handleRowClickInParent={handleRowClickInParent}
                checkboxSelection="disabled"
                dropDownOptions={[
                  {
                    label: t("Edit"),
                    icon: (
                      <EditIcon
                        fontSize="small"
                        color="action"
                        style={{ color: "rgb(37 99 235)" }}
                      />
                    ),
                    action: handleShowUpdatePopup,
                  },
                  {
                    label: t("Delete"),
                    icon: (
                      <DeleteIcon
                        fontSize="small"
                        color="action"
                        style={{ color: "rgb(37 99 235)" }}
                      />
                    ),
                    action: handleDelete,
                  },
                ]}
              />
            </div>
          </div>

          {isCreatePopupVisible && (
            <CreateUserPopUp
              isVisible={isCreatePopupVisible}
              setVisibility={setCreatePopupVisibility}
              refreshGTINData={fetchData}
            />
          )}

          {isUpdatePopupVisible && (
            <UpdateUserPopUp
              isVisible={isUpdatePopupVisible}
              setVisibility={setUpdatePopupVisibility}
              refreshGTINData={fetchData}
            />
          )}
        </div>
      </SideNav>
    </div>
  );
};

export default Users;
