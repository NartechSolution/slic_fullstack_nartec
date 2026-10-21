import React, { useEffect, useState } from "react";
import SideNav from "../../../components/Sidebar/SideNav";
import { useNavigate } from "react-router-dom";
import { posBulkCashreceiptInvoiceColumns } from "../../../utils/datatablesource";
import DataTable from "../../../components/Datatable/Datatable";
import EditIcon from "@mui/icons-material/Edit";
import { useTranslation } from "react-i18next";
import newRequest from "../../../utils/userRequest";
import { showApiError } from "../../../utils/apiErrorHandler";
import { Autocomplete, CircularProgress, debounce, TextField } from "@mui/material";
import axios from "axios";
import { useTaxContext } from "../../../Contexts/TaxContext";

const PosBrvMatchedReceipts = () => {
  const { t, i18n } = useTranslation();
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalInvoiceAmount, setTotalInvoiceAmount] = useState(0);
  const [exchangeAmount, setExchangeAmount] = useState(0);
  const [remainingAmount, setRemainingAmount] = useState(0);
  const [selectedLocation, setSelectedLocation] = useState(null);

  const [selectedMatchReceipts, setSelectedMatchReceipts] = useState(null);
  const [matchReceiptsList, setMatchReceiptsList] = useState([]);
  const { taxAmount } = useTaxContext();
  // console.log(taxAmount);

  useEffect(() => {
    const storedLocationData = sessionStorage.getItem("selectedLocation");
    if (storedLocationData) {
      const locationData = JSON.parse(storedLocationData);
      if (JSON.stringify(locationData) !== JSON.stringify(selectedLocation)) {
        setSelectedLocation(locationData);
      }
      // console.log(locationData)
    }
  }, []);

  const handleSelectedBrvReceipts = (event, value) => {
    console.log(value);
    setSelectedMatchReceipts(value);

    if (value) {
      fetchData(value);
    }
  };

  const handleFetchAllBrvReceipts = async () => {
    try {
        const response = await newRequest.get(`/invoice/v1/getPOSInvoiceBatch?isMatched=true`);
        console.log(response.data);
        const data = response.data;
        const name = data.map((receipt) => ({
          id: receipt?.id,
          bulkCashDocNo: receipt.bulkCashDocNo,
          bulkCashRefNo: receipt.bulkCashRefNo
      }));
      setMatchReceiptsList(name)
    } catch (error) {
        console.log(error);
        showApiError(error, { title: "Loading matched BRV receipts failed" });
    }
  };

  useEffect(() => {
    handleFetchAllBrvReceipts();
  },[])

  // Calculate amounts based on IN and SR transactions
  const calculateAmounts = (transactions) => {
    let totalINAmount = 0;
    let totalSRAmount = 0;

    transactions.forEach((transaction) => {
      // Determine VAT rate for each transaction, defaulting to 15% if VatNumber is not provided
      const vatRate = transaction.VatNumber
        ? parseFloat(transaction.VatNumber) / 100
        : 0.15;
      // const vatMultiplier = 1 + vatRate; // Multiplier for calculating total with VAT
      const vatMultiplier = 1 + taxAmount / 100; // Multiplier for calculating total with VAT

      // Check transaction code and update the respective totals
      if (transaction.TransactionCode.endsWith("IN")) {
        totalINAmount += transaction.PendingAmount * vatMultiplier;
      } else if (transaction.TransactionCode.endsWith("SR")) {
        totalSRAmount += transaction.PendingAmount * vatMultiplier;
      }
    });

    // Calculate remaining amount
    const remainingAmount = totalINAmount - totalSRAmount;

    // Update state with calculated values
    setTotalInvoiceAmount(totalINAmount.toFixed(2));
    setExchangeAmount(totalSRAmount.toFixed(2));
    setRemainingAmount(remainingAmount.toFixed(2));
  };

  const fetchData = async (value) => {
    setIsLoading(true);
    // console.log(value);
    try {
      const response = await newRequest.get(
        `/invoice/v1/getPOSInvoiceMaster?filter[batchId]=${value?.id}&filter[SalesLocationCode]=${selectedLocation?.stockLocation}`
      );
      setData(response?.data || []);
      calculateAmounts(response?.data);
      // console.log(response.data);
      setIsLoading(false);

    } catch (err) {
      console.log(err);
      setIsLoading(false);
      showApiError(err, { title: "Loading matched receipt invoices failed" });
    }
  };

  const handleRowClickInParent = async () => {
    
  }; 
      
  return (
    <SideNav>
      <div className="p-3 h-full">
        <div className="flex justify-center items-center">
          <div className="h-auto w-full">
            <div className="h-auto w-full bg-white shadow-xl rounded-md">
              <div
                className={`sm:flex p-4 gap-2 w-full ${
                  i18n.language === "ar" ? "flex-row-reverse" : "flex-row"
                }`}
              >
                <div className="px-3 sm:w-[30%] w-full">
                    <Autocomplete
                      id="field1"
                      options={matchReceiptsList}
                      getOptionLabel={(option) => `${option?.bulkCashDocNo} - ${option?.bulkCashRefNo}`}
                      onChange={handleSelectedBrvReceipts}
                      value={selectedMatchReceipts}
                      onInputChange={(event, value) => {
                        if (!value) {
                        // perform operation when input is cleared
                        // console.log("Input cleared");
                        }
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          InputProps={{
                            ...params.InputProps,
                            className: "text-white",
                          }}
                          InputLabelProps={{
                            ...params.InputLabelProps,
                            style: { color: "white" },
                          }}
                          className="bg-gray-50 border border-gray-300 text-white text-xs rounded-sm focus:ring-blue-500 focus:border-blue-500 block w-full p-1.5 md:p-2.5"
                          placeholder={`${t("Search BRV Receipts")}`}

                          required
                        />
                      )}
                      classes={{
                        endAdornment: "text-white",
                      }}
                      sx={{
                        "& .MuiAutocomplete-endAdornment": {
                        color: "white",
                      },
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="h-auto w-full shadow-xl pb-6">
          <div
            style={{
              marginLeft: "-11px",
              marginRight: "-11px",
            }}
          >
            <DataTable
              data={data}
              title={t("POS BRV Matched Receipts")}
              columnsName={posBulkCashreceiptInvoiceColumns(t)}
              loading={isLoading}
              secondaryColor="secondary"
              checkboxSelection="disabled"
              handleRowClickInParent={handleRowClickInParent}
              globalSearch={true}
              actionColumnVisibility={false}
              dropDownOptions={[
                {
                  label: t("Print Receipts"),
                  icon: (
                    <EditIcon
                      fontSize="small"
                      color="action"
                      style={{ color: "rgb(37 99 235)" }}
                    />
                  ),
                  // action: handleInvoiceGenerator,
                },
              ]}
              uniqueId="posHistoryId"
            />
          </div>
        </div>
        <div className={`flex  ${i18n.language === "ar" ? " justify-start" : "justify-end"}`}>
          <div className="bg-white p-4 rounded shadow-md sm:w-[60%] w-full">
            <div className="flex flex-col gap-4">
              <div className={`flex justify-between items-center ${i18n.language === "ar" ? "flex-row-reverse" : "flex-row"}`}>
                <label className={`block text-gray-700 font-bold ${i18n.language === 'ar' ? "direction-rtl" : 'text-start direction-ltr'}`}>
                  {t("Total Invoice Amount WithVAT")}:
                </label>
                <input
                  type="text"
                  value={totalInvoiceAmount}
                  readOnly
                 className={`mt-1 p-2 border bg-gray-100 w-[60%] ${i18n.language === "ar" ? "text-start" : "text-end"}`}
                  
                />
              </div>

              <div className={`flex justify-between items-center ${i18n.language === "ar" ? "flex-row-reverse" : "flex-row"}`}>
                <label className={`block text-gray-700 font-bold ${i18n.language === 'ar' ? "direction-rtl" : 'text-start direction-ltr'}`}>
                  {t("Exchange Amount")}
                </label>
                <input
                  type="text"
                  value={exchangeAmount}
                  readOnly
                 className={`mt-1 p-2 border bg-gray-100 w-[60%]  ${i18n.language === "ar" ? "text-start" : "text-end"}`}
                />
              </div>

              <div className={`flex justify-between items-center ${i18n.language === "ar" ? "flex-row-reverse" : "flex-row"}`}>
                <label className={`block text-gray-700 font-bold ${i18n.language === 'ar' ? "direction-rtl" : 'text-start direction-ltr'}`}>
                  {t("Remaining Amount")}
                </label>
                <input
                  type="text"
                  value={remainingAmount}
                  readOnly
                 className={`mt-1 p-2 border bg-gray-100  w-[60%] ${i18n.language === "ar" ? "text-start" : "text-end"}`}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </SideNav>
  );
};

export default PosBrvMatchedReceipts;
