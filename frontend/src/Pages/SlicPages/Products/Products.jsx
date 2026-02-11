import React, { useContext, useState } from "react";
import { useQuery, useQueryClient } from "react-query";
import SideNav from "../../../components/Sidebar/SideNav";
import { GtinColumn } from "../../../utils/datatablesource";
import { Button, Tooltip } from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import RefreshIcon from "@mui/icons-material/Refresh";
import DataTable from "../../../components/Datatable/Datatable";
import RightDashboardHeader from "../../../components/RightDashboardHeader/RightDashboardHeader";
import { DataTableContext } from "../../../Contexts/DataTableContext";
import { toast } from "react-toastify";
import newRequest from "../../../utils/userRequest";
import ViewGTINPopUp from "./ViewGTINPopUp";
import { useTranslation } from "react-i18next";

const Products = () => {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const memberDataString = sessionStorage.getItem('slicUserData');
  const memberData = JSON.parse(memberDataString);

  const {
    setTableSelectedRows,
  } = useContext(DataTableContext);

  // React Query fetch function
  const fetchProductsData = async () => {
    const response = await newRequest.get("/itemCodes/v1/itemCodes/all", {
      headers: {
        Authorization: `Bearer ${memberData?.data?.token}`,
      },
    });
    return response?.data?.data || [];
  };

  // React Query hook with 5 minutes cache time
  const { data = [], isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['productsData'],
    queryFn: fetchProductsData,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: false,
    onError: (err) => {
      toast.error(err?.response?.data?.error || "Failed to load data");
    },
  });

  // Manual refresh handler
  const handleRefresh = () => {
    toast.promise(
      refetch(),
      {
        pending: 'Refreshing data...',
        success: 'Data refreshed successfully!',
        error: 'Failed to refresh data'
      }
    );
  };

  // Invalidate and refetch data after mutations
  const refreshProductsData = () => {
    queryClient.invalidateQueries(['productsData']);
  };

  const [isViewPopupVisible, setViewPopupVisibility] = useState(false);
  const handleShowViewPopup = (row) => {
    setViewPopupVisibility(true);
    sessionStorage.setItem("viewGtinBarcodesData", JSON.stringify(row));
  };

  const handleRowClickInParent = (item) => {
    if (!item || item?.length === 0) {
      return;
    }
    const formattedItems = item.map((row) => ({
      ...row,
      updatedAt: new Date(row.updatedAt).toLocaleDateString(),
    }));
    setTableSelectedRows(formattedItems);
  };
 
  return (
    <div>
      <SideNav>
        <div>
          <RightDashboardHeader title={t("Products Barcode View")} />
        </div>

        <div className="h-auto w-full">
          <div className="h-auto w-full p-0 bg-white shadow-xl rounded-md pb-10">
            <div
              className={`flex items-center flex-wrap gap-2 py-2 px-5 ${i18n.language==='ar'?'justify-start':'justify-end'}`}
            >
              {/* Refresh Button */}
              <Tooltip title={t("Refresh Data")}>
                <span>
                  <Button
                    variant="contained"
                    onClick={handleRefresh}
                    disabled={isFetching}
                    style={{ 
                      backgroundColor: isFetching ? "#E0E0E0" : "#CFDDE0", 
                      color: isFetching ? "#9E9E9E" : "#1D2F90",
                      cursor: isFetching ? "not-allowed" : "pointer"
                    }}
                    startIcon={<RefreshIcon className={isFetching ? 'animate-spin' : ''} />}
                  >
                    {t("Refresh Data")}
                  </Button>
                </span>
              </Tooltip>
            </div>

            <div style={{marginTop: '-15px'}}>
              <DataTable
                data={data}
                title={t("Products List View")}
                columnsName={GtinColumn(t)}
                loading={isLoading || isFetching}
                secondaryColor="secondary"
                uniqueId="customerListId"
                globalSearch={true}
                checkboxSelection={'disabled'}
                handleRowClickInParent={handleRowClickInParent}
                dropDownOptions={[
                  {
                    label: t("View"),
                    icon: (
                      <VisibilityIcon
                        fontSize="small"
                        color="action"
                        style={{ color: "rgb(37 99 235)" }}
                      />
                    ),
                    action: handleShowViewPopup,
                  },
                ]}
              />
            </div>
          </div>

          {isViewPopupVisible && (
            <ViewGTINPopUp
              isVisible={isViewPopupVisible}
              setVisibility={setViewPopupVisibility}
              refreshGTINData={refreshProductsData}
            />
          )}
        </div>
      </SideNav>
    </div>
  );
};

export default Products;