import React, { useContext, useEffect, useState } from "react";
import SideNav from "../../../components/Sidebar/SideNav";
import { posErrorLogsColumn } from "../../../utils/datatablesource";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DataTable from "../../../components/Datatable/Datatable";
import RightDashboardHeader from "../../../components/RightDashboardHeader/RightDashboardHeader";
import { DataTableContext } from "../../../Contexts/DataTableContext";
import newRequest from "../../../utils/userRequest";
import { showApiError } from "../../../utils/apiErrorHandler";
import { useTranslation } from "react-i18next";

const PosErrorLogs = () => {
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
      const response = await newRequest.get("/invoice/v1/getErrorLogs?inDocumentNo=IN12345&transactionType=BRV", {
        headers: {
          Authorization: `Bearer ${memberData?.data?.token}`,
        },
      });
      // console.log(response?.data?.data);
      setData(response?.data?.data || []);
    } catch (err) {
      console.log(err);
      showApiError(err, {
        title: "Loading POS error logs failed",
        fallbackMessage: "failed to load data",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  },[])


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
            <div style={{marginTop: '-15px'}}>
              <DataTable
                data={data}
                title={t("Pos Error Logs")}
                columnsName={posErrorLogsColumn(t)}
                loading={isLoading}
                secondaryColor="secondary"
                uniqueId="customerListId"
                globalSearch={true}
                handleRowClickInParent={handleRowClickInParent}
                // checkboxSelection="disabled"
                actionColumnVisibility={false}
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
                    // action: handleShowViewPopup,
                  },
                ]}
              />
            </div>
          </div>
        </div>
      </SideNav>
    </div>
  );
};

export default PosErrorLogs;
