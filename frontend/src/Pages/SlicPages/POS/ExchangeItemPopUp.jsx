import React, { useState, useEffect } from "react";
import newRequest from "../../../utils/userRequest";
import ErpTeamRequest from "../../../utils/ErpTeamRequest";
import { showApiError } from "../../../utils/apiErrorHandler";
import { IoBarcodeSharp } from "react-icons/io5";
import CircularProgress from "@mui/material/CircularProgress";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import { useTaxContext } from "../../../Contexts/TaxContext";

const ExchangeItemPopUp = ({ isVisible, setVisibility, addExchangeData, selectedRowData, invoiceHeaderData, dsalesLocationCode, selectedSalesType, addDSalesExchangeData, selectedCustomerName, selectedSalesReturnType, selectedCustomeNameWithDirectInvoice, selectedTransactionCode }) => {
  const [data, setData] = useState([]);
  const [barcode, setBarcode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { taxAmount } = useTaxContext();

  const EX_TRANSACTION_CODES = ["EXIN", "AXIN", "EXSR", "AXSR"];
  const getCustomerCode = () => {
    // If the transaction code belongs to the EX/AX group, use selectedCustomerCode (fetched based on location and transaction)
    if (EX_TRANSACTION_CODES.includes(selectedTransactionCode?.TXN_CODE)) {
      return selectedCustomerName?.CUSTOMERCODE;
    }
    // Otherwise, use selectedCustomeNameWithDirectInvoice (fetched from the general customer API)
    return selectedCustomeNameWithDirectInvoice?.CUST_CODE;
  };

  useEffect(() => {
    // console.log("Selected Row Data" , selectedRowData);
    // console.log("Selected Transaction Code" , selectedTransactionCode);
    // console.log("Selected CustomerCode" , getCustomerCode())
  }, [selectedRowData]);


  const { t, i18n } = useTranslation();
  const token = JSON.parse(sessionStorage.getItem("slicLoginToken"));

  // Fetch barcode data from API
  const handleGetBarcodes = async (e) => {
    e.preventDefault();

    const customerCode = getCustomerCode();

    setIsLoading(true);
    try {
      const response = await newRequest.get(
        `/itemCodes/v2/searchByGTIN?GTIN=${barcode}`
      );
      const data = response?.data?.data;
      console.log(data)

      if (data) {
        const { ItemCode, ProductSize, GTIN, EnglishName, ArabicName } = data;

        // call the second api later in their
        const secondApiBody = {
          filter: {
            P_COMP_CODE: "SLIC",
            P_ITEM_CODE: ItemCode,
            P_CUST_CODE: customerCode,
            P_GRADE_CODE_1: ProductSize,
          },
          M_COMP_CODE: "SLIC",
          M_USER_ID: "SYSADMIN",
          APICODE: "PRICELIST",
          M_LANG_CODE: "ENG",
        };

        let secondApiResponse;
        try {
          secondApiResponse = await ErpTeamRequest.post(
            "/slicuat05api/v1/getApi",
            secondApiBody,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
          const secondApiData = secondApiResponse?.data;
          console.log(secondApiData);

          let storedData = sessionStorage.getItem("secondApiResponses");
          storedData = storedData ? JSON.parse(storedData) : {};

          const itemRates = secondApiData.map(
            (item) => item?.PRICELIST?.PLI_RATE
          );
          // Store the array of rates under the respective ItemCode
          storedData[ItemCode] = itemRates;
          // storedData[ItemCode] = secondApiData;

          sessionStorage.setItem(
            "secondApiResponses",
            JSON.stringify(storedData)
          );

          const itemPrice = itemRates.reduce((sum, rate) => sum + rate, 0); // Sum of all item prices
          const vat = itemPrice * taxAmount / 100;
          const total = itemPrice + vat;
          console.log(itemPrice);
          
          setData((prevData) => {
            const existingItemIndex = prevData.findIndex(
              (item) => item.Barcode === GTIN
            );

            const isAXSR = selectedTransactionCode?.TXN_CODE === "AXSR";
            // const finalItemPrice = isAXSR ? 0 : itemPrice;
            const finalItemPrice = itemPrice;
            // const finalVAT = isAXSR ? 0 : vat;
            const finalVAT = vat;
            // const finalTotal = isAXSR ? 0 : total;
            const finalTotal = total;

            if (existingItemIndex !== -1) {
              // If the item already exists, just update the Qty and Total
              const updatedData = [...prevData];
              updatedData[existingItemIndex] = {
                ...updatedData[existingItemIndex],
                Qty: updatedData[existingItemIndex].Qty + 1, // Increment quantity by 1
                Total:
                  (updatedData[existingItemIndex].Qty + 1) * (itemPrice + vat), // Update total with the new quantity
              };
              return updatedData;
            } else {
              // If the item is new, add it to the data array
              return [
                ...prevData,
                {
                  SKU: ItemCode,
                  Barcode: GTIN,
                  Description: EnglishName,
                  DescriptionArabic: ArabicName,
                  ItemSize: ProductSize,
                  Qty: 1,
                  // ItemPrice: itemPrice,
                  // VAT: vat,
                  // Total: total,
                  ItemPrice: finalItemPrice,
                  VAT: finalVAT,
                  Total: finalTotal,
                },
              ];
            }
          });
        } catch (secondApiError) {
          showApiError(secondApiError, {
            title: "Price List (PRICELIST) request failed",
            response: secondApiResponse,
          });
        }
        // barcode state empty once response is true
        setBarcode("");
      } else {
        setData([]);
      }
    } catch (error) {
      showApiError(error, { title: "Item lookup by barcode (GTIN) failed" });
    } finally {
      setIsLoading(false);
    }
  };


  const handleExchangeItems = async () => {
    if (data.length === 0) {
      toast.error("Please scan a barcode first because data is empty");
      return;
    }
  
    const item = data[0]; // Assuming you are dealing with a single item at a time
    console.log(item);
    
    const locationCode = selectedSalesType === "DSALES NO INVOICE" || selectedSalesType === "BTOC CUSTOMER"
    ? dsalesLocationCode
    : invoiceHeaderData;
  

    // If stock is available, call the STOCK STATUS API
    const stockStatusBody = {
      "filter": {
        "M_COMP_CODE": "SLIC",
        "P_LOCN_CODE": locationCode,
        "P_ITEM_CODE": item?.SKU,
        // "P_ITEM_CODE": "55782",
        "P_GRADE_1": item?.ItemSize,
        "P_GRADE_2": "NA",
        },
        "M_COMP_CODE": "SLIC",
        "M_USER_ID": "SYSADMIN",
        "APICODE": "STOCKSTATUS",
        "M_LANG_CODE": "ENG"
    };
  
    let stockStatusResponse;
    try {
      stockStatusResponse = await ErpTeamRequest.post(
        "/slicuat05api/v1/getApi",
        stockStatusBody,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
  
      const stockData = stockStatusResponse?.data;
      console.log(stockData);
      // You should check here whether the stockData indicates sufficient stock before proceeding
      const availableStock = stockData[0]?.STOCKSTATUS?.FREE_STOCK;
      // console.log(availableStock)
      if (availableStock >= item.Qty) {
        // console.log(item.Qty)

        // Update data with only the FREE_STOCK value
        const updatedData = data.map((d) => ({
          ...d,
          FreeStock: availableStock,
        }));

        // I commented the createExchangeInvocie Api
        // const res = await newRequest.post('/exchangeInvoice/v1/createExchangeInvoice', {
        //   EnglishName: item.Description,
        //   GTIN: item.Barcode,
        //   ModelName: item.SKU,
        //   ProductSize: item.ItemSize,
        // });
  
        // // console.log(res?.data);
        // toast.success(res?.data?.message || "Exchange Invoice created successfully");
  
        // addExchangeData(res?.data?.data);

        // i show the data based on user selection datagrid
        if (selectedSalesType === "DSALES NO INVOICE" || selectedSalesType === "BTOC CUSTOMER") {
          // addDSalesExchangeData(res?.data?.data);
          addDSalesExchangeData(updatedData);
        } else {
          // addExchangeData(res?.data?.data);
          addExchangeData(updatedData);
        }

        handleCloseCreatePopup();
      } else {
        // If stock is not available, show an error message
        if (availableStock == null) {
          // The API didn't return stock data at all – show what it sent instead
          showApiError(stockStatusResponse, {
            title: "Stock Status (STOCKSTATUS) API returned no stock data",
            fallbackMessage: "Stock not Available",
          });
        } else {
          toast.error("Stock not Available");
        }
      }
    } catch (err) {
      console.log(err);
      showApiError(err, {
        title: "Stock Status (STOCKSTATUS) request failed",
        response: stockStatusResponse,
      });
    }
  };  
  

  const handleCloseCreatePopup = () => {
    setVisibility(false);
  };

  return (
    <div>
      {isVisible && (
        <div className="popup-overlay z-50">
          <div className="popup-container h-auto sm:w-[50%] w-full">
            <div
              className="popup-form w-full"
              style={{ maxHeight: "90vh", overflowY: "auto" }}
            >
              <div className="relative">
                <div className="fixed top-0 left-0 z-10 flex justify-between w-full px-3 bg-secondary">
                  <h2 className="text-white sm:text-xl text-lg font-body font-semibold">
                    {t("Exchange Item")}
                  </h2>
                  <div className="flex items-center space-x-3">
                    <button className="text-white hover:text-gray-300 focus:outline-none" onClick={handleCloseCreatePopup}>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 14H4" />
                      </svg>
                    </button>
                    <button className="text-white hover:text-gray-300 focus:outline-none" onClick={handleCloseCreatePopup}>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4h16v16H4z" />
                      </svg>
                    </button>
                    <button className="text-white hover:text-red-600 focus:outline-none" onClick={handleCloseCreatePopup}>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
              

              {/* Exchange Item in Heading */}
              <form onSubmit={handleGetBarcodes} className="flex items-center gap-3 w-full mt-6">
                <div  className={`w-full ${
                  i18n.language === "ar" ? "text-end" : "text-start"
                }`}>
                  <label className="block text-gray-700">{t("Scan Barcode")}</label>
                  <input
                    type="text"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    className={`w-full mt-1 p-2 border rounded border-gray-400 bg-green-200 placeholder:text-black ${
                      i18n.language === "ar" ? "text-end" : "text-start"
                    }`}
                    placeholder={t("Enter Barcode")}
                  />
                </div>
                <button
                  type="submit"
                  className="ml-2 p-2 mt-7 border rounded bg-secondary hover:bg-primary text-white flex items-center justify-center"
                >
                  <IoBarcodeSharp size={24} />
                </button>
              </form>



              <div className="mt-6 w-full overflow-x-auto h-32">
                <table className="table-auto w-full">
                  <thead className="bg-secondary text-white">
                    <tr>
                      <th className="px-4 py-2">{t('Item Code')}</th>
                      <th className="px-4 py-2">{t("Item Size")}</th>
                      <th className="px-4 py-2">{t("Qty")}</th>
                      <th className="px-4 py-2">{t("Item Price")}</th>
                      <th className="px-4 py-2">{t("VAT (15%)")}</th>
                      <th className="px-4 py-2">{t("Total")}</th>
                    </tr>
                  </thead>
                  {isLoading ? (
                    <tr>
                      <td colSpan="10" className="text-center py-4">
                        <div className="flex justify-center items-center w-full h-full">
                          <CircularProgress size={24} color="inherit" />
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tbody>
                      {data.map((row, index) => (
                        <tr key={index} className="bg-gray-100 text-center">
                          <td className="border px-4 py-2">{row.SKU}</td>
                          <td className="border px-4 py-2">{row.ItemSize}</td>
                          <td className="border px-4 py-2">{row.Qty}</td>
                          <td className="border px-4 py-2">
                            {row.ItemPrice}
                          </td>
                          <td className="border px-4 py-2">{row.VAT}</td>
                          <td className="border px-4 py-2">
                            {row.Total}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  )}
                </table>
              </div>

              <div className="flex items-center justify-between w-full">
                <button
                  // type="submit"
                  onClick={handleExchangeItems}
                  className="p-3 border rounded bg-secondary hover:bg-[#424e9b] text-white flex items-center justify-center"
                >
                  {t("Submit and Save")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExchangeItemPopUp;
