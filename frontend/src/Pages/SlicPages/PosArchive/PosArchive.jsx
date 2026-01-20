import React, { useEffect, useState } from "react";
import SideNav from "../../../components/Sidebar/SideNav";
import { posArchiveColumns } from "../../../utils/datatablesource";
import DataTable from "../../../components/Datatable/Datatable";
import newRequest from "../../../utils/userRequest";
import { toast } from "react-toastify";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { useTranslation } from "react-i18next";

const PosArchive = () => {
  const { t } = useTranslation();
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filteredData, setFilteredData] = useState([]);
  const [isPurchaseOrderDataLoading, setIsPurchaseOrderDataLoading] =
    useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await newRequest.get("/invoice/v1/invoiceMasterArchive");
      // console.log(response?.data);
      setData(response?.data || []);
      setIsLoading(false);
    } catch (err) {
      setIsLoading(false);
      toast.error(err?.response?.data?.message || "Something went Wrong");
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRowClickInParent = async (item) => {
    // console.log(item)
    if (item.length === 0) {
      return;
    }

    // call api
    setIsPurchaseOrderDataLoading(true);
    try {
      const res = await newRequest.get(
        `/invoice/v1/invoiceDetailsArchive?filter[InvoiceNo]=${item[0].InvoiceNo}`
      );
      // console.log(res?.data);

      setFilteredData(res?.data || []);
    } catch (err) {
      // console.log(err);
      toast.error(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          "Something went wrong"
      );
      setFilteredData([]);
    } finally {
      setIsPurchaseOrderDataLoading(false);
    }
  };

  return (
    <SideNav>
      <div className="p-3 h-full">
        
        <div className="h-auto w-full shadow-xl">
          <div
            style={{
              marginLeft: "-11px",
              marginRight: "-11px",
            }}
          >
            <DataTable
              data={data}
              title={t("POS Archive")}
              columnsName={posArchiveColumns(t)}
              loading={isLoading}
              secondaryColor="secondary"
              checkboxSelection="disabled"
              handleRowClickInParent={handleRowClickInParent}
              globalSearch={true}
              actionColumnVisibility={false}
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
                  //   action: handleShowUpdatePopup,
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
                  //   action: handleDelete,
                },
              ]}
              uniqueId="posHistoryId"
            />
          </div>
        </div>

        <div style={{ marginLeft: "-11px", marginRight: "-11px" }}>
          <DataTable
            data={filteredData}
            title={t("POS Archive Details")}
            secondaryColor="secondary"
            columnsName={posArchiveColumns(t)}
            backButton={true}
            checkboxSelection="disabled"
            actionColumnVisibility={false}
            // dropDownOptions={[
            //   {
            //     label: "Delete",
            //     icon: <DeleteIcon fontSize="small" style={{ color: '#FF0032' }} />
            //     ,
            //     action: handleShipmentDelete,
            //   },
            // ]}
            uniqueId={"posHistoryDetailsId"}
            loading={isPurchaseOrderDataLoading}
          />
        </div>
      </div>
    </SideNav>
  );
};

export default PosArchive;
