import React, { useEffect, useState } from "react";
import SideNav from "../../../components/Sidebar/SideNav";
import { IoBarcodeSharp } from "react-icons/io5";
import newRequest from "../../../utils/userRequest";
import { toast } from "react-toastify";
import F3TenderCashPopUp from "./F3TenderCashPopUp";
import F3ResponsePopUp from "./F3ResponsePopUp";
import CircularProgress from "@mui/material/CircularProgress";
import sliclogo from "../../../Images/sliclogo.png";
import QRCode from "qrcode";
import ErpTeamRequest from "../../../utils/ErpTeamRequest";
import { Autocomplete, TextField } from "@mui/material";
import ExchangeItemPopUp from "./ExchangeItemPopUp";
import ConfirmTransactionPopUp from "./ConfirmTransactionPopUp";
import { FaExchangeAlt } from "react-icons/fa";
import { MdRemoveCircle } from "react-icons/md";
import html2pdf from "html2pdf.js";
import MobileNumberPopUp from "./MobileNumberPopUp";
import QRCodePopup from "../../../components/WhatsAppQRCode/QRCodePopup";
import { useTranslation } from "react-i18next";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { useTaxContext } from "../../../Contexts/TaxContext";
import { useSlicToken } from "../../../Contexts/SlicTokenContext";

const POS = () => {
  const { t, i18n } = useTranslation();
  const [data, setData] = useState([]);
  const [qrCode, setQrCode] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [barcode, setBarcode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [mobileNo, setMobileNo] = useState("");
  const [remarks, setRemarks] = useState("");
  const [vat, setVat] = useState(15);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [selectedSalesType, setSelectedSalesType] = useState(
    "DIRECT SALES INVOICE"
  );
  const { startTokenRefresh, stopTokenRefresh } = useSlicToken();
  const { taxAmount } = useTaxContext();
  // console.log(taxAmount);

  // Add this function near other state declarations
  const [discountedTotal, setDiscountedTotal] = useState(0);
  // Add this function to calculate discount
  const calculateDiscount = (items, totalQty) => {
    // Check if selected customer is Buy 2 Get 1 Free customer
    const isBuy2Get1Customer = selectedCustomeNameWithDirectInvoice?.CUST_NAME?.includes("Buy 2 Get 1 Free");
    // const isBuy2Get1Customer = selectedCustomeNameWithDirectInvoice?.CUST_NAME?.includes("Buy 2 Get 1 Free") || 
    //                         selectedCustomeNameWithDirectInvoice?.CUST_CODE === "CL100948" ||
    //                         selectedCustomeNameWithDirectInvoice?.CUST_NAME?.includes("Miscelleneous Customers - Khobar Showroom");

    if (!isBuy2Get1Customer || totalQty !== 3) {
      return 0;
    }

    // Find lowest price item
    const lowestPrice = Math.min(...items.map(item => Number(item.ItemPrice)));
    return lowestPrice;
  };


  const [selectedSalesReturnType, setSelectedSalesReturnType] =
    useState("RETRUN WITH EXCHANGE");
  const [openDropdown, setOpenDropdown] = useState(null);
  const [selectedRowData, setSelectedRowData] = useState(null);

  const handleActionClick = (index) => {
    setOpenDropdown(openDropdown === index ? null : index);

    // Select the correct row data based on the sales type
    if (selectedSalesType === "DIRECT SALES RETURN") {
      setSelectedRowData(invoiceData[index]); // Save the row data from invoiceData
    } else if (selectedSalesType === "DSALES NO INVOICE") {
      setSelectedRowData(DSalesNoInvoiceData[index]); // Save the row data from data (for sales invoices)
    }
  };

  const handleClosePopup = () => {
    setShowPopup(false);
  };


  // picked current date and time
  const [currentTime, setCurrentTime] = useState("");
  const [todayDate, setTodayDate] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [newInvoiceNumber, setNewInvoiceNumber] = useState("");

  // Function to generate invoice number based on date and time
  const generateInvoiceNumber = () => {
    const now = new Date();
    const timestamp = Date.now();
    return `${timestamp}`;
  };

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTodayDate(now.toISOString());
      setCurrentTime(
        now.toLocaleString("en-US", {
          dateStyle: "short",
          timeStyle: "medium",
        })
      );
    };

    setInvoiceNumber(generateInvoiceNumber());
    updateTime();
    const intervalId = setInterval(updateTime, 1000);

    return () => clearInterval(intervalId);
  }, []);

  const [isExchangeClick, setIsExchangeClick] = useState(false);
  const [isExchangeDSalesClick, setIsExchangeDSalesClick] = useState(false);
  const handleItemClick = (action) => {
    setOpenDropdown(null);

    if (action === "exchange") {
      handleShowExhangeItemPopup(selectedRowData);
      setIsExchangeClick(true);
      // generateNewInvoiceNumber();
    } else if (action === "exchange Dsales") {
      handleShowExhangeItemPopup(selectedRowData);
      setIsExchangeDSalesClick(true);
      // generateNewInvoiceNumber();
    }
    // console.log("isButtonClick", isExchangeClick);
  };

  const [selectedPaymentMode, setSelectedPaymentMode] = useState(null);
  const handlePaymentModeUpdate = (newPaymentMode) => {
    setSelectedPaymentMode(newPaymentMode);
    sessionStorage.setItem("selectedPaymentModels", JSON.stringify(newPaymentMode));
  };

  useEffect(() => {
    const storedCompanyData = sessionStorage.getItem("selectedCompany");
    if (storedCompanyData) {
      const companyData = JSON.parse(storedCompanyData);
      if (JSON.stringify(companyData) !== JSON.stringify(selectedCompany)) {
        setSelectedCompany(companyData);
      }
    }


    const storedLocationData = sessionStorage.getItem("selectedLocation");
    if (storedLocationData) {
      const locationData = JSON.parse(storedLocationData);
      if (JSON.stringify(locationData) !== JSON.stringify(selectedLocation)) {
        setSelectedLocation(locationData);
      }
      // console.log(locationData)
    }

    const storedPaymentMode = sessionStorage.getItem("selectedPaymentModels");
    if (storedPaymentMode) {
      setSelectedPaymentMode(JSON.parse(storedPaymentMode));
    }

    // console.log(taxAmount);

  }, []);

  // Start token refresh when component mounts
  useEffect(() => {
    startTokenRefresh();

    // Cleanup: stop refresh when component unmounts
    return () => {
      stopTokenRefresh();
    };
  }, [startTokenRefresh, stopTokenRefresh]);

  useEffect(() => {
    if (selectedPaymentMode) {
      // console.log("selected mode", selectedPaymentMode)
    }
  }, [selectedPaymentMode])

  const token = JSON.parse(sessionStorage.getItem("slicLoginToken"));

  const [slicUserData, setSlicUserData] = useState(null);
  useEffect(() => {
    // slic our user data
    const slicUser = sessionStorage.getItem('slicUserData');
    const adminData = JSON.parse(slicUser);
    if (JSON.stringify(adminData) !== JSON.stringify(slicUserData)) {
      setSlicUserData(adminData?.data?.user);
      // console.log(adminData?.data?.user)
    }
  }, []);

  // console.log(slicUserData?.SalesmanCode);


  // transaction Codes Api
  const [transactionCodes, setTransactionCodes] = useState([]);
  const [selectedTransactionCode, setSelectedTransactionCode] = useState("");
  const fetchTransactionCodes = async () => {
    try {
      const response = await newRequest.get(
        `/transactions/v1/byLocationCode?locationCode=${selectedLocation?.stockLocation}`
      );
      let codes = response.data?.data || [];

      // Apply filtering based on selectedOption
      if (selectedSalesType === "DIRECT SALES INVOICE") {
        codes = codes.filter((code) => !code.TXN_CODE.includes("SR"));
      } else if (
        selectedSalesType === "DIRECT SALES RETURN" ||
        selectedSalesType === "DSALES NO INVOICE" ||
        selectedSalesType === "BTOC CUSTOMER"
      ) {
        codes = codes.filter((code) => !code.TXN_CODE.includes("IN"));
      }
      // console.log(codes)
      setTransactionCodes(codes);
    } catch (err) {
      // console.log(err);
      toast.error(err?.response?.data?.message || "Something went Wrong");
    }
  };

  const handleTransactionCodes = (event, value) => {
    // console.log(value)
    setSelectedTransactionCode(value ? value : "");
  };

  useEffect(() => {
    if (selectedLocation?.stockLocation) {
      fetchTransactionCodes();
    }
  }, [selectedLocation, selectedSalesType]);


  // fetch All Customer Names api
  const EX_TRANSACTION_CODES = ["EXIN", "AXIN", "EXSR", "AXSR"];
  const [searchCustomerName, setSearchCustomerName] = useState([]);
  const [selectedCustomerName, setSelectedCustomerName] = useState("");
  const fetchCustomerBasedonTransaction = async () => {
    try {
      const response = await newRequest.get(
        `/transactions/v1/all?TXN_CODE=${selectedTransactionCode?.TXN_CODE}&TXNLOCATIONCODE=${selectedLocation?.stockLocation}`
      );
      const allCustomers = response?.data?.data;
      // console.log(allCustomers)

      setSearchCustomerName(allCustomers);
    } catch (err) {
      // console.log(err);
      toast.error(err?.response?.data?.message || "Something went Wrong");
    }
  };

  const handleSearchCustomerName = (event, value) => {
    console.log(value);
    setSelectedCustomerName(value);
  };

  const [customerNameWithDirectInvoice, setCustomerNameWithDirectInvoice] =
    useState([]);
  const [
    selectedCustomeNameWithDirectInvoice,
    setSelectedCustomeNameWithDirectInvoice,
  ] = useState("");

  // fetch All Customer
  const fetchCustomerNames = async () => {
    try {
      const response = await newRequest.get("/customerNames/v1/all");
      const allCustomers = response?.data?.data;

      // Filter customers whose CUST_CODE starts with "CL"
      const filteredCustomers = allCustomers.filter((customer) =>
        customer.CUST_CODE.startsWith("CL") || customer.CUST_CODE.startsWith("EX")
      );
      // console.log(filteredCustomers);
      setCustomerNameWithDirectInvoice(filteredCustomers);

      // btoc customer
      // setBtocCustomer(filteredCustomers);
    } catch (err) {
      // console.log(err);
      toast.error(err?.response?.data?.message || "Something went Wrong");
    }
  };

  // BTOC CUSTOMER state
  const [btocCustomer, setBtocCustomer] = useState([]);
  const [selectedBtocCustomer, setSelectedBtocCustomer] = useState("");
  const fetchB2CCustomerNames = async () => {
    try {
      const response = await newRequest.get("/customerNames/v1/all");
      const allCustomers = response?.data?.data;

      // Filter customers whose CUST_CODE starts with "CL"
      const filteredCustomers = allCustomers.filter((customer) =>
        customer.CUST_CODE.startsWith("CL") || customer.CUST_CODE.startsWith("EX")
      );
      // btoc customer
      setBtocCustomer(filteredCustomers);
    } catch (err) {
      // console.log(err);
      toast.error(err?.response?.data?.message || "Something went Wrong");
    }
  };

  const handleSearchCustomerNameWithDirectInvoice = (event, value) => {
    console.log(value);
    setSelectedCustomeNameWithDirectInvoice(value);
  };

  // btoc customer handle function
  const handleBtocCustomer = (event, value) => {
    console.log(value);
    setSelectedBtocCustomer(value);
  };


  useEffect(() => {
    if (selectedTransactionCode?.TXN_CODE) {
      // Check if the transaction code is one of the EX/AX ones that requires validation
      if (EX_TRANSACTION_CODES.includes(selectedTransactionCode?.TXN_CODE)) {
        // Fetch customers based on the location and transaction code
        fetchCustomerBasedonTransaction();
      } else {
        // Fetch general customer names
        fetchCustomerNames();
      }
    }
  }, [selectedTransactionCode?.TXN_CODE]);

  useEffect(() => {
    if (selectedSalesType === "BTOC CUSTOMER") {
      fetchB2CCustomerNames();
    }
  }, [selectedSalesType]);

  // Main barcode handling function
  const handleGetBarcodes = async (e) => {
    e.preventDefault();

    // Dynamically determine the CustomerCode based on the selected transaction code
    const customerCode =
      EX_TRANSACTION_CODES.includes(selectedTransactionCode?.TXN_CODE)
        ? selectedCustomerName?.CUSTOMERCODE // For EX/AX transactions
        : selectedCustomeNameWithDirectInvoice?.CUST_CODE; // For other transactions

    if (!selectedTransactionCode?.TXN_CODE) {
      toast.error("Please select a transaction code first.");
      setIsExchangeItemPopupVisible(false);
      return;
    }

    if (!selectedCustomeNameWithDirectInvoice?.CUST_CODE && !selectedCustomerName?.CUSTOMERCODE) {
      toast.error("Please select a customer code first.");
      setIsExchangeItemPopupVisible(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await newRequest.get(
        `/itemCodes/v2/searchByGTIN?GTIN=${barcode}`
      );
      const data = response?.data?.data;

      if (data) {
        const { ItemCode, ProductSize, GTIN, EnglishName, ArabicName } = data;

        // Call the second API
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

        try {
          const secondApiResponse = await ErpTeamRequest.post(
            "/slicuat05api/v1/getApi",
            secondApiBody,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
          const secondApiData = secondApiResponse?.data;

          // Check if the response contains an error message even with 200 status
          if (secondApiData?.Message && secondApiData.Message.includes("No Records Found")) {
            toast.error(secondApiData.Message);
            setBarcode("");
            return;
          }

          // Check if secondApiData is an array and has data
          if (!Array.isArray(secondApiData) || secondApiData.length === 0) {
            toast.error("No price information found for this item");
            setBarcode("");
            return;
          }

          let storedData = sessionStorage.getItem("secondApiResponses");
          storedData = storedData ? JSON.parse(storedData) : {};

          const itemRates = secondApiData.map(
            (item) => item?.PRICELIST?.PLI_RATE
          );

          storedData[ItemCode] = itemRates;

          sessionStorage.setItem(
            "secondApiResponses",
            JSON.stringify(storedData)
          );

          const itemPrice = itemRates.reduce((sum, rate) => sum + rate, 0);
          const vat = itemPrice * 15 / 100;

          setData((prevData) => {
            const existingItemIndex = prevData.findIndex(
              (item) => item.Barcode === GTIN
            );

            let newData;
            if (existingItemIndex !== -1) {
              // Update existing item
              newData = [...prevData];
              newData[existingItemIndex] = {
                ...newData[existingItemIndex],
                Qty: newData[existingItemIndex].Qty + 1,
              };
            } else {
              // Add new item
              const newItem = {
                SKU: ItemCode,
                Barcode: GTIN,
                Description: EnglishName,
                DescriptionArabic: ArabicName,
                ItemSize: ProductSize,
                Qty: 1,
                ItemPrice: itemPrice,
                VAT: (itemPrice * taxAmount) / 100,
              };
              newData = [...prevData, newItem];
            }

            // Calculate total quantity across all items
            const totalQty = newData.reduce((sum, item) => sum + item.Qty, 0);
            // console.log("Total Quantity:", totalQty);

            // Prevent more than 3 items
            const isBuy2Get1Customer = selectedCustomeNameWithDirectInvoice?.CUST_NAME?.includes("Buy 2 Get 1 Free");
            if (isBuy2Get1Customer && totalQty > 3) {
              toast.error("Maximum 3 items allowed for Buy 2 Get 1 Free offer");
              setBarcode("");
              return prevData;
            }

            // Calculate discount using newData
            const discount = calculateDiscount(newData, totalQty);
            const discountPerItem = totalQty === 3 ? discount / totalQty : 0;
            setDiscountedTotal(discount);
            // console.log("discount", discount)

            // Update totals for all items including discount
            return newData.map(item => {
              const discountedPrice = item.ItemPrice - discountPerItem;
              const newVat = (discountedPrice * taxAmount) / 100;

              return {
                ...item,
                DiscountedPrice: discountedPrice,
                VAT: newVat,
                Total: (discountedPrice + newVat) * item.Qty,
                Discount: discountPerItem
              };
            });
          });

          // Now, call the stock status API after second API success
          const stockStatusBody = {
            filter: {
              M_COMP_CODE: "SLIC",
              P_LOCN_CODE: selectedLocation?.stockLocation,
              P_ITEM_CODE: ItemCode,
              P_GRADE_1: ProductSize,
              P_GRADE_2: "NA",
            },
            M_COMP_CODE: "SLIC",
            M_USER_ID: "SYSADMIN",
            APICODE: "STOCKSTATUS",
            M_LANG_CODE: "ENG",
          };

          try {
            const stockStatusResponse = await ErpTeamRequest.post(
              "/slicuat05api/v1/getApi",
              stockStatusBody,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );

            const stockData = stockStatusResponse?.data;

            // Check if the stock status response contains an error message
            if (stockData?.Message && stockData.Message.includes("No Records Found")) {
              toast.error(stockData.Message);
              return;
            }

            // Check if stockData is an array and has data
            if (!Array.isArray(stockData) || stockData.length === 0) {
              toast.error("No stock information found for this item");
              return;
            }

            const availableStock = stockData[0]?.STOCKSTATUS?.FREE_STOCK;

            // Update the grid with available stock info only for the current item
            setData((prevData) => {
              const existingItemIndex = prevData.findIndex(
                (item) => item.Barcode === GTIN
              );

              if (existingItemIndex !== -1) {
                // If item exists, only update that specific item
                const updatedData = [...prevData];
                updatedData[existingItemIndex] = {
                  ...updatedData[existingItemIndex],
                  AvailableStock: availableStock
                };
                return updatedData;
              } else {
                // If it's a new item, add it with the stock information
                return [...prevData, {
                  SKU: ItemCode,
                  Barcode: GTIN,
                  Description: EnglishName,
                  DescriptionArabic: ArabicName,
                  ItemSize: ProductSize,
                  Qty: 1,
                  ItemPrice: itemPrice,
                  VAT: (itemPrice * taxAmount) / 100,
                  AvailableStock: availableStock
                }];
              }
            });

          } catch (stockStatusError) {
            const errorMessage =
              stockStatusError?.response?.data ||
              stockStatusError?.response?.data?.message ||
              stockStatusError?.response?.data?.Message ||
              stockStatusError?.message ||
              "An error occurred while fetching stock status";

            toast.error(errorMessage);
            setBarcode("");
          }

          setBarcode("");
        } catch (secondApiError) {
          const errorMessage =
            secondApiError?.response?.data ||
            secondApiError?.response?.data?.message ||
            secondApiError?.response?.data?.Message ||
            secondApiError?.message ||
            "An error occurred while calling the second API";

          toast.error(errorMessage);
          setBarcode("");
        }
      } else {
        setData([]);
      }
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.response?.data?.Message ||
        error?.response?.data?.error ||
        error?.message ||
        "An error occurred";

      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // handleDelete
  const handleDelete = (index) => {
    setData((prevData) => prevData.filter((_, i) => i !== index));
  };

  // Direct Sales No Invoice
  const [DSalesNoInvoiceData, setDSalesNoInvoiceData] = useState([]);
  const handleGetNoInvoiceBarcodes = async (e) => {
    e.preventDefault();

    // Dynamically determine the CustomerCode based on the selected transaction code
    const customerCode =
      EX_TRANSACTION_CODES.includes(selectedTransactionCode?.TXN_CODE)
        ? selectedCustomerName?.CUSTOMERCODE // For EX/AX transactions
        : selectedCustomeNameWithDirectInvoice?.CUST_CODE; // For other transactions

    if (!selectedTransactionCode?.TXN_CODE) {
      toast.error("Please select a transaction code first.");
      setIsExchangeItemPopupVisible(false);
      return;
    }
    if (!selectedCustomeNameWithDirectInvoice?.CUST_CODE && !selectedCustomerName?.CUSTOMERCODE) {
      toast.error("Please select a customer code first.");
      setIsExchangeItemPopupVisible(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await newRequest.get(
        `/itemCodes/v2/searchByGTIN?GTIN=${barcode}`
      );
      const data = response?.data?.data;

      if (data) {
        const { ItemCode, ProductSize, GTIN, EnglishName, ArabicName, id } = data;

        // call the second api
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

        try {
          const secondApiResponse = await ErpTeamRequest.post(
            "/slicuat05api/v1/getApi",
            secondApiBody,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
          const secondApiData = secondApiResponse?.data;

          // Check if the response contains an error message even with 200 status
          if (secondApiData?.Message && secondApiData.Message.includes("No Records Found")) {
            toast.error(secondApiData.Message);
            setBarcode("");
            return;
          }

          // Check if secondApiData is an array and has data
          if (!Array.isArray(secondApiData) || secondApiData.length === 0) {
            toast.error("No price information found for this item");
            setBarcode("");
            return;
          }

          // console.log(secondApiData);

          let storedData = sessionStorage.getItem("secondApiResponses");
          storedData = storedData ? JSON.parse(storedData) : {};

          const itemRates = secondApiData.map(
            (item) => item?.PRICELIST?.PLI_RATE
          );

          // Store the array of rates under the respective ItemCode
          storedData[ItemCode] = itemRates;

          sessionStorage.setItem(
            "secondApiResponses",
            JSON.stringify(storedData)
          );

          const itemPrice = itemRates.reduce((sum, rate) => sum + rate, 0);
          const vat = itemPrice * taxAmount / 100;
          const total = itemPrice + vat;
          // console.log(itemPrice);

          setDSalesNoInvoiceData((prevData) => {
            const existingItemIndex = prevData.findIndex(
              (item) => item.Barcode === GTIN
            );

            if (existingItemIndex !== -1) {
              // If the item already exists, just update the Qty and Total
              const updatedData = [...prevData];
              updatedData[existingItemIndex] = {
                ...updatedData[existingItemIndex],
                Qty: updatedData[existingItemIndex].Qty + 1,
                Total:
                  (updatedData[existingItemIndex].Qty + 1) * (itemPrice + vat),
              };
              return updatedData;
            } else {
              // If the item is new, add it to the data array
              return [
                ...prevData,
                {
                  id: id,
                  SKU: ItemCode,
                  Barcode: GTIN,
                  Description: EnglishName,
                  DescriptionArabic: ArabicName,
                  ItemSize: ProductSize,
                  Qty: 1,
                  ItemPrice: itemPrice,
                  VAT: vat,
                  Total: total,
                },
              ];
            }
          });

          setBarcode("");

        } catch (secondApiError) {
          const errorMessage =
            secondApiError?.response?.data ||
            secondApiError?.response?.data?.message ||
            secondApiError?.response?.data?.Message ||
            secondApiError?.message ||
            "An error occurred while calling the second API";

          toast.error(errorMessage);
          setBarcode("");
        }
      } else {
        setDSalesNoInvoiceData([]);
      }
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.response?.data?.Message ||
        error?.response?.data?.error ||
        error?.message ||
        "No item code found with the given GTIN";

      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Btoc Customer Function
  const handleGetBtocCustomerBarcodes = async (e) => {
    e.preventDefault();

    if (!selectedBtocCustomer) {
      toast.error("Please select a B2C Customer");
      return;
    }
    setIsLoading(true);
    try {
      const response = await newRequest.get(
        `/itemCodes/v2/searchByGTIN?GTIN=${barcode}`
      );
      const data = response?.data?.data;

      if (data) {
        const { ItemCode, ProductSize, GTIN, EnglishName, ArabicName, id } =
          data;

        // call the second api
        const secondApiBody = {
          filter: {
            P_COMP_CODE: "SLIC",
            P_ITEM_CODE: ItemCode,
            P_CUST_CODE: selectedBtocCustomer?.CUST_CODE,
            P_GRADE_CODE_1: ProductSize,
          },
          M_COMP_CODE: "SLIC",
          M_USER_ID: "SYSADMIN",
          APICODE: "PRICELIST",
          M_LANG_CODE: "ENG",
        };

        try {
          const secondApiResponse = await ErpTeamRequest.post(
            "/slicuat05api/v1/getApi",
            secondApiBody,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
          const secondApiData = secondApiResponse?.data;

          // Check if the response contains an error message even with 200 status
          if (secondApiData?.Message && secondApiData.Message.includes("No Records Found")) {
            toast.error(secondApiData.Message);
            setBarcode("");
            return;
          }

          // Check if secondApiData is an array and has data
          if (!Array.isArray(secondApiData) || secondApiData.length === 0) {
            toast.error("No price information found for this item");
            setBarcode("");
            return;
          }

          // console.log(secondApiData);

          let storedData = sessionStorage.getItem("secondApiResponses");
          storedData = storedData ? JSON.parse(storedData) : {};

          const itemRates = secondApiData.map(
            (item) => item?.PRICELIST?.PLI_RATE
          );
          // Store the array of rates under the respective ItemCode
          storedData[ItemCode] = itemRates;

          sessionStorage.setItem(
            "secondApiResponses",
            JSON.stringify(storedData)
          );

          const itemPrice = itemRates.reduce((sum, rate) => sum + rate, 0);
          const vat = itemPrice * taxAmount / 100;
          const total = itemPrice + vat;
          // console.log(itemPrice);

          setDSalesNoInvoiceData((prevData) => {
            const existingItemIndex = prevData.findIndex(
              (item) => item.Barcode === GTIN
            );

            if (existingItemIndex !== -1) {
              const updatedData = [...prevData];
              updatedData[existingItemIndex] = {
                ...updatedData[existingItemIndex],
                Qty: updatedData[existingItemIndex].Qty + 1,
                Total:
                  (updatedData[existingItemIndex].Qty + 1) * (itemPrice + vat),
              };
              return updatedData;
            } else {
              // If the item is new, add it to the data array
              return [
                ...prevData,
                {
                  id: id,
                  SKU: ItemCode,
                  Barcode: GTIN,
                  Description: EnglishName,
                  DescriptionArabic: ArabicName,
                  ItemSize: ProductSize,
                  Qty: 1,
                  ItemPrice: itemPrice,
                  VAT: vat,
                  Total: total,
                },
              ];
            }
          });
        } catch (secondApiError) {
          const errorMessage =
            secondApiError?.response?.data ||
            secondApiError?.response?.data?.message ||
            secondApiError?.response?.data?.Message ||
            secondApiError?.message ||
            "An error occurred while calling the second API";

          toast.error(errorMessage);
          setBarcode("");
        }
      } else {
        setDSalesNoInvoiceData([]);
      }
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.response?.data?.Message ||
        error?.response?.data?.error ||
        error?.message ||
        "An error occurred";

      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // handleDelete
  const handleDSalesDelete = (index) => {
    setDSalesNoInvoiceData((prevData) =>
      prevData.filter((_, i) => i !== index)
    );
  };

  const [isCreatePopupVisible, setCreatePopupVisibility] = useState(false);
  const [storeDatagridData, setStoreDatagridData] = useState([]);
  const [storeInvoiceDatagridData, setStoreInvoiceDatagridData] = useState([]);
  const handleShowCreatePopup = () => {
    const isBuy2Get1Customer = selectedCustomeNameWithDirectInvoice?.CUST_NAME?.includes("Buy 2 Get 1 Free");

    const updatedData = data.map(item => ({
      ...item,
      ItemPrice: isBuy2Get1Customer ? (item.DiscountedPrice || item.ItemPrice) : item.ItemPrice,
      Total: isBuy2Get1Customer ?
        ((item.DiscountedPrice || item.ItemPrice) * item.Qty) :
        (item.ItemPrice * item.Qty)
    }));

    setStoreDatagridData(updatedData);
    setStoreInvoiceDatagridData([...invoiceData]);
    setCreatePopupVisibility(true);
  };

  const [apiResponse, setApiResponse] = useState(null);
  const [isOpenOtpPopupVisible, setIsOpenOtpPopupVisible] = useState(false);
  const handleShowOtpPopup = (response) => {
    setCreatePopupVisibility(false);
    setApiResponse(response);
    setIsOpenOtpPopupVisible(true);
  };

  const [isExchangeItemPopupVisible, setIsExchangeItemPopupVisible] =
    useState(false);
  const handleShowExhangeItemPopup = (rowData) => {
    if (!selectedTransactionCode?.TXN_CODE) {
      toast.error("Please select a transaction code first.");
      setIsExchangeItemPopupVisible(false);
      return;
    }

    if (!selectedCustomeNameWithDirectInvoice?.CUST_CODE && !selectedCustomerName?.CUSTOMERCODE) {
      toast.error("Please select a customer code first.");
      setIsExchangeItemPopupVisible(false);
      return;
    }

    setSelectedRowData(rowData);
    setIsExchangeItemPopupVisible(true);

  };

  const [
    isConfirmTransactionPopupVisible,
    setIsConfirmTransactionPopupVisible,
  ] = useState(false);
  const handleShowConfirmTransactionPopup = () => {
    setIsConfirmTransactionPopupVisible(true);
  };

  const [isMobileNumberPopupVisible, setIsMobileNumberPopupVisible] =
    useState(false);
  const handleShowMobileNumberPopup = () => {
    if (mobileNo) {
      setIsMobileNumberPopupVisible(true);
    } else {
      toast.info("Please enter a mobile number");
    }
  };

  const handleClearData = () => {
    setData([]);
  };



  const resetState = () => {
    setData([]);
    setBarcode("");
    setCustomerName("");
    setMobileNo("");
    setRemarks("");
    setVat("");
    setSelectedTransactionCode("");
    setInvoiceNumber(generateInvoiceNumber());

    setNetWithOutExchange(0);
    setTotalWithOutExchange(0);
    setTotolAmountWithoutExchange(0);

    setNetWithOutVatDSalesNoInvoice(0);
    setTotalWithOutVatDSalesNoInvoice(0);
    setTotolAmountWithoutVatDSalesNoInvoice(0);

    setExchangeData([]);
    setIsExchangeClick(false);
  };

  const [directSalesInvoiceDocumentNo, setDirectSalesInvoiceDocumentNo] =
    useState(null);
  const [directSalesReturnDocumentNo, setDirectSalesReturnDocumentNo] =
    useState(null);
  const [dSalesNoInvoice, setDSalesNoInvoice] = useState(null);

  // Add state for HeadSysId for each sales type
  const [directSalesInvoiceHeadSysId, setDirectSalesInvoiceHeadSysId] =
    useState(null);
  const [directSalesReturnHeadSysId, setDirectSalesReturnHeadSysId] =
    useState(null);
  const [dSalesNoInvoiceHeadSysId, setDSalesNoInvoiceHeadSysId] =
    useState(null);

  useEffect(() => {
    if (directSalesInvoiceDocumentNo) {
      console.log(
        "Updated Invoice DocNo Number:",
        directSalesInvoiceDocumentNo
      );
    }
    if (directSalesReturnDocumentNo) {
      console.log("Updated Return DocNo Number:", directSalesReturnDocumentNo);
    }
    if (dSalesNoInvoice) {
      console.log("Updated DSales DocNo Number:", dSalesNoInvoice);
    }
    if (directSalesInvoiceHeadSysId) {
      console.log("Updated HeadSysId for DSIN:", directSalesInvoiceHeadSysId);
    }
  }, [
    directSalesInvoiceDocumentNo,
    directSalesReturnDocumentNo,
    dSalesNoInvoice,
    directSalesInvoiceHeadSysId,
  ]);

  // This function handles updating document numbers and sysId for all types
  const handleDocumentNoUpdate = (newDocNo, newHeadSysId, salesType) => {
    if (salesType === "DIRECT SALES INVOICE") {
      setDirectSalesInvoiceDocumentNo(newDocNo);
      setDirectSalesInvoiceHeadSysId(newHeadSysId); // Assuming you have state for HeadSysId
    } else if (salesType === "DIRECT SALES RETURN") {
      setDirectSalesReturnDocumentNo(newDocNo);
      setDirectSalesReturnHeadSysId(newHeadSysId); // Assuming you have state for HeadSysId
    } else if (salesType === "DSALES NO INVOICE") {
      setDSalesNoInvoice(newDocNo);
      setDSalesNoInvoiceHeadSysId(newHeadSysId); // Assuming you have state for HeadSysId
    }
  };

  const insertInvoiceRecord = async (newDocumentNo, newHeadSysId, bankHeadSysId, transactionCode) => {
    try {
      let invoiceAllData;

      // Dynamically determine the CustomerCode based on the selected transaction code
      const customerCode =
        EX_TRANSACTION_CODES.includes(selectedTransactionCode?.TXN_CODE)
          ? selectedCustomerName?.CUSTOMERCODE // For EX/AX transactions
          : selectedCustomeNameWithDirectInvoice?.CUST_CODE; // For other transactions


      if (selectedSalesType === "DIRECT SALES INVOICE") {

        // Check if customer is eligible for discount
        const isBuy2Get1Customer = selectedCustomeNameWithDirectInvoice?.CUST_NAME?.includes("Buy 2 Get 1 Free");
        // Calculate total amount considering discounts if applicable
        const totalAmount = isBuy2Get1Customer ? parseFloat(netWithVat) : parseFloat(data.reduce((sum, item) => sum + (item.ItemPrice * item.Qty), 0));

        // Construct the master and details data for Sales Invoice
        const master = {

          InvoiceNo: invoiceNumber,
          Head_SYS_ID: `${newHeadSysId}`,
          DeliveryLocationCode: selectedLocation?.stockLocation,
          ItemSysID: data[0]?.SKU,
          TransactionCode: selectedTransactionCode?.TXN_CODE,
          CustomerCode: customerCode,
          SalesLocationCode: selectedLocation?.stockLocation,
          Remarks: remarks,
          TransactionType: "SALE INVOICE",
          UserID: slicUserData?.UserLoginID,
          MobileNo: mobileNo,
          TransactionDate: todayDate,
          VatNumber: vat,
          CustomerName: customerName,
          DocNo: newDocumentNo,
          PendingAmount: parseFloat(parseFloat(totalAmount).toFixed(2)),
          AdjAmount: parseFloat(parseFloat(totalAmount).toFixed(2)),

          zatcaPayment_mode_id: `${selectedPaymentMode?.code}`,
          zatcaPayment_mode_name: `${selectedPaymentMode?.name}`,
          BRV_REF_NO: `${bankHeadSysId}` || "",
        };

        const details = data.map((item, index) => ({
          Rec_Num: index + 1,
          TblSysNoID: 1000 + index,
          SNo: index + 1,
          DeliveryLocationCode: selectedLocation?.stockLocation,
          ItemSysID: item.SKU,
          InvoiceNo: invoiceNumber,
          Head_SYS_ID: `${newHeadSysId}`,
          TransactionCode: selectedTransactionCode?.TXN_CODE,
          CustomerCode: customerCode,
          SalesLocationCode: selectedLocation?.stockLocation,
          Remarks: item.Description,
          TransactionType: "SALE INVOICE",
          UserID: slicUserData?.UserLoginID,
          ItemSKU: item.SKU,
          ItemUnit: "PCS",
          ItemSize: item.ItemSize,
          ITEMRATE: isBuy2Get1Customer
            ? parseFloat((item.DiscountedPrice || item.ItemPrice).toFixed(2))
            : parseFloat(item.ItemPrice.toFixed(2)),

          ItemPrice: isBuy2Get1Customer
            ? parseFloat((item.DiscountedPrice || item.ItemPrice).toFixed(2))
            : parseFloat(item.ItemPrice.toFixed(2)),

          ItemQry: item.Qty,
          TransactionDate: todayDate,
        }));

        invoiceAllData = {
          master,
          details,
        };
      } else if (selectedSalesType === "DIRECT SALES RETURN") {
        // Check the last two digits of the transactionCode to decide which data to use
        const dataToUse = transactionCode.slice(-2) === "IN" ? exchangeData : invoiceData;

        // Determine the values for PendingAmount and AdjAmount based on transactionCode
        const amountToUse = transactionCode.slice(-2) === "IN" ? netWithVat : netWithOutVatExchange;

        // Dynamically set the ItemSysID based on the first item in the dataToUseDSales array
        const masterItemSysID = dataToUse[0]?.SKU || dataToUse[0]?.ItemCode;

        const currentInvoiceNumber =
          // transactionCode.slice(-2) === "IN" ? newInvoiceNumber : invoiceHeaderData?.invoiceHeader?.InvoiceNo;
          transactionCode.slice(-2) === "IN" ? invoiceNumber : invoiceHeaderData?.invoiceHeader?.InvoiceNo;

        // Construct the master and details data for Sales Return
        const master = {
          InvoiceNo:
            invoiceHeaderData?.invoiceHeader?.InvoiceNo || invoiceNumber,
          // InvoiceNo: currentInvoiceNumber, 
          Head_SYS_ID: `${newHeadSysId}`,
          DeliveryLocationCode: selectedLocation?.stockLocation,
          ItemSysID: masterItemSysID,
          // TransactionCode: selectedTransactionCode?.TXN_CODE,
          TransactionCode: transactionCode,
          CustomerCode: customerCode,
          SalesLocationCode: selectedLocation?.stockLocation,
          Remarks: remarks,
          TransactionType: "RETURN",
          UserID: slicUserData?.UserLoginID,
          MobileNo: mobileNo,
          TransactionDate: todayDate,
          CustomerName: invoiceHeaderData?.invoiceHeader?.CustomerName,
          DocNo: newDocumentNo,
          PendingAmount: parseFloat(parseFloat(amountToUse).toFixed(2)),
          AdjAmount: parseFloat(parseFloat(amountToUse).toFixed(2)),

          zatcaPayment_mode_id: `${selectedPaymentMode?.code}`,
          zatcaPayment_mode_name: `${selectedPaymentMode?.name}`,
          BRV_REF_NO: `${bankHeadSysId}` || "",
        };

        const details = dataToUse.map((item, index) => ({
          Rec_Num: index + 1,
          TblSysNoID: 1000 + index,
          SNo: index + 1,
          DeliveryLocationCode: selectedLocation?.stockLocation,
          ItemSysID: item.SKU || item.ItemCode,
          InvoiceNo: invoiceHeaderData?.invoiceHeader?.InvoiceNo || invoiceNumber,
          // InvoiceNo: currentInvoiceNumber,
          Head_SYS_ID: `${newHeadSysId}`,
          // TransactionCode: selectedTransactionCode?.TXN_CODE,
          TransactionCode: transactionCode,
          CustomerCode: customerCode,
          SalesLocationCode: selectedLocation?.stockLocation,
          Remarks: item.Description,
          TransactionType: "RETURN",
          UserID: slicUserData?.UserLoginID,
          // ItemSKU: isExchangeClick ? item.ItemCode : item.SKU,
          ItemSKU: isExchangeClick ? item.SKU : item.SKU,
          ItemUnit: "PCS",
          ItemSize: item.ItemSize,
          ITEMRATE: parseFloat(item.ItemPrice.toFixed(2)),
          ItemPrice: parseFloat(item.ItemPrice.toFixed(2)),
          ItemQry: item.Qty,
          TransactionDate: todayDate,
        }));

        console.log(details);

        invoiceAllData = {
          master,
          details,
        };
      } else if (selectedSalesType === "DSALES NO INVOICE") {
        // Check the last two digits of the transactionCode to decide which data to use
        const dataToUseDSales = transactionCode.slice(-2) === "IN" ? dSalesNoInvoiceexchangeData : DSalesNoInvoiceData;

        // Determine the values for PendingAmount and AdjAmount based on transactionCode
        const amountToUse = transactionCode.slice(-2) === "IN" ? netWithVat : netWithOutVatDSalesNoInvoice;

        // Dynamically set the ItemSysID based on the first item in the dataToUseDSales array
        const masterItemSysID = dataToUseDSales[0]?.SKU || dataToUseDSales[0]?.ItemCode;

        const currentInvoiceNumber =
          transactionCode.slice(-2) === "IN" ? newInvoiceNumber : invoiceNumber;

        // Construct the master and details data for DSALES NO INVOICE
        const master = {
          InvoiceNo: invoiceNumber,
          // InvoiceNo: currentInvoiceNumber,
          Head_SYS_ID: `${newHeadSysId}`,
          DeliveryLocationCode: selectedLocation?.stockLocation,
          ItemSysID: masterItemSysID,
          TransactionCode: transactionCode,
          CustomerCode: customerCode,
          SalesLocationCode: selectedLocation?.stockLocation,
          Remarks: remarks,
          TransactionType: "DSALES NO INVOICE",
          UserID: slicUserData?.UserLoginID,
          MobileNo: mobileNo,
          TransactionDate: todayDate,
          VatNumber: vat,
          CustomerName: customerName,
          DocNo: newDocumentNo,
          PendingAmount: parseFloat(parseFloat(amountToUse).toFixed(2)),
          AdjAmount: parseFloat(parseFloat(amountToUse).toFixed(2)),

          zatcaPayment_mode_id: `${selectedPaymentMode?.code}`,
          zatcaPayment_mode_name: `${selectedPaymentMode?.name}`,
          BRV_REF_NO: `${bankHeadSysId}` || "",
        };
        const details = dataToUseDSales.map((item, index) => ({
          Rec_Num: index + 1,
          TblSysNoID: 1000 + index,
          SNo: index + 1,
          DeliveryLocationCode: selectedLocation?.stockLocation,
          ItemSysID: item.SKU || item.ItemCode,
          InvoiceNo: invoiceNumber,
          // InvoiceNo: currentInvoiceNumber,
          Head_SYS_ID: `${newHeadSysId}`,
          TransactionCode: transactionCode,
          CustomerCode: customerCode,
          SalesLocationCode: selectedLocation?.stockLocation,
          Remarks: item.Description,
          TransactionType: "DSALES NO INVOICE",
          UserID: slicUserData?.UserLoginID,
          ItemSKU: isExchangeDSalesClick ? item.SKU : item.SKU,
          ItemUnit: "PCS",
          ItemSize: item.ItemSize,
          ITEMRATE: parseFloat(item.ItemPrice.toFixed(2)),
          ItemPrice: parseFloat(item.ItemPrice.toFixed(2)),
          ItemQry: item.Qty,
          TransactionDate: todayDate,
        }));

        invoiceAllData = {
          master,
          details,
        };
      } else if (selectedSalesType === "BTOC CUSTOMER") {
        // Check the last two digits of the transactionCode to decide which data to use
        const dataToUseDSales = transactionCode.slice(-2) === "IN" ? dSalesNoInvoiceexchangeData : DSalesNoInvoiceData;

        // Determine the values for PendingAmount and AdjAmount based on transactionCode
        const amountToUse = transactionCode.slice(-2) === "IN" ? netWithVat : netWithOutVatDSalesNoInvoice;

        // Dynamically set the ItemSysID based on the first item in the dataToUseDSales array
        const masterItemSysID = dataToUseDSales[0]?.SKU || dataToUseDSales[0]?.ItemCode;

        const currentInvoiceNumber =
          transactionCode.slice(-2) === "IN" ? newInvoiceNumber : invoiceNumber;

        // Construct the master and details data for DSALES NO INVOICE
        const master = {
          InvoiceNo: invoiceNumber,
          Head_SYS_ID: `${newHeadSysId}`,
          DeliveryLocationCode: selectedLocation?.stockLocation,
          ItemSysID: masterItemSysID,
          TransactionCode: transactionCode,
          CustomerCode: customerCode,
          SalesLocationCode: selectedLocation?.stockLocation,
          Remarks: remarks,
          TransactionType: "B2C CUSTOMER",
          UserID: slicUserData?.UserLoginID,
          MobileNo: mobileNo,
          TransactionDate: todayDate,
          VatNumber: vat,
          CustomerName: customerName,
          DocNo: newDocumentNo,
          PendingAmount: parseFloat(parseFloat(amountToUse).toFixed(2)),
          AdjAmount: parseFloat(parseFloat(amountToUse).toFixed(2)),

          zatcaPayment_mode_id: `${selectedPaymentMode?.code}`,
          zatcaPayment_mode_name: `${selectedPaymentMode?.name}`,
          BRV_REF_NO: `${bankHeadSysId}` || "",
        };
        const details = dataToUseDSales.map((item, index) => ({
          Rec_Num: index + 1,
          TblSysNoID: 1000 + index,
          SNo: index + 1,
          DeliveryLocationCode: selectedLocation?.stockLocation,
          ItemSysID: item.SKU || item.ItemCode,
          InvoiceNo: invoiceNumber,
          Head_SYS_ID: `${newHeadSysId}`,
          TransactionCode: transactionCode,
          CustomerCode: customerCode,
          SalesLocationCode: selectedLocation?.stockLocation,
          Remarks: item.Description,
          TransactionType: "B2C CUSTOMER",
          UserID: slicUserData?.UserLoginID,
          ItemSKU: isExchangeDSalesClick ? item.SKU : item.SKU,
          // ItemUnit: "PCS",
          ItemSize: item.ItemSize,
          ITEMRATE: Number(Number(item.ItemPrice).toFixed(2)),
          ItemPrice: Number(Number(item.ItemPrice).toFixed(2)),

          ItemQry: item.Qty,
          TransactionDate: todayDate,
        }));

        invoiceAllData = {
          master,
          details,
        };
      }

      // Call the API to save the invoice or return record
      const saveInvoiceResponse = await newRequest.post(
        "/invoice/v1/saveInvoice",
        invoiceAllData
      );
      // console.log("invoice body", invoiceAllData);
      // console.log("Record saved successfully:", saveInvoiceResponse.data);

      toast.success(
        saveInvoiceResponse?.data?.message || "Invoice saved successfully"
      );
    } catch (error) {
      // console.error("Error saving record:", error);
      toast.error("Error saving record");
    }
  };

  // Invoice generation api
  const [netWithVat, setNetWithVat] = useState("");
  const [totalVat, setTotalVat] = useState("");
  const [totalAmountWithVat, setTotalAmountWithVat] = useState(0); // To store total amount with VAT

  // invoice state without Exchange
  const [netWithOutVatExchange, setNetWithOutExchange] = useState("");
  const [totalWithOutExchange, setTotalWithOutExchange] = useState("");
  const [totolAmountWithoutExchange, setTotolAmountWithoutExchange] =
    useState(0);

  // DSales state without exchange
  const [netWithOutVatDSalesNoInvoice, setNetWithOutVatDSalesNoInvoice] =
    useState("");
  const [totalWithOutVatDSalesNoInvoice, setTotalWithOutVatDSalesNoInvoice] =
    useState("");
  const [
    totolAmountWithoutVatDSalesNoInvoice,
    setTotolAmountWithoutVatDSalesNoInvoice,
  ] = useState(0);

  const [invoiceLoader, setInvoiceLoader] = useState(false);
  const [zatcaQrcode, setZatcaQrcode] = useState(null);
  const handleInvoiceGenerator = async (e) => {
    setInvoiceLoader(true);
    let payload = {};
    try {
      switch (selectedSalesType) {
        case "DIRECT SALES INVOICE":
          payload = {
            invoiceDate: todayDate,
            totalWithVat: parseFloat(parseFloat(totalAmountWithVat).toFixed(2)),
            vatTotal: parseFloat(parseFloat(totalVat).toFixed(2)),
          };
          break;

        case "DIRECT SALES RETURN":
          payload = {
            invoiceDate: todayDate,
            totalWithVat: parseFloat(parseFloat(totolAmountWithoutExchange).toFixed(2)),
            vatTotal: parseFloat(parseFloat(totalWithOutExchange).toFixed(2)),
          };
          break;

        case "DSALES NO INVOICE":
          payload = {
            invoiceDate: todayDate,
            totalWithVat: parseFloat(parseFloat(totolAmountWithoutVatDSalesNoInvoice).toFixed(2)),
            vatTotal: parseFloat(parseFloat(totalWithOutVatDSalesNoInvoice).toFixed(2)),
          };
          break;

        default:
          console.error("Unknown invoice type");
          setInvoiceLoader(false);
          return;
      }
      const res = await newRequest.post("/zatca/generateZatcaQRCode", payload);

      const qrCodeDataFromApi = res?.data?.qrCodeData;
      console.log(qrCodeDataFromApi);
      setZatcaQrcode(qrCodeDataFromApi);

      setIsConfirmDisabled(false);
      setIsTenderCashEnabled(false);
      toast.success("Invoice generated successfully!");
      setInvoiceLoader(false);
    } catch (err) {
      // console.log(err);
      toast.error(
        err?.response?.data?.error ||
        "An error occurred while generating the invoice"
      );
      setInvoiceLoader(false);
    }
  };

  const [zatchaQrcodeExchange, setZatchaQrcodeExchange] = useState(null);
  const handleZatcaInvoiceGenerator = async (e) => {
    setInvoiceLoader(true);

    // Check if either of the buttons is clicked
    if (!isExchangeClick && !isExchangeDSalesClick) {
      toast.error("Please select a valid action to proceed.");
      setInvoiceLoader(false);
      return;
    }

    let payload = {
      invoiceDate: todayDate,
      totalWithVat: parseFloat(Number(totalAmountWithVat.toFixed(2))),
      vatTotal: parseFloat(Number(totalVat).toFixed(2)),
    };

    try {
      const res = await newRequest.post("/zatca/generateZatcaQRCode", payload);
      const qrCodeDataFromApi = res?.data?.qrCodeData;
      console.log(qrCodeDataFromApi);
      setZatchaQrcodeExchange(qrCodeDataFromApi);

      toast.success("Invoice generated successfully!");
    } catch (err) {
      console.log(err);
      toast.error(
        err?.response?.data?.errors[0] ||
        "An error occurred while generating the invoice"
      );
    } finally {
      setInvoiceLoader(false);
    }
  };

  // Direct Sales Invoice with discount 
  useEffect(() => {
    const calculateTotals = () => {
      const totalQty = data.reduce((sum, item) => sum + item.Qty, 0);
      const discount = calculateDiscount(data, totalQty);
      const discountPerItem = totalQty === 3 ? discount / totalQty : 0;

      let totalNet = 0;
      let totalVat = 0;
      let totalAmount = 0;

      data.forEach((item) => {
        const discountedPrice = item.ItemPrice - discountPerItem;
        const itemVat = (discountedPrice * taxAmount) / 100;

        totalNet += discountedPrice * item.Qty;
        totalVat += itemVat * item.Qty;
        totalAmount += (discountedPrice + itemVat) * item.Qty;
      });

      setNetWithVat(totalNet.toFixed(2));
      setTotalVat(totalVat.toFixed(2));
      setTotalAmountWithVat(totalAmount.toFixed(2));
      setDiscountedTotal(discount.toFixed(2));
    };

    calculateTotals();
  }, [data, selectedCustomeNameWithDirectInvoice, taxAmount]);


  const [generatedPdfBlob, setGeneratedPdfBlob] = useState(null);
  const [isReceiptPrinted, setIsReceiptPrinted] = useState(false);

  // invoice generate
  const handlePrintSalesInvoice = async (qrCodeData) => {
    const newInvoiceNumber = generateInvoiceNumber();
    setInvoiceNumber(newInvoiceNumber);

    // Generate QR code data URL
    const qrCodeDataURL = await QRCode.toDataURL(`${invoiceNumber}`);

    const qrCodeDatazatca = await QRCode.toDataURL(`${qrCodeData}`);

    let totalsContent;

    if (selectedSalesType === "DIRECT SALES INVOICE") {
      const isBuy2Get1Customer = selectedCustomeNameWithDirectInvoice?.CUST_NAME?.includes("Buy 2 Get 1 Free");

      totalsContent = `
        <div>
          <strong>Gross:</strong>
          <div class="arabic-label">(ريال) المجموع</div>
          ${parseFloat(netWithVat).toFixed(2)}
        </div>
        <div>
          <strong>VAT (${taxAmount || 0}%):</strong>
          <div class="arabic-label">ضريبة القيمة المضافة</div>
          ${parseFloat(totalVat).toFixed(2)}
        </div>
        <div>
          <strong>Total Amount With VAT:</strong>
          <div class="arabic-label">المجموع</div>
          ${parseFloat(totalAmountWithVat).toFixed(2)}
        </div>
        <div>
          <strong>Paid:</strong>
          <div class="arabic-label">المدفوع</div>
          ${parseFloat(totalAmountWithVat).toFixed(2)}
        </div>
        ${isBuy2Get1Customer ? `
          <div>
            <strong>Discount:</strong>
            <div class="arabic-label">خصم</div>
            ${parseFloat(discountedTotal).toFixed(2)}
          </div>
        ` : ''}
        <div>
          <strong>Change Due:</strong>
          <div class="arabic-label">المتبقي</div>
          0.00
        </div>
      `;
    } else if (selectedSalesType === "DIRECT SALES RETURN") {
      totalsContent = `
        <div>
          <strong>Gross:</strong>
          <div class="arabic-label">(ريال) المجموع</div>
          ${parseFloat(netWithOutVatExchange).toFixed(2)}
        </div>
        <div>
          <strong>VAT (${taxAmount || 0}%):</strong>
          <div class="arabic-label">ضريبة القيمة المضافة</div>
          ${parseFloat(totalWithOutExchange).toFixed(2)}
        </div>
        <div>
          <strong>Total Amount With VAT:</strong>
          <div class="arabic-label">المجموع</div>
          ${parseFloat(totolAmountWithoutExchange).toFixed(2)}
        </div>
        <div>
          <strong>Paid:</strong>
          <div class="arabic-label">المدفوع</div>
          ${parseFloat(totolAmountWithoutExchange).toFixed(2)}
        </div>
        <div>
          <strong>Change Due:</strong>
          <div class="arabic-label">المتبقي</div>
          0.00
        </div>
      `;
    } else if (selectedSalesType === "DSALES NO INVOICE" || selectedSalesType === "BTOC CUSTOMER") {
      totalsContent = `
        <div>
          <strong>Gross:</strong>
          <div class="arabic-label">(ريال) المجموع</div>
          ${parseFloat(netWithOutVatDSalesNoInvoice).toFixed(2)}
        </div>
        <div>
          <strong>VAT (${taxAmount || 0}%):</strong>
          <div class="arabic-label">ضريبة القيمة المضافة</div>
          ${parseFloat(totalWithOutVatDSalesNoInvoice).toFixed(2)}
        </div>
        <div>
          <strong>Total Amount With VAT:</strong>
          <div class="arabic-label">المجموع</div>
          ${parseFloat(totolAmountWithoutVatDSalesNoInvoice).toFixed(2)}
        </div>
        <div>
          <strong>Paid:</strong>
          <div class="arabic-label">المدفوع</div>
          ${parseFloat(totolAmountWithoutVatDSalesNoInvoice).toFixed(2)}
        </div>
        <div>
          <strong>Change Due:</strong>
          <div class="arabic-label">المتبقي</div>
          0.00
        </div>
      `;
    }

    // console.log("selectedSalesType", selectedSalesType);
    // console.log("customerName", customerName);
    // console.log("vat", vat);
    // console.log("invoiceNumber", invoiceNumber);
    // console.log("currentTime", currentTime);
    // console.log("invoiceData", invoiceData);
    // console.log("DSalesNoInvoiceData", DSalesNoInvoiceData);

    const html = `
      <html>
        <head>
          <title>Sales Invoice</title>
          <style>
            @page { size: 3in 11in; margin: 0; }
            body { font-family: Arial, sans-serif; font-size: 15px; padding: 5px; }
            .invoice-header, .invoice-footer {
              text-align: center;
              font-size: 15px;
              margin-bottom: 5px;
            }
            .invoice-header {
              font-weight: bold;
            }
            .invoice-section {
              margin: 10px 0;
              font-size: 15px;
            }
            .sales-invoice-title {
              text-align: center;
              font-size: 16px;
              font-weight: bold;
              margin-top: 5px;
              margin-bottom: 10px;
            }
            .table {
              width: 100%;
              border-collapse: collapse;
              margin: 10px 0;
            }
            .table th,
            .table td {
              text-align: center; /* Center align for more symmetry */
              padding: 5px;
              border-bottom: 1px solid black;
              font-size: 15px;
            }

            .table th div {
              display: flex;
              justify-content: space-between;
              font-size: 15px;
            }

            .table th div span {
              font-family: 'Arial', sans-serif;
              text-align: center;
            }
            .total-section {
              font-size: 15px;
              padding: 10px 0;
              line-height: 1.5;
              text-align: left;
            }
            .left-side {
              display: flex;
              flex-direction: column;
              gap: 10px;
            }
            .left-side div {
              display: flex;
              align-items: center;
              justify-content: space-between;
            }
            .arabic-label {
              text-align: right;
              direction: rtl;
              margin-left: 10px;
              font-family: 'Arial', sans-serif;
              width: auto;
            }
            .qr-section {
              text-align: center;
              margin-top: 80px;
            }
            .receipt-footer {
              margin-top: 20px;
              text-align: center;
              font-weight: bold;
              font-size: 14px;
            }
            .customer-info div {
              margin-bottom: 6px; /* Add space between each div */
            }
              .field-label {
                font-weight: bold;
              }
             .customer-invoiceNumber {
              display: flex;
              align-items: center;
              justify-content: space-between;
            }
            .customer-invocieQrcode {
              margin-top: -5px;
            }
          </style>
        </head>
        <body>
          <div class="invoice-header">
            <img src="${sliclogo}" alt="SLIC Logo" width="120"/>
            <div>Saudi Leather Industries Factory Co.</div>
            <div>شركة مصنع الجلود السعودية</div>
            <div>VAT#: 300456416500003</div>
            <div>CR#: 2050011041</div>
            <div>CR#: ٢٠٥٠٠١١٠٤١</div>
            <div>Unit No 1, Dammam 34334 - 3844, Saudi Arabia</div>
            <div>Tel. Number: 013 8121066</div>
          </div>

          <div class="sales-invoice-title">
            ${selectedSalesType === "DIRECT SALES INVOICE"
        ? "Sales Invoice"
        : "CREDIT NOTE"
      }
          </div>
          
          <div class="customer-info">
            <div><span class="field-label">Customer: </span>
            ${selectedSalesType === "DIRECT SALES INVOICE" ||
        selectedSalesType === "DSALES NO INVOICE" ||
        selectedSalesType === "BTOC CUSTOMER"
        ? customerName
        : invoiceHeaderData?.invoiceHeader?.CustomerName
      }
            </div>
            <div style="display: flex; justify-content: space-between;">
              <div><span class="field-label">VAT#: </span>
                ${selectedSalesType === "DIRECT SALES INVOICE" ||
        selectedSalesType === "DSALES NO INVOICE" ||
        selectedSalesType === "BTOC CUSTOMER"
        ? vat
        : invoiceHeaderData?.invoiceHeader?.VatNumber
      }
              </div>
              <div class="arabic-label" style="text-align: right; direction: rtl;">
                <span class="field-label">الرقم الضريبي#:</span>
                  ${selectedSalesType === "DIRECT SALES INVOICE" ||
        selectedSalesType === "DSALES NO INVOICE" ||
        selectedSalesType === "BTOC CUSTOMER"
        ? vat
        : invoiceHeaderData?.invoiceHeader?.VatNumber
      }
              </div>
            </div>
            <div class="customer-invoiceNumber">
              <div>
                <div><span class="field-label">Receipt: </span>
                 ${selectedSalesType === "DIRECT SALES INVOICE" ||
        selectedSalesType === "DSALES NO INVOICE" ||
        selectedSalesType === "BTOC CUSTOMER"
        ? invoiceNumber
        : searchInvoiceNumber
      }
                </div>
                <div><span class="field-label">Date: </span>${currentTime}</div>
              </div>
              <div class="customer-invocieQrcode">
                <img src="${qrCodeDataURL}" alt="QR Code" height="75" width="100" />
              </div>
            </div>
          </div>

          <table class="table">
            <thead>
              <tr>
                <th>
                  <div style="display: flex; flex-direction: column; align-items: center;">
                    <span>بيان</span>
                    <span>Description</span>
                  </div>
                </th>
                <th>
                  <div style="display: flex; flex-direction: column; align-items: center;">
                    <span>الكمية</span>
                    <span>Qty</span>
                  </div>
                </th>
                <th>
                  <div style="display: flex; flex-direction: column; align-items: center;">
                    <span>السعر</span>
                    <span>Price</span>
                  </div>
                </th>
                <th>
                  <div style="display: flex; flex-direction: column; align-items: center;">
                    <span>المجموع</span>
                    <span>Total</span>
                  </div>
                </th>
              </tr>
            </thead>

           <tbody>
           ${selectedSalesType === "DIRECT SALES RETURN"
        ? invoiceData
          .map(
            (item) => `
                    <tr>
                      <td style="border-bottom: none;">${item.SKU}</td>
                      <td style="border-bottom: none;">${item.Qty}</td>
                      <td style="border-bottom: none;">${parseFloat(item.ItemPrice).toFixed(2)}</td>
                      <td style="border-bottom: none;">${(item.ItemPrice * item.Qty).toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td colspan="4" style="text-align: left; padding-left: 20px;">
                        <div>
                          <span style="direction: ltr; text-align: left; display: block;">
                            ${item.Description}
                          </span>
                          <span style="direction: rtl; text-align: right; display: block;">
                            ${item.DescriptionArabic}
                          </span>
                        </div>
                      </td>
                    </tr>
                  `
          )
          .join("")
        : selectedSalesType === "DSALES NO INVOICE" || selectedSalesType === "BTOC CUSTOMER"
          ? DSalesNoInvoiceData.map(
            (item) => `
                    <tr>
                      <td style="border-bottom: none;">${item.SKU}</td>
                      <td style="border-bottom: none;">${item.Qty}</td>
                      <td style="border-bottom: none;">${parseFloat(item.ItemPrice).toFixed(2)}</td>
                      <td style="border-bottom: none;">${(item.ItemPrice * item.Qty).toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td colspan="4" style="text-align: left; padding-left: 20px;">
                        <div>
                          <span style="direction: ltr; text-align: left; display: block;">
                            ${item.Description}
                          </span>
                          <span style="direction: rtl; text-align: right; display: block;">
                            ${item.DescriptionArabic}
                          </span>
                        </div>
                      </td>
                    </tr>
                  `
          ).join("")
          : data
            .map(
              (item) => `
                       <tr>
                        <td style="border-bottom: none;">${item.SKU}</td>
                        <td style="border-bottom: none;">${item.Qty}</td>
                        <td style="border-bottom: none;">${parseFloat(item.ItemPrice).toFixed(2)}</td>
                        <td style="border-bottom: none;">${(item.ItemPrice * item.Qty).toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td colspan="4" style="text-align: left; padding-left: 20px;">
                          <div>
                            <span style="direction: ltr; text-align: left; display: block;">
                              ${item.Description}
                            </span>
                            <span style="direction: rtl; text-align: right; display: block;">
                              ${item.DescriptionArabic}
                            </span>
                          </div>
                        </td>
                      </tr>
                     `
            )
            .join("")
      }          
            </tbody>
          </table>
          <div class="total-section">
            <div class="left-side">
               ${totalsContent}
            </div>
          </div>

          <div class="qr-section">
            <canvas id="qrcode-canvas"></canvas>
          </div>

          <div class="receipt-footer">This invoice is generated as per ZATCA</div>
        </body>
      </html>
    `;
    const printWindow = window.open("", "Print Window", "height=800,width=800");
    if (!printWindow) {
      console.error(
        "Failed to open the print window. It might be blocked by the browser."
      );
      return;
    }
    // Write the static HTML into the print window
    printWindow.document.write(html);
    printWindow.document.close();

    // Wait until the print window has loaded fully
    printWindow.onload = () => {
      const qrCodeCanvas = printWindow.document.getElementById("qrcode-canvas");
      QRCode.toCanvas(
        qrCodeCanvas,
        qrCodeData,
        { width: 380 },
        function (error) {
          if (error) console.error(error);
          else {
            // Trigger the print dialog after the QR code is rendered
            printWindow.print();
            printWindow.close();
            setIsReceiptPrinted(true);
          }
        }
      );
      // console.log(qrCodeData);
    };

    const whatsApphtml = `
      <html>
        <head>
          <title>Sales Invoice</title>
          <style>
            @page { size: 3in 11in; margin: 0; }
            body { font-family: Arial, sans-serif; font-size: 15px; padding: 5px; }
            .invoice-header, .invoice-footer {
              text-align: center;
              font-size: 15px;
              margin-bottom: 5px;
            }
            .invoice-header {
              font-weight: bold;
            }
            .invoice-logo {
              margin-left: 125px;
            }
            .invoice-section {
              margin: 10px 0;
              font-size: 15px;
            }
            .sales-invoice-title {
              text-align: center;
              font-size: 16px;
              font-weight: bold;
              margin-top: 5px;
              margin-bottom: 10px;
            }
            .table {
              width: 100%;
              border-collapse: collapse;
              margin: 10px 0;
            }
            .table th,
            .table td {
              text-align: center; /* Center align for more symmetry */
              padding: 5px;
              border-bottom: 1px solid black;
              font-size: 15px;
            }

            .table th div {
              display: flex;
              justify-content: space-between;
              font-size: 15px;
            }

            .table th div span {
              font-family: 'Arial', sans-serif;
              text-align: center;
            }
            .total-section {
              font-size: 15px;
              padding: 15px;
              line-height: 1.5;
              text-align: left;
            }
            .left-side {
              display: flex;
              flex-direction: column;
              gap: 10px;
            }
            .left-side div {
              display: flex;
              align-items: center;
              justify-content: space-between;
            }
            .arabic-label {
              text-align: right;
              direction: rtl;
              margin-left: 10px;
              font-family: 'Arial', sans-serif;
              width: auto;
            }
            .qr-section-whatsapp {
              display: flex;
              align-items: center;
              justify-content: center;
              text-align: center;
              margin-top: 80px;
            }
            .receipt-footer {
              margin-top: 20px;
              text-align: center;
              font-weight: bold;
              font-size: 14px;
            }
            .customer-info div {
              margin-bottom: 6px; /* Add space between each div */
              padding-left: 5px;
              padding-right: 5px;
            }
              .field-label {
                font-weight: bold;
              }
             .customer-invoiceNumber {
              display: flex;
              align-items: center;
              justify-content: space-between;
            }
            .customer-invocieQrcode {
              margin-top: -5px;
            }
          </style>
        </head>
        <body>
          <div class="invoice-header">
            <img class="invoice-logo" src="${sliclogo}" alt="SLIC Logo" width="120"/>
            <div>Saudi Leather Industries Factory Co.</div>
            <div>شركة مصنع الجلود السعودية</div>
            <div>VAT#: 300456416500003</div>
            <div>CR#: 2050011041</div>
            <div>CR#: ٢٠٥٠٠١١٠٤١</div>
            <div>Unit No 1, Dammam 34334 - 3844, Saudi Arabia</div>
            <div>Tel. Number: 013 8121066</div>
          </div>

          <div class="sales-invoice-title">
            ${selectedSalesType === "DIRECT SALES INVOICE"
        ? "Sales Invoice"
        : "CREDIT NOTE"
      }
          </div>
          
          <div class="customer-info">
            <div><span class="field-label">Customer: </span>
            ${selectedSalesType === "DIRECT SALES INVOICE" ||
        selectedSalesType === "DSALES NO INVOICE" ||
        selectedSalesType === "BTOC CUSTOMER"
        ? customerName
        : invoiceHeaderData?.invoiceHeader?.CustomerName
      }
            </div>
              <div style="display: flex; justify-content: space-between;">
                <div><span class="field-label">VAT#: </span>
                  ${selectedSalesType === "DIRECT SALES INVOICE" ||
        selectedSalesType === "DSALES NO INVOICE" ||
        selectedSalesType === "BTOC CUSTOMER"
        ? vat
        : invoiceHeaderData?.invoiceHeader?.VatNumber
      }
                </div>
                <div class="arabic-label" style="text-align: right; direction: rtl;">
                  <span class="field-label">الرقم الضريبي#:</span>
                    ${selectedSalesType === "DIRECT SALES INVOICE" ||
        selectedSalesType === "DSALES NO INVOICE" ||
        selectedSalesType === "BTOC CUSTOMER"
        ? vat
        : invoiceHeaderData?.invoiceHeader?.VatNumber
      }
                  </div>
                </div>
                <div class="customer-invoiceNumber">
                  <div>
                    <div><span class="field-label">Receipt: </span>
                    ${selectedSalesType === "DIRECT SALES INVOICE" ||
        selectedSalesType === "DSALES NO INVOICE" ||
        selectedSalesType === "BTOC CUSTOMER"
        ? invoiceNumber
        : searchInvoiceNumber
      }
                  </div>
                  <div><span class="field-label">Date: </span>${currentTime}</div>
                </div>
                <div class="customer-invocieQrcode">
                  <img src="${qrCodeDataURL}" alt="QR Code" height="75" width="100" />
                </div>
              </div>
          </div>

          <table class="table">
            <thead>
              <tr>
                <th>
                  <div style="display: flex; flex-direction: column; align-items: center;">
                    <span>بيان</span>
                    <span>Description</span>
                  </div>
                </th>
                <th>
                  <div style="display: flex; flex-direction: column; align-items: center;">
                    <span>الكمية</span>
                    <span>Qty</span>
                  </div>
                </th>
                <th>
                  <div style="display: flex; flex-direction: column; align-items: center;">
                    <span>السعر</span>
                    <span>Price</span>
                  </div>
                </th>
                <th>
                  <div style="display: flex; flex-direction: column; align-items: center;">
                    <span>المجموع</span>
                    <span>Total</span>
                  </div>
                </th>
              </tr>
            </thead>

           <tbody>
           ${selectedSalesType === "DIRECT SALES RETURN"
        ? invoiceData
          .map(
            (item) => `
                    <tr>
                      <td style="border-bottom: none;">${item.SKU}</td>
                      <td style="border-bottom: none;">${item.Qty}</td>
                      <td style="border-bottom: none;">${parseFloat(item.ItemPrice).toFixed(2)}</td>
                      <td style="border-bottom: none;">${(item.ItemPrice * item.Qty).toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td colspan="4" style="text-align: left; padding-left: 20px;">
                        <div>
                          <span style="direction: ltr; text-align: left; display: block;">
                            ${item.Description}
                          </span>
                          <span style="direction: rtl; text-align: right; display: block;">
                            ${item.DescriptionArabic}
                          </span>
                        </div>
                      </td>
                    </tr>
                  `
          )
          .join("")
        : selectedSalesType === "DSALES NO INVOICE" || selectedSalesType === "BTOC CUSTOMER"
          ? DSalesNoInvoiceData.map(
            (item) => `
                    <tr>
                      <td style="border-bottom: none;">${item.SKU}</td>
                      <td style="border-bottom: none;">${item.Qty}</td>
                      <td style="border-bottom: none;">${parseFloat(item.ItemPrice).toFixed(2)}</td>
                      <td style="border-bottom: none;">${(item.ItemPrice * item.Qty).toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td colspan="4" style="text-align: left; padding-left: 20px;">
                        <div>
                          <span style="direction: ltr; text-align: left; display: block;">
                            ${item.Description}
                          </span>
                          <span style="direction: rtl; text-align: right; display: block;">
                            ${item.DescriptionArabic}
                          </span>
                        </div>
                      </td>
                    </tr>
                  `
          ).join("")
          : data
            .map(
              (item) => `
                       <tr>
                        <td style="border-bottom: none;">${item.SKU}</td>
                        <td style="border-bottom: none;">${item.Qty}</td>
                        <td style="border-bottom: none;">${parseFloat(item.ItemPrice).toFixed(2)}</td>
                        <td style="border-bottom: none;">${(item.ItemPrice * item.Qty).toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td colspan="4" style="text-align: left; padding-left: 20px;">
                          <div>
                            <span style="direction: ltr; text-align: left; display: block;">
                              ${item.Description}
                            </span>
                            <span style="direction: rtl; text-align: right; display: block;">
                              ${item.DescriptionArabic}
                            </span>
                          </div>
                        </td>
                      </tr>
                     `
            )
            .join("")
      }          
            </tbody>
          </table>
          <div class="total-section">
            <div class="left-side">
               ${totalsContent}
            </div>
          </div>

          <div class="qr-section-whatsapp">
            <img src="${qrCodeDatazatca}" alt="QR Code" height="225" width="300" />
          </div>

          <div class="receipt-footer">This invoice is generated as per ZATCA</div>
        </body>
      </html>
    `;

    // Generate PDF from the same HTML content for WhatsApp
    const pdfOptions = {
      margin: 0,
      filename: "sales_invoice.pdf",
      image: { type: "jpeg", quality: 1.0 },
      html2canvas: {
        scale: 2, // Increase scale to ensure higher fidelity
        useCORS: true, // Ensure CORS handling for images like logos
      },
      jsPDF: { unit: "in", format: [4, 16], orientation: "portrait" },
    };
    const pdfBlob = await html2pdf()
      .from(whatsApphtml)
      .set(pdfOptions)
      .outputPdf("blob");

    setGeneratedPdfBlob(pdfBlob);
  };

  const [directInvoiceWhatsAppLoader, setDirectInvoiceWhatsAppLoader] =
    useState(false);
  const sendWhatsAppInvoice = async () => {
    if (!isReceiptPrinted) {
      toast.error("Please print the receipt first!");
      return;
    }

    if (!generatedPdfBlob) {
      toast.error("No invoice available to send.");
    }

    setDirectInvoiceWhatsAppLoader(true);

    try {
      const formData = new FormData();
      formData.append("phoneNumber", mobileNo);
      const pdfFile = new File([generatedPdfBlob], "Sales_Invoice.pdf", {
        type: "application/pdf",
      });
      formData.append("attachment", pdfFile);
      formData.append("messageText", "SLIC invoice");

      const response = await newRequest.post(
        "/whatsapp/sendWhatsAppMessage",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      // console.log(response?.data);
      toast.success("Invoice sent to WhatsApp successfully!");
      setDirectInvoiceWhatsAppLoader(false);
    } catch (error) {
      toast.error(error?.response?.data?.error || "Error sending WhatsApp message");
      setDirectInvoiceWhatsAppLoader(false);
      // console.error("Error:", error);
    }
  };

  const [generatedPdfForExchange, setGeneratedPdfForExchange] = useState(null);
  const [isReceiptPrintedExchange, setIsReceiptPrintedExchange] = useState(false);

  // exchange Item invoice
  const handlePrintExchangeInvoice = async (qrCodeData) => {
    if (!isExchangeClick && !isExchangeDSalesClick) return;

    const printWindow = window.open("", "Print Window", "height=800,width=800");

    // Generate QR code data URL
    const qrCodeDataURL = await QRCode.toDataURL(`${selectedSalesType === "DSALES NO INVOICE" || selectedSalesType === "BTOC CUSTOMER"
      ? invoiceNumber
      : searchInvoiceNumber}`);

    const qrCodeDatazatcaExchange = await QRCode.toDataURL(`${qrCodeData}`);

    // Use exchange data or DSales exchange data based on the exchange type
    const exchangeDataToUse = isExchangeClick
      ? exchangeData
      : dSalesNoInvoiceexchangeData;

    // Generate totals for exchange invoice
    const totalsContent = `
      <div>
        <strong>Gross:</strong>
        <div class="arabic-label">(ريال) المجموع</div>
        ${netWithVat.toFixed(2)}
      </div>
      <div>
        <strong>VAT (${taxAmount || 0}%):</strong>
        <div class="arabic-label">ضريبة القيمة المضافة</div>
        ${totalVat.toFixed(2)}
      </div>
      <div>
        <strong>Total Amount With VAT:</strong>
        <div class="arabic-label">المجموع</div>
        ${totalAmountWithVat.toFixed(2)}
      </div>
      <div>
        <strong>Paid:</strong>
        <div class="arabic-label">المدفوع</div>
        ${totalAmountWithVat.toFixed(2)}
      </div>
      <div>
        <strong>Change Due:</strong>
        <div class="arabic-label">المتبقي</div>
        0.00
      </div>
    `;

    // Generate the exchange invoice HTML
    const html = `
      <html>
        <head>
          <title>Exchange Invoice</title>
          <style>
            @page { size: 3in 11in; margin: 0; }
            body { font-family: Arial, sans-serif; font-size: 15px; padding: 5px; }
            .invoice-header, .invoice-footer {
              text-align: center;
              font-size: 15px;
              margin-bottom: 5px;
            }
            .invoice-header {
              font-weight: bold;
            }
            .invoice-section {
              margin: 10px 0;
              font-size: 15px;
            }
            .sales-invoice-title {
              text-align: center;
              font-size: 16px;
              font-weight: bold;
              margin-top: 5px;
              margin-bottom: 10px;
            }
            .table {
              width: 100%;
              border-collapse: collapse;
              margin: 10px 0;
            }
            .table th,
            .table td {
              text-align: center; /* Center align for more symmetry */
              padding: 5px;
              border-bottom: 1px solid black;
              font-size: 15px;
            }

            .table th div {
              display: flex;
              justify-content: space-between;
              font-size: 15px;
            }

            .table th div span {
              font-family: 'Arial', sans-serif;
              text-align: center;
            }
            .total-section {
              font-size: 15px;
              padding: 10px 0;
              line-height: 1.5;
              text-align: left;
            }
            .left-side {
              display: flex;
              flex-direction: column;
              gap: 10px;
            }
            .left-side div {
              display: flex;
              align-items: center;
              justify-content: space-between;
            }
            .arabic-label {
              text-align: right;
              direction: rtl;
              margin-left: 10px;
              font-family: 'Arial', sans-serif;
              width: auto;
            }
            .qr-section {
              text-align: center;
              margin-top: 80px;
            }
            .receipt-footer {
              margin-top: 20px;
              text-align: center;
              font-weight: bold;
              font-size: 14px;
            }
            .customer-info div {
              margin-bottom: 6px; /* Add space between each div */
            }
              .field-label {
                font-weight: bold;
              }
             .customer-invoiceNumber {
              display: flex;
              align-items: center;
              justify-content: space-between;
            }
            .customer-invocieQrcode {
              margin-top: -5px;
            }
          </style>
        </head>
        <body>
          <div class="invoice-header">
            <img src="${sliclogo}" alt="SLIC Logo" width="120"/>
            <div>Saudi Leather Industries Factory Co.</div>
            <div>شركة مصنع الجلود السعودية</div>
            <div>VAT#: 300456416500003</div>
            <div>CR#: 2050011041</div>
            <div>CR#: ٢٠٥٠٠١١٠٤١</div>
            <div>السجل التجاري#: 2050011041</div>
            <div>Unit No 1, Dammam 34334 - 3844, Saudi Arabia</div>
            <div>Tel. Number: 013 8121066</div>
          </div>

          <div class="sales-invoice-title">Sales Invoice</div>
          
          <div class="customer-info">
            <div><span class="field-label">Customer: </span>
            ${selectedSalesType === "DSALES NO INVOICE" || selectedSalesType === "BTOC CUSTOMER"
        ? customerName
        : invoiceHeaderData?.invoiceHeader?.CustomerName
      }
            </div>
            <div style="display: flex; justify-content: space-between;">
              <div><span class="field-label">VAT#: </span>
                ${selectedSalesType === "DSALES NO INVOICE" || selectedSalesType === "BTOC CUSTOMER"
        ? vat
        : invoiceHeaderData?.invoiceHeader?.VatNumber
      }
              </div>
              <div class="arabic-label" style="text-align: right; direction: rtl;">
                <span class="field-label">الرقم الضريبي#:</span>
                  ${selectedSalesType === "DSALES NO INVOICE" || selectedSalesType === "BTOC CUSTOMER"
        ? vat
        : invoiceHeaderData?.invoiceHeader?.VatNumber
      }
              </div>
            </div>
            <div class="customer-invoiceNumber">
              <div>
                <div><span class="field-label">Receipt: </span>${selectedSalesType === "DSALES NO INVOICE" || selectedSalesType === "BTOC CUSTOMER"
        ? invoiceNumber
        : searchInvoiceNumber}</div>
                <div><span class="field-label">Date: </span>${currentTime}</div>
              </div>
              <div class="customer-invocieQrcode">
                <img src="${qrCodeDataURL}" alt="QR Code" height="75" width="100" />
              </div>
            </div>
          </div>

          <table class="table">
            <thead>
              <tr>
                <th>
                  <div style="display: flex; flex-direction: column; align-items: center;">
                    <span>بيان</span>
                    <span>Description</span>
                  </div>
                </th>
                <th>
                  <div style="display: flex; flex-direction: column; align-items: center;">
                    <span>الكمية</span>
                    <span>Qty</span>
                  </div>
                </th>
                <th>
                  <div style="display: flex; flex-direction: column; align-items: center;">
                    <span>السعر</span>
                    <span>Price</span>
                  </div>
                </th>
                <th>
                  <div style="display: flex; flex-direction: column; align-items: center;">
                    <span>المجموع</span>
                    <span>Total</span>
                  </div>
                </th>
              </tr>
            </thead>

            <tbody>
              ${exchangeDataToUse
        .map(
          (item) => `
                  <tr>
                    <td style="border-bottom: none;">${item.SKU}</td>
                    <td style="border-bottom: none;">${item.Qty}</td>
                    <td style="border-bottom: none;">${parseFloat(item.ItemPrice).toFixed(2)}</td>
                    <td style="border-bottom: none;">${parseFloat(item.Total).toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td colspan="4" style="text-align: left; padding-left: 20px;">
                      <div>
                        <span style="direction: ltr; text-align: left; display: block;">
                          ${item.Description}
                        </span>
                        <span style="direction: rtl; text-align: right; display: block;">
                          ${item.DescriptionArabic}
                        </span>
                      </div>
                    </td>
                  </tr>
                `
        )
        .join("")}
            </tbody>
          </table>
          <div class="total-section">
            <div class="left-side">
               ${totalsContent}
            </div>
          </div>

          <div class="qr-section">
            <canvas id="qrcode-canvas"></canvas>
          </div>

          <div class="receipt-footer">This invoice is generated as per ZATCA</div>
        </body>
      </html>
    `;

    // Write the static HTML into the print window
    printWindow.document.write(html);
    printWindow.document.close();

    // Wait until the print window has loaded fully
    printWindow.onload = () => {
      const qrCodeCanvas = printWindow.document.getElementById("qrcode-canvas");
      QRCode.toCanvas(
        qrCodeCanvas,
        qrCodeData,
        { width: 380 },
        function (error) {
          if (error) console.error(error);
          else {
            setIsReceiptPrintedExchange(true);
            printWindow.print();
            printWindow.close();
          }
        }
      );
    };


    const whatsAppExchangehtml = `
      <html>
        <head>
          <title>Exchange Invoice</title>
          <style>
            @page { size: 3in 11in; margin: 0; }
            body { font-family: Arial, sans-serif; font-size: 15px; padding: 5px; }
            .invoice-header, .invoice-footer {
              text-align: center;
              font-size: 15px;
              margin-bottom: 5px;
            }
            .invoice-header {
              font-weight: bold;
            }
            .invoice-logo {
              margin-left: 125px;
            }
            .invoice-section {
              margin: 10px 0;
              font-size: 15px;
            }
            .sales-invoice-title {
              text-align: center;
              font-size: 16px;
              font-weight: bold;
              margin-top: 5px;
              margin-bottom: 10px;
            }
            .table {
              width: 100%;
              border-collapse: collapse;
              margin: 10px 0;
            }
            .table th,
            .table td {
              text-align: center; /* Center align for more symmetry */
              padding: 5px;
              border-bottom: 1px solid black;
              font-size: 15px;
            }

            .table th div {
              display: flex;
              justify-content: space-between;
              font-size: 15px;
            }

            .table th div span {
              font-family: 'Arial', sans-serif;
              text-align: center;
            }
            .total-section {
              font-size: 15px;
              padding: 15px;
              line-height: 1.5;
              text-align: left;
            }
            .left-side {
              display: flex;
              flex-direction: column;
              gap: 10px;
            }
            .left-side div {
              display: flex;
              align-items: center;
              justify-content: space-between;
            }
            .arabic-label {
              text-align: right;
              direction: rtl;
              margin-left: 10px;
              font-family: 'Arial', sans-serif;
              width: auto;
            }
            .qr-section-whatsapp {
              display: flex;
              align-items: center;
              justify-content: center;
              text-align: center;
              margin-top: 80px;
            }
            .receipt-footer {
              margin-top: 20px;
              text-align: center;
              font-weight: bold;
              font-size: 14px;
            }
            .customer-info div {
              margin-bottom: 6px; /* Add space between each div */
              padding-left: 5px;
              padding-right: 5px;
            }
            .field-label {
              font-weight: bold;
            }
            .customer-invoiceNumber {
              display: flex;
              align-items: center;
              justify-content: space-between;
            }
            .customer-invocieQrcode {
              margin-top: -5px;
            }
          </style>
        </head>
        <body>
          <div class="invoice-header">
            <img class="invoice-logo" src="${sliclogo}" alt="SLIC Logo" width="120"/>
            <div>Saudi Leather Industries Factory Co.</div>
            <div>شركة مصنع الجلود السعودية</div>
            <div>VAT#: 300456416500003</div>
            <div>CR#: 2050011041</div>
            <div>CR#: ٢٠٥٠٠١١٠٤١</div>
            <div>السجل التجاري#: 2050011041</div>
            <div>Unit No 1, Dammam 34334 - 3844, Saudi Arabia</div>
            <div>Tel. Number: 013 8121066</div>
          </div>

          <div class="sales-invoice-title">Sales Invoice</div>
          
          <div class="customer-info">
            <div><span class="field-label">Customer: </span>
            ${selectedSalesType === "DSALES NO INVOICE" || selectedSalesType === "BTOC CUSTOMER"
        ? customerName
        : invoiceHeaderData?.invoiceHeader?.CustomerName
      }
            </div>
            <div style="display: flex; justify-content: space-between;">
              <div><span class="field-label">VAT#: </span>
                ${selectedSalesType === "DSALES NO INVOICE" || selectedSalesType === "BTOC CUSTOMER"
        ? vat
        : invoiceHeaderData?.invoiceHeader?.VatNumber
      }
              </div>
              <div class="arabic-label" style="text-align: right; direction: rtl;">
                <span class="field-label">الرقم الضريبي#:</span>
                  ${selectedSalesType === "DSALES NO INVOICE" || selectedSalesType === "BTOC CUSTOMER"
        ? vat
        : invoiceHeaderData?.invoiceHeader?.VatNumber
      }
              </div>
            </div>
            <div class="customer-invoiceNumber">
              <div>
                <div><span class="field-label">Receipt: </span>${selectedSalesType === "DSALES NO INVOICE" || selectedSalesType === "BTOC CUSTOMER"
        ? invoiceNumber
        : searchInvoiceNumber}</div>
                <div><span class="field-label">Date: </span>${currentTime}</div>
              </div>
              <div class="customer-invocieQrcode">
                <img src="${qrCodeDataURL}" alt="QR Code" height="75" width="100" />
              </div>
            </div>
          </div>

          <table class="table">
            <thead>
              <tr>
                <th>
                  <div style="display: flex; flex-direction: column; align-items: center;">
                    <span>بيان</span>
                    <span>Description</span>
                  </div>
                </th>
                <th>
                  <div style="display: flex; flex-direction: column; align-items: center;">
                    <span>الكمية</span>
                    <span>Qty</span>
                  </div>
                </th>
                <th>
                  <div style="display: flex; flex-direction: column; align-items: center;">
                    <span>السعر</span>
                    <span>Price</span>
                  </div>
                </th>
                <th>
                  <div style="display: flex; flex-direction: column; align-items: center;">
                    <span>المجموع</span>
                    <span>Total</span>
                  </div>
                </th>
              </tr>
            </thead>

            <tbody>
              ${exchangeDataToUse
        .map(
          (item) => `
                  <tr>
                    <td style="border-bottom: none;">${item.SKU}</td>
                    <td style="border-bottom: none;">${item.Qty}</td>
                    <td style="border-bottom: none;">${parseFloat(item.ItemPrice).toFixed(2)}</td>
                    <td style="border-bottom: none;">${parseFloat(item.Total).toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td colspan="4" style="text-align: left; padding-left: 20px;">
                      <div>
                        <span style="direction: ltr; text-align: left; display: block;">
                          ${item.Description}
                        </span>
                        <span style="direction: rtl; text-align: right; display: block;">
                          ${item.DescriptionArabic}
                        </span>
                      </div>
                    </td>
                  </tr>
                `
        )
        .join("")}
            </tbody>
          </table>
          <div class="total-section">
            <div class="left-side">
               ${totalsContent}
            </div>
          </div>

          <div class="qr-section-whatsapp">
            <img src="${qrCodeDatazatcaExchange}" alt="QR Code" height="225" width="300" />
          </div>

          <div class="receipt-footer">This invoice is generated as per ZATCA</div>
        </body>
      </html>
    `;

    // Generate PDF from the same HTML content for WhatsApp
    const pdfOptions = {
      margin: 0,
      filename: "sales_invoice.pdf",
      image: { type: "jpeg", quality: 1.0 },
      html2canvas: {
        scale: 2,
        useCORS: true,
      },
      jsPDF: { unit: "in", format: [4, 16], orientation: "portrait" },
    };
    const pdfBlob = await html2pdf().from(whatsAppExchangehtml).set(pdfOptions).outputPdf("blob");

    setGeneratedPdfForExchange(pdfBlob);
  };



  const [exhchangeWhatsAppInvoiceLoader, setExhchangeWhatsAppInvoiceLoader] =
    useState(false);
  const sendWhatsAppExchangeInvoice = async () => {
    if (!isReceiptPrintedExchange) {
      toast.error("Please print the receipt first!");
      return;
    }

    if (!generatedPdfForExchange) {
      toast.error("No invoice available to send.");
    }

    setExhchangeWhatsAppInvoiceLoader(true);

    try {
      const formData = new FormData();
      formData.append("phoneNumber", mobileNo);
      const pdfFile = new File([generatedPdfForExchange], "Sales_Invoice.pdf", {
        type: "application/pdf",
      });
      formData.append("attachment", pdfFile);
      formData.append("messageText", "SLIC Exchange invoice");

      const response = await newRequest.post(
        "/whatsapp/sendWhatsAppMessage",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      // console.log(response?.data);
      toast.success("Invoice sent to WhatsApp successfully!");
      setExhchangeWhatsAppInvoiceLoader(false);
    } catch (error) {
      toast.error(error?.response?.data?.error || "Error sending WhatsApp message");
      setExhchangeWhatsAppInvoiceLoader(false);
      // console.error("Error:", error);
    }
  };




  // Direct Sales Return InvoiceData Datagrid
  const [searchInvoiceNumber, setSearchInvoiceNumber] = useState("");
  const [invoiceData, setInvoiceData] = useState([]);
  const [invoiceHeaderData, setInvoiceHeaderData] = useState([]);
  const [invoiceDataLoader, setInvoiceDataLoader] = useState("");
  // Fetch invoice details when searching by invoice number for a sales return
  const handleGetInvoiceDetails = async (invoiceNo) => {
    setInvoiceDataLoader(true);

    try {
      const response = await newRequest.get(
        `/invoice/v1/headers-and-line-items?InvoiceNo=${invoiceNo}&TransactionCode=IN`
      );
      const data = response?.data?.data;
      setInvoiceHeaderData(data);
      console.log(data);
      setSearchInvoiceNumber(invoiceNo);
      if (data) {
        const invoiceDetails = data.invoiceDetails;
        setInvoiceData(
          invoiceDetails.map((item) => {
            const vat = item.ItemPrice * taxAmount / 100;
            const total = item.ItemPrice * item.ItemQry + vat * item.ItemQry;

            // Check if the transaction code is not "AXSR"
            const isAXSR = selectedTransactionCode?.TXN_CODE === "AXSR";
            const finalItemPrice = isAXSR ? 0 : item.ItemPrice;
            const finalVAT = isAXSR ? 0 : vat;
            const finalTotal = isAXSR ? 0 : total;

            return {
              id: item.id,
              SKU: item.ItemSKU,
              Barcode: item.InvoiceNo,
              Description: item.Remarks || "No description",
              DescriptionArabic: item.Remarks || "No description",
              ItemSize: item.ItemSize,
              Qty: item?.ItemQry,
              originalQty: item.ItemQry,
              ItemPrice: finalItemPrice,
              VAT: finalVAT,
              Total: finalTotal,
            };
          })
        );
      } else {
        setInvoiceData([]);
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "An error occurred");
    } finally {
      setInvoiceDataLoader(false);
    }
  };

  const handleSearchInvoice = (e) => {
    e.preventDefault();
    handleGetInvoiceDetails(searchInvoiceNumber);
  };

  // Sales return Calculation without exchange
  useEffect(() => {
    const calculateTotals = () => {
      let totalNet = 0;
      let totalVat = 0;

      invoiceData.forEach((item) => {
        // Calculate net amount (Item Price * Quantity)
        totalNet += parseFloat((item.ItemPrice * item.Qty).toFixed(2));

        // Use the VAT directly from the item and multiply by quantity
        totalVat += parseFloat((item.VAT * item.Qty).toFixed(2));
      });

      // Format the numbers with 2 decimal places
      const netAmount = totalNet.toFixed(2);
      const vatAmount = totalVat.toFixed(2);
      // Calculate total by adding the formatted numbers to match the grid's precision
      const totalAmount = (parseFloat(netAmount) + parseFloat(vatAmount)).toFixed(2);

      setNetWithOutExchange(netAmount);          // 65.00
      setTotalWithOutExchange(vatAmount);        // 9.75
      setTotolAmountWithoutExchange(totalAmount); // 74.75
    };

    calculateTotals();
  }, [invoiceData]);

  // New function to handle Qty changes
  const handleQtyChange = (index, newQty) => {
    const originalQty = invoiceData[index].originalQty;
    const qty = Number(newQty);
    // console.log(originalQty)

    if (qty > originalQty || qty < 1) return;

    // Update the state with the new quantity
    const updatedInvoiceData = invoiceData.map((item, i) => {
      if (i === index) {
        return {
          ...item,
          Qty: qty,
          Total: item.ItemPrice * qty + item.VAT * qty, // Recalculate total
        };
      }
      return item;
    });
    setInvoiceData(updatedInvoiceData);
  };

  // handleDelete
  const handleDeleteInvoiceData = (index) => {
    const updatedInvoiceData = invoiceData.filter((_, i) => i !== index);
    setInvoiceData(updatedInvoiceData);
  };

  const handleClearInvoiceData = () => {
    setInvoiceData([]);
    setExchangeData([]);
    setInvoiceHeaderData([]);
    setData([]);
    setDSalesNoInvoiceData([]);
    setDSalesNoInvoiceexchangeData([]);
  };

  useEffect(() => {
    if (!isOpenOtpPopupVisible) {
      handleClearInvoiceData();
      resetState();
    }
  }, [isOpenOtpPopupVisible]);

  const [exchangeData, setExchangeData] = useState([]);
  const addExchangeData = (newData) => {
    setExchangeData((prevData) => {
      // Loop through the newData array to handle multiple scanned items
      return newData.reduce(
        (updatedData, newItem) => {
          const existingItemIndex = updatedData.findIndex(
            (item) => item.Barcode === newItem.Barcode
          );

          if (existingItemIndex !== -1) {
            // If the item exists, update the quantity and total
            const updatedItem = {
              ...updatedData[existingItemIndex],
              Qty: updatedData[existingItemIndex].Qty + newItem.Qty,
              Total:
                (updatedData[existingItemIndex].Qty + newItem.Qty) *
                (newItem.ItemPrice + newItem.VAT),
            };

            // Replace the existing item with the updated item
            updatedData[existingItemIndex] = updatedItem;
          } else {
            // If the item is new, add it to the data array
            updatedData.push(newItem);
          }

          return updatedData;
        },
        [...prevData]
      ); // Start with the current exchangeData
    });
  };

  useEffect(() => {
    const calculateExchangeTotals = () => {
      let totalNet = 0;
      let totalVat = 0;

      exchangeData.forEach((item) => {
        // Calculate net amount without VAT
        const itemNet = item.ItemPrice * item.Qty;
        totalNet += itemNet;

        // Calculate VAT amount based on tax rate
        const itemVat = (item.ItemPrice * taxAmount) / 100;
        totalVat += itemVat * item.Qty;
      });

      // Convert to numbers and maintain precision
      const netAmount = parseFloat(Number(totalNet).toFixed(2));
      const vatAmount = parseFloat(Number(totalVat).toFixed(2));

      const totalAmount = parseFloat((netAmount + vatAmount).toFixed(2));

      setNetWithVat(netAmount);
      setTotalVat(vatAmount);
      setTotalAmountWithVat(totalAmount);
    };

    // Only calculate when there is exchange data
    if (exchangeData.length > 0) {
      calculateExchangeTotals();
    } else {
      // Reset values when no exchange data
      setNetWithVat(0);
      setTotalVat(0);
      setTotalAmountWithVat(0);
    }
  }, [exchangeData, taxAmount]);

  // DSALES no Invoice Exchange
  const [dSalesNoInvoiceexchangeData, setDSalesNoInvoiceexchangeData] =
    useState([]);
  const addDSalesExchangeData = (newData) => {
    setDSalesNoInvoiceexchangeData((prevData) => {
      return newData.reduce(
        (updatedData, newItem) => {
          const existingItemIndex = updatedData.findIndex(
            (item) => item.Barcode === newItem.Barcode
          );

          if (existingItemIndex !== -1) {
            const updatedItem = {
              ...updatedData[existingItemIndex],
              Qty: updatedData[existingItemIndex].Qty + newItem.Qty,
              Total:
                (updatedData[existingItemIndex].Qty + newItem.Qty) *
                (newItem.ItemPrice + newItem.VAT),
            };

            updatedData[existingItemIndex] = updatedItem;
          } else {
            updatedData.push(newItem);
          }

          return updatedData;
        },
        [...prevData]
      );
    });
  };

  useEffect(() => {
    const calculateTotals = () => {
      let totalNet = 0;
      let totalVat = 0;

      DSalesNoInvoiceData.forEach((item) => {
        // Calculate net amount without VAT
        totalNet += item.ItemPrice * item.Qty;
        // Calculate VAT amount
        const itemVat = (item.ItemPrice * taxAmount) / 100;
        totalVat += itemVat * item.Qty;
      });

      setNetWithOutVatDSalesNoInvoice(totalNet.toFixed(2));
      setTotalWithOutVatDSalesNoInvoice(totalVat.toFixed(2));
      setTotolAmountWithoutVatDSalesNoInvoice((totalNet + totalVat).toFixed(2));
    };

    calculateTotals();
  }, [DSalesNoInvoiceData, taxAmount]);

  // DSALES No Invoice Exchange calculation
  useEffect(() => {
    const calculateDSalesExchangeTotals = () => {
      let totalNet = 0;
      let totalVat = 0;

      dSalesNoInvoiceexchangeData.forEach((item) => {
        // Calculate net amount without VAT
        totalNet += item.ItemPrice * item.Qty;
        // Calculate VAT amount
        const itemVat = (item.ItemPrice * taxAmount) / 100;
        totalVat += itemVat * item.Qty;
      });

      // Convert to numbers before setting state to avoid string concatenation
      const netAmount = parseFloat(totalNet.toFixed(2));
      const vatAmount = parseFloat(totalVat.toFixed(2));
      const totalAmount = parseFloat((netAmount + vatAmount).toFixed(2));

      setNetWithVat(netAmount);
      setTotalVat(vatAmount);
      setTotalAmountWithVat(totalAmount);
    };

    if (dSalesNoInvoiceexchangeData.length > 0) {
      calculateDSalesExchangeTotals();
    }
  }, [dSalesNoInvoiceexchangeData, taxAmount]);

  // handleDelete
  const handleDeleteExchangeData = (index) => {
    setExchangeData((prevData) => prevData.filter((_, i) => i !== index));
  };

  const [isTenderCashEnabled, setIsTenderCashEnabled] = useState(false);
  const [isConfirmDisabled, setIsConfirmDisabled] = useState(false);
  const handleSelectionsSaved = () => {
    setIsConfirmDisabled(true);
    setIsTenderCashEnabled(true); // Enable the Tender Cash button
  };

  useEffect(() => {
    setIsConfirmDisabled(false);
    setIsTenderCashEnabled(false);
    handleClearInvoiceData();
    setNetWithVat(0);
    setTotalVat(0);
    setTotalAmountWithVat(0);

    setInvoiceNumber(generateInvoiceNumber());
  }, [selectedSalesType]);

  // I checking the invoice number and customer code if customer code is found in this invoice number then input feild is prefilled
  const handleInvoiceScan = async (invoiceHeaderData) => {
    const scannedCustomerCode = invoiceHeaderData?.CustomerCode;

    if (scannedCustomerCode) {
      const matchingCustomer = customerNameWithDirectInvoice.find(
        (customer) => customer.CUST_CODE === scannedCustomerCode
      );

      if (matchingCustomer) {
        // Set the matched customer in the Autocomplete input
        setSelectedCustomeNameWithDirectInvoice(matchingCustomer);
      } else {
        toast.error("No matching customer found. Please select manually.");
        setSelectedCustomeNameWithDirectInvoice(null);
      }
    }
  };

  // Example of calling handleInvoiceScan when scanning an invoice
  useEffect(() => {
    if (invoiceHeaderData) {
      handleInvoiceScan(invoiceHeaderData.invoiceHeader);
    }
  }, [invoiceHeaderData]);

  const [errorMessage, setErrorMessage] = useState("");
  const handleMobileChange = (value) => {
    // Reset error message
    setErrorMessage("");

    // Check if the country code is for Saudi Arabia
    if (value.startsWith("966")) {
      // Check for mobile number (should start with '9665')
      if (value.length > 1 && value[3] !== "5") {
        setErrorMessage("Mobile number must start with 9665");
      }

      // Check for maximum length (12 digits including country code)
      if (value.length > 12) {
        setErrorMessage("Number must be a maximum of 12 digits");
      }
    }

    // Set the mobile number
    setMobileNo(value);

  };

  return (
    <SideNav>
      <div className="p-4 bg-gray-100 min-h-screen">
        <div className="bg-white p-6 shadow-md">
          <div
            className={`px-3 py-3 flex justify-between bg-secondary shadow font-semibold font-sans rounded-sm text-gray-100 lg:px-5 ${i18n.language === "ar" ? "flex-row-reverse" : "flex-row"
              }`}
          >
            <span>
              {selectedSalesType === "DIRECT SALES INVOICE"
                ? `${t("Sales Entry Form (Direct Invoice)")}`
                : `${t("Sales Entry Form (Direct Sales Return)")}`}
            </span>
            <p className="text-end">{currentTime}</p>
          </div>

          <div
            className={`mb-4 mt-4 flex justify-between ${i18n.language === "ar" ? "flex-row-reverse" : "flex-row"
              }`}
          >
            <h2 className="text-2xl font-semibold bg-yellow-100 px-2 py-1">
              {selectedSalesType === "DIRECT SALES INVOICE"
                ? `${t("NEW SALE")}`
                : `${t("SALES RETURN")}`}
            </h2>
            <p className="text-2xl font-semibold bg-yellow-100 px-2 py-1">
              {t("Cashier")} :{" "}
              {`${selectedLocation?.stockLocation} - ${selectedLocation?.showroom}`}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            {/* Trasnaction Code Combo box */}
            <div>
              <label
                htmlFor="transactionId"
                className={`block text-gray-700 ${i18n.language === "ar"
                  ? "direction-rtl"
                  : "text-start direction-ltr"
                  }`}
              >
                {t("Transactions Codes")} *
              </label>
              <Autocomplete
                id="transactionId"
                options={transactionCodes}
                getOptionLabel={(option) =>
                  option && option.TXN_CODE && option.TXN_NAME
                    ? `${option.TXN_CODE} - ${option.TXN_NAME}`
                    : ""
                }
                onChange={handleTransactionCodes}
                // value={selectedTransactionCode}
                value={
                  transactionCodes.find(
                    (option) =>
                      option.TXN_CODE === selectedTransactionCode?.TXN_CODE
                  ) || null
                }
                isOptionEqualToValue={(option, value) =>
                  option?.TXN_CODE === value?.TXN_CODE
                }
                onInputChange={(event, value) => {
                  if (!value) {
                    setSelectedTransactionCode(""); // Clear selection
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
                    placeholder={t("Search Transaction Codes")}
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

            {/* Sale Selection */}
            <div>
              <label
                className={`block text-gray-700 ${i18n.language === "ar"
                  ? "direction-rtl"
                  : "text-start direction-ltr"
                  }`}
              >
                {t("Sale Type")} *
              </label>
              <select
                className="w-full mt-1 p-2 border rounded border-gray-400"
                value={selectedSalesType}
                onChange={(e) => setSelectedSalesType(e.target.value)}
              >
                <option value="DIRECT SALES INVOICE">
                  {t("DIRECT SALES INVOICE")}
                </option>
                <option value="DIRECT SALES RETURN">
                  {t("DIRECT SALES RETURN")}
                </option>
                <option value="DSALES NO INVOICE">
                  {t("DSALES NO INVOICE")}
                </option>
                <option value="BTOC CUSTOMER">
                  {t("B2C CUSTOMER")}
                </option>
              </select>
            </div>

            <div>
              <label
                className={`block text-gray-700 ${i18n.language === "ar"
                  ? "direction-rtl"
                  : "text-start direction-ltr"
                  }`}
              >
                {t("Sales Locations")} *
              </label>
              <input
                className={
                  selectedSalesType === "DIRECT SALES RETURN"
                    ? "bg-gray-200 w-full mt-1 p-2 border rounded border-gray-400 placeholder:text-black"
                    : "w-full mt-1 p-2 border rounded border-gray-400 bg-white placeholder:text-black"
                }
                value={
                  selectedSalesType === "DIRECT SALES RETURN"
                    ? invoiceHeaderData?.invoiceHeader?.SalesLocationCode || ""
                    : `${selectedLocation?.stockLocation} - ${selectedLocation?.showroom}`
                }
                readOnly
              />
            </div>
            <div>
              <label
                className={`block text-gray-700 ${i18n.language === "ar"
                  ? "direction-rtl"
                  : "text-start direction-ltr"
                  }`}
              >
                {t("Invoice")} #
              </label>
              <input
                type="text"
                value={
                  selectedSalesType === "DIRECT SALES RETURN"
                    ? invoiceHeaderData?.invoiceHeader?.InvoiceNo || ""
                    : invoiceNumber
                }
                className={
                  selectedSalesType === "DIRECT SALES RETURN"
                    ? "bg-gray-200 w-full mt-1 p-2 border rounded border-gray-400 placeholder:text-black"
                    : "w-full mt-1 p-2 border rounded border-gray-400 bg-white placeholder:text-black"
                }
                readOnly
              />
            </div>
            <div>
              <label
                className={`block text-gray-700 ${i18n.language === "ar"
                  ? "direction-rtl"
                  : "text-start direction-ltr"
                  }`}
              >
                {t("Search Customer")}
              </label>
              {EX_TRANSACTION_CODES.includes(selectedTransactionCode?.TXN_CODE) ? (
                // Show the combo box for transactions EXIN, AXIN, EXSR, AXSR (location-based customer names)
                <Autocomplete
                  id="field1"
                  options={searchCustomerName.filter((customer) => customer.CUSTOMERCODE.startsWith("EX"))} // Filter EX customers only
                  getOptionLabel={(option) =>
                    option && option.CUSTOMERCODE && option.TXN_NAME
                      ? `${option.CUSTOMERCODE} - ${option.TXN_NAME}`
                      : ""
                  }
                  onChange={handleSearchCustomerName}
                  value={searchCustomerName.find(
                    (option) => option?.CUSTOMERCODE === selectedCustomerName?.CUSTOMERCODE
                  ) || null}
                  isOptionEqualToValue={(option, value) =>
                    option?.CUSTOMERCODE === value?.CUSTOMERCODE
                  }
                  onInputChange={(event, value) => {
                    if (!value) {
                      setSelectedCustomerName("");
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
                      placeholder={t("Search Customer ID")}
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
              ) : (
                // Show the general dropdown for other transactions
                <Autocomplete
                  id="field1"
                  options={customerNameWithDirectInvoice}
                  getOptionLabel={(option) =>
                    option && option.CUST_CODE && option.CUST_NAME
                      ? `${option.CUST_CODE} - ${option.CUST_NAME}`
                      : ""
                  }
                  onChange={handleSearchCustomerNameWithDirectInvoice}
                  value={customerNameWithDirectInvoice.find(
                    (option) =>
                      option?.CUST_CODE === selectedCustomeNameWithDirectInvoice?.CUST_CODE
                  ) || null}
                  isOptionEqualToValue={(option, value) =>
                    option?.CUST_CODE === value?.CUST_CODE
                  }
                  onInputChange={(event, value) => {
                    if (!value) {
                      setSelectedCustomeNameWithDirectInvoice(""); // Clear selection
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
                      placeholder={t("Search Customer ID")}
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
              )}
            </div>

            {selectedSalesType === "BTOC CUSTOMER" && (
              <div>
                <label
                  className={`block text-gray-700 ${i18n.language === "ar"
                    ? "direction-rtl"
                    : "text-start direction-ltr"
                    }`}
                >
                  {t("Search B2C Customer")}
                </label>
                <Autocomplete
                  id="field1"
                  options={btocCustomer}
                  getOptionLabel={(option) =>
                    option && option.CUST_CODE && option.CUST_NAME
                      ? `${option.CUST_CODE} - ${option.CUST_NAME}`
                      : ""
                  }
                  onChange={handleBtocCustomer}
                  value={
                    btocCustomer.find(
                      (option) =>
                        option?.CUST_CODE ===
                        selectedBtocCustomer?.CUST_CODE
                    ) || null
                  }
                  isOptionEqualToValue={(option, value) =>
                    option?.CUST_CODE === value?.CUST_CODE
                  }
                  onInputChange={(event, value) => {
                    if (!value) {
                      setSelectedBtocCustomer(""); // Clear selection
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
                      placeholder={t("Search B2C Customer ID")}
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
            )}
            <div>
              <label
                className={`block text-gray-700 ${i18n.language === "ar"
                  ? "direction-rtl"
                  : "text-start direction-ltr"
                  }`}
              >
                {t("Delivery")} *
              </label>
              <input
                type="text"
                value={
                  selectedSalesType === "DIRECT SALES RETURN"
                    ? invoiceHeaderData?.invoiceHeader?.DeliveryLocationCode ||
                    ""
                    : `${selectedLocation?.stockLocation} - ${selectedLocation?.showroom}`
                }
                className={`${selectedSalesType === "DIRECT SALES RETURN"
                  ? "bg-gray-200 w-full mt-1 p-2 border rounded border-gray-400 placeholder:text-black"
                  : "w-full mt-1 p-2 border rounded border-gray-400 bg-white placeholder:text-black"
                  }
                    ${i18n.language === "ar" ? "text-end" : "text-start"}`}
                readOnly={selectedSalesType === "DIRECT SALES RETURN"} // Disable if Sales Return
              />
            </div>
            <div>
              <label
                className={`block text-gray-700 ${i18n.language === "ar"
                  ? "direction-rtl"
                  : "text-start direction-ltr"
                  }`}
              >
                {t("Customer Name")}*
              </label>
              <input
                type="text"
                onChange={(e) => setCustomerName(e.target.value)}
                className={`${selectedSalesType === "DIRECT SALES RETURN"
                  ? "bg-gray-200 w-full mt-1 p-2 border rounded border-gray-400 placeholder:text-black"
                  : "w-full mt-1 p-2 border rounded border-gray-400 bg-green-200 placeholder:text-black"
                  }  ${i18n.language === "ar" ? "text-end" : "text-start"}`}
                placeholder="Walk-in customer"
                value={
                  selectedSalesType === "DIRECT SALES RETURN"
                    ? invoiceHeaderData?.invoiceHeader?.CustomerName || ""
                    : customerName
                }
                readOnly={selectedSalesType === "DIRECT SALES RETURN"} // Disable if Sales Return
              />
            </div>
            <div
              className={`flex items-center ${i18n.language === "ar" ? "flex-row-reverse" : "flex-row"
                }`}
            >
              <div
                className={
                  selectedSalesType === "DIRECT SALES RETURN"
                    ? "w-full"
                    : "w-full -mt-3"
                }
              >
                <label
                  className={`block text-gray-700 ${i18n.language === "ar"
                    ? "direction-rtl"
                    : "text-start direction-ltr"
                    }`}
                >
                  {t("Mobile")} *
                </label>
                <div
                  className={`w-full mt-1 p-1 border rounded border-gray-400 bg-green-200 placeholder:text-black  ${i18n.language === "ar" ? "text-end" : "text-start"
                    }`}
                >
                  <PhoneInput
                    international
                    country={"sa"}
                    defaultCountry={"sa"}
                    value={mobileNo}
                    onChange={handleMobileChange}
                    inputProps={{
                      id: "mobile",
                      placeholder: "Mobile Number",
                      autoComplete: "off",
                    }}
                    inputStyle={{
                      backgroundColor: "#c6f6d5",
                      color: "black",
                      textAlign: i18n.language === "ar" ? "right" : "left",
                      width: "100%",
                      borderRadius: "0px",
                      border: "none",
                    }}
                    required
                  />
                </div>
              </div>
              {selectedSalesType === "DIRECT SALES RETURN" && (
                <button
                  onClick={handleShowMobileNumberPopup}
                  className="ml-2 p-2 mt-7 border rounded bg-secondary hover:bg-primary text-white flex items-center justify-center"
                >
                  <IoBarcodeSharp size={20} />
                </button>
              )}
            </div>
            {selectedSalesType === "DIRECT SALES INVOICE" ? (
              <form
                onSubmit={handleGetBarcodes}
                className={`flex items-center ${i18n.language === "ar" ? "flex-row-reverse" : "flex-row"
                  }`}
              >
                <div className="w-full">
                  <label
                    className={`block text-gray-700 ${i18n.language === "ar"
                      ? "direction-rtl"
                      : "text-start direction-ltr"
                      }`}
                  >
                    {t("Scan Barcode")}
                  </label>
                  <input
                    type="text"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    required
                    className={`w-full mt-1 p-2 border rounded border-gray-400 bg-green-200 placeholder:text-black  ${i18n.language === "ar" ? "text-end" : "text-start"
                      }`}
                    placeholder={t("Enter Barcode")}
                  />
                </div>
                <button
                  type="submit"
                  className="ml-2 p-2 mt-7 border rounded bg-secondary hover:bg-primary text-white flex items-center justify-center"
                >
                  <IoBarcodeSharp size={20} />
                </button>
              </form>
            ) : selectedSalesType === "DSALES NO INVOICE" ? (
              <form
                onSubmit={handleGetNoInvoiceBarcodes}
                className={`flex items-center ${i18n.language === "ar" ? "flex-row-reverse" : "flex-row"
                  }`}
              >
                <div className="w-full">
                  <label
                    className={`block text-gray-700 ${i18n.language === "ar"
                      ? "direction-rtl"
                      : "text-start direction-ltr"
                      }`}
                  >
                    {t("Scan Barcode (No Invoice)")}
                  </label>
                  <input
                    type="text"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    required
                    className={`w-full mt-1 p-2 border rounded border-gray-400 bg-green-200 placeholder:text-black  ${i18n.language === "ar" ? "text-end" : "text-start"
                      }`}
                    placeholder={t("Enter Barcode (No Invoice)")}
                  />
                </div>
                <button
                  type="submit"
                  className="ml-2 p-2 mt-7 border rounded bg-secondary hover:bg-primary text-white flex items-center justify-center"
                >
                  <IoBarcodeSharp size={20} />
                </button>
              </form>
            ) : selectedSalesType === "BTOC CUSTOMER" ? (
              <form
                // i call the btoc customer function 
                onSubmit={handleGetBtocCustomerBarcodes}
                className={`flex items-center ${i18n.language === "ar" ? "flex-row-reverse" : "flex-row"
                  }`}
              >
                <div className="w-full">
                  <label
                    className={`block text-gray-700 ${i18n.language === "ar"
                      ? "direction-rtl"
                      : "text-start direction-ltr"
                      }`}
                  >
                    {t("Scan Barcode (Btoc Customer)")}
                  </label>
                  <input
                    type="text"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    required
                    className={`w-full mt-1 p-2 border rounded border-gray-400 bg-green-200 placeholder:text-black  ${i18n.language === "ar" ? "text-end" : "text-start"
                      }`}
                    placeholder={t("Enter Barcode (Btoc Customer)")}
                  />
                </div>
                <button
                  type="submit"
                  className="ml-2 p-2 mt-7 border rounded bg-secondary hover:bg-primary text-white flex items-center justify-center"
                >
                  <IoBarcodeSharp size={20} />
                </button>
              </form>
            ) : (
              <form
                onSubmit={handleSearchInvoice}
                className={`flex items-center ${i18n.language === "ar" ? "flex-row-reverse" : "flex-row"
                  }`}
              >
                <div className="w-full">
                  <label
                    className={`block text-gray-700 ${i18n.language === "ar"
                      ? "direction-rtl"
                      : "text-start direction-ltr"
                      }`}
                  >
                    {t("Scan Invoice")}
                  </label>
                  <input
                    type="text"
                    value={searchInvoiceNumber}
                    onChange={(e) => setSearchInvoiceNumber(e.target.value)}
                    required
                    placeholder={t("Enter Invoice Number")}
                    className={`w-full mt-1 p-2 border rounded border-gray-400 bg-green-200 placeholder:text-black  ${i18n.language === "ar" ? "text-end" : "text-start"
                      }`}
                  />
                </div>
                <button
                  type="submit"
                  className="ml-2 p-2 mt-7 border rounded bg-secondary hover:bg-primary text-white flex items-center justify-center"
                >
                  <IoBarcodeSharp size={20} />
                </button>
              </form>
            )}

            <div>
              <label
                className={`block text-gray-700 ${i18n.language === "ar"
                  ? "direction-rtl"
                  : "text-start direction-ltr"
                  }`}
              >
                {t("Remarks")} *
              </label>
              <input
                type="text"
                value={
                  selectedSalesType === "DIRECT SALES RETURN"
                    ? invoiceHeaderData?.invoiceHeader?.Remarks || ""
                    : remarks
                }
                className={`w-full mt-1 p-2 border rounded border-gray-400 placeholder:text-black ${selectedSalesType === "DIRECT SALES RETURN"
                  ? "bg-gray-200"
                  : "bg-green-200"
                  }  ${i18n.language === "ar" ? "text-end" : "text-start"}`}
                placeholder={t("Remarks")}
                disabled={selectedSalesType === "DIRECT SALES RETURN"}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </div>
            <div>
              <label
                className={`block text-gray-700 ${i18n.language === "ar"
                  ? "direction-rtl"
                  : "text-start direction-ltr"
                  }`}
              >
                {t("VAT")} #
              </label>
              <input
                type="text"
                value={
                  selectedSalesType === "DIRECT SALES RETURN"
                    ? invoiceHeaderData?.invoiceHeader?.VatNumber || ""
                    : vat
                }
                className={`w-full mt-1 p-2 border rounded border-gray-400 placeholder:text-black ${selectedSalesType === "DIRECT SALES RETURN"
                  ? "bg-gray-200"
                  : "bg-green-200"
                  }  ${i18n.language === "ar" ? "text-end" : "text-start"}`}
                disabled={selectedSalesType === "DIRECT SALES RETURN"}
                placeholder={t("VAT")}
                onChange={(e) => setVat(e.target.value)}
              />
            </div>
            {errorMessage && (
              <p className="text-red-500 text-sm -mt-6">{errorMessage}</p>
            )}
          </div>
          {selectedSalesType === "DIRECT SALES INVOICE" && (
            <div className="mt-10 overflow-x-auto">
              <table className="table-auto w-full">
                <thead className="bg-secondary text-white truncate">
                  <tr>
                    <th className="px-4 py-2">{t("SKU")}</th>
                    <th className="px-4 py-2">{t("Barcode")}</th>
                    <th className="px-4 py-2">{t("Description")}</th>
                    <th className="px-4 py-2">{t("Item Size")}</th>
                    <th className="px-4 py-2">{t("Available Stock Qty")}</th>
                    <th className="px-4 py-2">{t("Qty")}</th>
                    <th className="px-4 py-2">{t("Item Price")}</th>
                    <th className="px-4 py-2">{t("VAT")}</th>
                    <th className="px-4 py-2">{t("Discount")}</th>
                    <th className="px-4 py-2">{t("Total")}</th>
                    <th className="px-4 py-2">{t("Action")}</th>
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
                      <tr key={index} className="bg-gray-100">
                        <td className="border px-4 py-2">{row.SKU}</td>
                        <td className="border px-4 py-2">{row.Barcode}</td>
                        <td className="border px-4 py-2">{row.Description}</td>
                        <td className="border px-4 py-2">{row.ItemSize}</td>
                        <td className="border px-4 py-2">{row.AvailableStock}</td>
                        <td className="border px-4 py-2">{row.Qty}</td>
                        <td className="border px-4 py-2">{Number(row.ItemPrice).toFixed(2)}</td>
                        <td className="border px-4 py-2">{Number(row.VAT).toFixed(2)}</td>
                        <td className="border px-4 py-2">{row.Discount}</td>
                        <td className="border px-4 py-2">{Number(row.Total).toFixed(2)}</td>
                        <td className="border px-4 py-2 text-center">
                          <button onClick={() => handleDelete(index)}>
                            <MdRemoveCircle className="text-secondary text-xl hover:text-red-500" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                )}
              </table>
              <div
                className={`flex  ${i18n.language === "ar" ? "justify-start" : "justify-end"
                  }`}
              >
                <div className="bg-white p-4 rounded shadow-md w-[50%]">
                  <div className="flex flex-col gap-4">
                    <div
                      className={`flex justify-between items-center ${i18n.language === "ar" ? "flex-row-reverse" : "flex-row"
                        }`}
                    >
                      <label
                        className={`block text-gray-700 font-bold ${i18n.language === "ar"
                          ? "direction-rtl"
                          : "text-start direction-ltr"
                          }`}
                      >
                        {t("Net Without VAT")}:
                      </label>
                      <input
                        type="text"
                        value={netWithVat}
                        readOnly
                        className={`mt-1 p-2 border bg-gray-100  w-[60%] ${i18n.language === "ar" ? " text-start" : "text-end"
                          }`}
                      />
                    </div>

                    <div
                      className={`flex justify-between items-center ${i18n.language === "ar" ? "flex-row-reverse" : "flex-row"
                        }`}
                    >
                      <label
                        className={`block text-gray-700 font-bold ${i18n.language === "ar"
                          ? "direction-rtl"
                          : "text-start direction-ltr"
                          }`}
                      >
                        {t("Total VAT")}:
                      </label>
                      <input
                        type="text"
                        value={totalVat}
                        readOnly
                        className={`mt-1 p-2 border bg-gray-100  w-[60%] ${i18n.language === "ar" ? " text-start" : "text-end"
                          }`}
                      />
                    </div>

                    <div
                      className={`flex justify-between items-center ${i18n.language === "ar" ? "flex-row-reverse" : "flex-row"
                        }`}
                    >
                      <label
                        className={`block text-gray-700 font-bold ${i18n.language === "ar"
                          ? "direction-rtl"
                          : "text-start direction-ltr"
                          }`}
                      >
                        {t("Total Amount With VAT")}:
                      </label>
                      <input
                        type="text"
                        value={totalAmountWithVat}
                        readOnly
                        className={`mt-1 p-2 border bg-gray-100  w-[60%] ${i18n.language === "ar" ? " text-start" : "text-end"
                          }`}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedSalesType === "DIRECT SALES RETURN" && (
            <div>
              <table className="table-auto w-full text-center">
                <thead className="bg-secondary text-white truncate">
                  <tr>
                    <th className="px-4 py-2">{t("SKU")}</th>
                    <th className="px-4 py-2">{t("Invoice No")}</th>
                    <th className="px-4 py-2">{t("Description")}</th>
                    <th className="px-4 py-2">{t("Item Size")}</th>
                    <th className="px-4 py-2">{t("Qty")}</th>
                    <th className="px-4 py-2">{t("Item Price")}</th>
                    <th className="px-4 py-2">{t("VAT")}</th>
                    <th className="px-4 py-2">{t("Total")}</th>
                    <th className="px-4 py-2">{t("Action")}</th>
                  </tr>
                </thead>
                {invoiceDataLoader ? (
                  <tr>
                    <td colSpan="10" className="text-center py-4">
                      <div className="flex justify-center items-center w-full h-full">
                        <CircularProgress size={24} color="inherit" />
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tbody>
                    {invoiceData.map((row, index) => (
                      <tr key={index} className="bg-gray-100">
                        <td className="border px-4 py-2">{row.SKU}</td>
                        <td className="border px-4 py-2">{row.Barcode}</td>
                        <td className="border px-4 py-2">{row.Description}</td>
                        <td className="border px-4 py-2">{row.ItemSize}</td>
                        {/* <td className="border px-4 py-2">{row.Qty}</td> */}
                        <td className="border px-4 py-2">
                          <input
                            type="number"
                            min="1"
                            max={row.originalQty}
                            value={row.Qty}
                            onChange={(e) =>
                              handleQtyChange(index, e.target.value)
                            }
                            className="w-full text-center border rounded p-1"
                          />
                        </td>
                        <td className="border px-4 py-2">{parseFloat(row.ItemPrice).toFixed(2)}</td>
                        <td className="border px-4 py-2">{parseFloat(row.VAT).toFixed(2)}</td>
                        <td className="border px-4 py-2">{parseFloat(row.Total).toFixed(2)}</td>
                        <td className="border px-4 py-2 text-center relative">
                          <button
                            onClick={() => handleActionClick(index)}
                            className="bg-blue-700 text-white px-4 py-2 rounded-md font-bold transform hover:scale-95"
                          >
                            {t("Actions")}
                          </button>
                          {openDropdown === index && (
                            <div className="absolute bg-white shadow-md border mt-2 rounded w-40 z-10 right-0">
                              <ul className="list-none p-0 m-0">
                                <li
                                  onClick={() => handleItemClick("exchange")}
                                  className="hover:bg-gray-100 cursor-pointer px-4 py-2 flex items-center truncate"
                                >
                                  <FaExchangeAlt className="text-secondary mr-2" />
                                  {t("Exchange Item")}
                                </li>
                                <li>
                                  <button
                                    onClick={() =>
                                      handleDeleteInvoiceData(index)
                                    }
                                    className="w-full flex items-center px-4 py-2 hover:bg-gray-100"
                                  >
                                    <MdRemoveCircle className="text-secondary mr-2" />
                                    {t("Remove")}
                                  </button>
                                </li>
                              </ul>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                )}
              </table>
              {/* Total show without exchange */}
              <div
                className={`flex  ${i18n.language === "ar" ? " justify-start" : "justify-end"
                  }`}
              >
                <div className="bg-white p-4 rounded shadow-md w-[50%]">
                  <div className="flex flex-col gap-4">
                    <div
                      className={`flex justify-between items-center ${i18n.language === "ar" ? "flex-row-reverse" : "flex-row"
                        }`}
                    >
                      <label
                        className={`block text-gray-700 font-bold ${i18n.language === "ar"
                          ? "direction-rtl"
                          : "text-start direction-ltr"
                          }`}
                      >
                        {t("Net Without VAT")}:
                      </label>
                      <input
                        type="text"
                        value={netWithOutVatExchange}
                        readOnly
                        className={`mt-1 p-2 border bg-gray-100  w-[60%] ${i18n.language === "ar" ? " text-start" : "text-end"
                          }`}
                      />
                    </div>

                    <div
                      className={`flex justify-between items-center ${i18n.language === "ar" ? "flex-row-reverse" : "flex-row"
                        }`}
                    >
                      <label
                        className={`block text-gray-700 font-bold ${i18n.language === "ar"
                          ? "direction-rtl"
                          : "text-start direction-ltr"
                          }`}
                      >
                        {t("Total VAT")}:
                      </label>
                      <input
                        type="text"
                        value={totalWithOutExchange}
                        readOnly
                        className={`mt-1 p-2 border bg-gray-100  w-[60%] ${i18n.language === "ar" ? " text-start" : "text-end"
                          }`}
                      />
                    </div>

                    <div
                      className={`flex justify-between items-center ${i18n.language === "ar" ? "flex-row-reverse" : "flex-row"
                        }`}
                    >
                      <label
                        className={`block text-gray-700 font-bold ${i18n.language === "ar"
                          ? "direction-rtl"
                          : "text-start direction-ltr"
                          }`}
                      >
                        {t("Total Amount With VAT")}:
                      </label>
                      <input
                        type="text"
                        value={totolAmountWithoutExchange}
                        readOnly
                        className={`mt-1 p-2 border bg-gray-100  w-[60%] ${i18n.language === "ar" ? " text-start" : "text-end"
                          }`}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* exchenage datagrid */}
          {exchangeData.length > 0 && (
            <div className="mt-10">
              <button className="px-3 py-2 bg-gray-300 font-sans font-semibold rounded-t-md">
                {t("Exchange Items")}
              </button>
              <div className="overflow-x-auto">
                <table className="table-auto w-full">
                  <thead className="bg-secondary text-white truncate">
                    <tr>
                      <th className="px-4 py-2">{t("SKU")}</th>
                      <th className="px-4 py-2">{t("Barcode")}</th>
                      <th className="px-4 py-2">{t("Description")}</th>
                      <th className="px-4 py-2">{t("Item Size")}</th>
                      <th className="px-4 py-2">{t("Available Stock Qty")}</th>
                      <th className="px-4 py-2">{t("Qty")}</th>
                      <th className="px-4 py-2">{t("Item Price")}</th>
                      <th className="px-4 py-2">{t("VAT")}</th>
                      <th className="px-4 py-2">{t("Total")}</th>
                      <th className="px-4 py-2">{t("Action")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exchangeData?.map((item, index) => (
                      <tr key={index} className="bg-gray-100">
                        <td className="border px-4 py-2">
                          {/* {item.ItemCode || ""} */}
                          {item.SKU || ""}
                        </td>
                        {/* <td className="border px-4 py-2">{item.GTIN}</td> */}
                        <td className="border px-4 py-2">{item.Barcode}</td>
                        <td className="border px-4 py-2">{item.Description}</td>
                        <td className="border px-4 py-2">{item.ItemSize}</td>
                        <td className="border px-4 py-2">{item?.FreeStock}</td>
                        <td className="border px-4 py-2">{item?.Qty}</td>
                        <td className="border px-4 py-2">{parseFloat(item.ItemPrice).toFixed(2)}</td>
                        <td className="border px-4 py-2">{parseFloat(item.VAT).toFixed(2)}</td>
                        <td className="border px-4 py-2">{parseFloat(item.Total).toFixed(2)}</td>
                        <td className="border px-4 py-2 text-center">
                          <button
                            onClick={() => handleDeleteExchangeData(index)}
                          >
                            <MdRemoveCircle className="text-secondary text-xl hover:text-red-500" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div
                className={`flex items-center ${i18n.language === "ar" ? " justify-start" : "justify-end"
                  }`}
              >
                <div className="bg-white p-4 rounded shadow-md w-[50%]">
                  <div className="flex flex-col gap-4">
                    <div
                      className={`flex justify-between items-center ${i18n.language === "ar" ? "flex-row-reverse" : "flex-row"
                        }`}
                    >
                      <label
                        className={`block text-gray-700 font-bold ${i18n.language === "ar"
                          ? "direction-rtl"
                          : "text-start direction-ltr"
                          }`}
                      >
                        {t("Net Without VAT")}:
                      </label>
                      <input
                        type="text"
                        value={netWithVat}
                        readOnly
                        className={`mt-1 p-2 border bg-gray-100  w-[60%] ${i18n.language === "ar" ? " text-start" : "text-end"
                          }`}
                      />
                    </div>

                    <div
                      className={`flex justify-between items-center ${i18n.language === "ar" ? "flex-row-reverse" : "flex-row"
                        }`}
                    >
                      <label
                        className={`block text-gray-700 font-bold ${i18n.language === "ar"
                          ? "direction-rtl"
                          : "text-start direction-ltr"
                          }`}
                      >
                        {t("Total VAT")}:
                      </label>
                      <input
                        type="text"
                        value={totalVat}
                        readOnly
                        className={`mt-1 p-2 border bg-gray-100  w-[60%] ${i18n.language === "ar" ? " text-start" : "text-end"
                          }`}
                      />
                    </div>

                    <div
                      className={`flex justify-between items-center ${i18n.language === "ar" ? "flex-row-reverse" : "flex-row"
                        }`}
                    >
                      <label
                        className={`block text-gray-700 font-bold ${i18n.language === "ar"
                          ? "direction-rtl"
                          : "text-start direction-ltr"
                          }`}
                      >
                        {t("Total Amount With VAT")}:
                      </label>
                      <input
                        type="text"
                        value={totalAmountWithVat}
                        readOnly
                        className={`mt-1 p-2 border bg-gray-100  w-[60%] ${i18n.language === "ar" ? " text-start" : "text-end"
                          }`}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* DSALES NO INVOICE */}
          {(selectedSalesType === "DSALES NO INVOICE" || selectedSalesType === "BTOC CUSTOMER") && (
            <>
              <div className="mt-10">
                <table className="table-auto w-full">
                  <thead className="bg-secondary text-white truncate">
                    <tr>
                      <th className="px-4 py-2">{t("SKU")}</th>
                      <th className="px-4 py-2">{t("Barcode")}</th>
                      <th className="px-4 py-2">{t("Description")}</th>
                      <th className="px-4 py-2">{t("Item Size")}</th>
                      <th className="px-4 py-2">{t("Qty")}</th>
                      <th className="px-4 py-2">{t("Item Price")}</th>
                      <th className="px-4 py-2">{t("VAT")}</th>
                      <th className="px-4 py-2">{t("Total")}</th>
                      <th className="px-4 py-2">{t("Action")}</th>
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
                      {DSalesNoInvoiceData.map((row, index) => (
                        <tr key={index} className="bg-gray-100">
                          <td className="border px-4 py-2">{row.SKU}</td>
                          <td className="border px-4 py-2">{row.Barcode}</td>
                          <td className="border px-4 py-2">
                            {row.Description}
                          </td>
                          <td className="border px-4 py-2">{row.ItemSize}</td>
                          <td className="border px-4 py-2">{row.Qty}</td>
                          <td className="border px-4 py-2">{parseFloat(row.ItemPrice).toFixed(2)}</td>
                          <td className="border px-4 py-2">{parseFloat(row.VAT).toFixed(2)}</td>
                          <td className="border px-4 py-2">{parseFloat(row.Total).toFixed(2)}</td>
                          <td className="border px-4 py-2 text-center relative">
                            <button
                              onClick={() => handleActionClick(index)}
                              className="bg-blue-700 text-white px-4 py-2 rounded-md font-bold transform hover:scale-95"
                            >
                              {t("Actions")}
                            </button>
                            {openDropdown === index && (
                              <div className="absolute bg-white shadow-md border mt-2 rounded w-44 z-10 right-0">
                                <ul className="list-none p-0 m-0">
                                  <li
                                    onClick={() =>
                                      handleItemClick("exchange Dsales")
                                    }
                                    className="hover:bg-gray-100 cursor-pointer px-4 py-2 flex items-center truncate"
                                  >
                                    <FaExchangeAlt className="text-secondary mr-2" />
                                    {t("Exchange DSales")}
                                  </li>
                                  <li>
                                    <button
                                      onClick={() => handleDSalesDelete(index)}
                                      className="w-full flex items-center px-4 py-2 hover:bg-gray-100"
                                    >
                                      <MdRemoveCircle className="text-secondary mr-2" />
                                      {t("Remove")}
                                    </button>
                                  </li>
                                </ul>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  )}
                </table>
                <div
                  className={`flex items-center ${i18n.language === "ar" ? " justify-start" : "justify-end"
                    }`}
                >
                  <div className="bg-white p-4 rounded shadow-md w-[50%]">
                    <div className="flex flex-col gap-4">
                      <div
                        className={`flex justify-between items-center ${i18n.language === "ar"
                          ? "flex-row-reverse"
                          : "flex-row"
                          }`}
                      >
                        <label
                          className={`block text-gray-700 font-bold ${i18n.language === "ar"
                            ? "direction-rtl"
                            : "text-start direction-ltr"
                            }`}
                        >
                          {t("Net Without VAT")}:
                        </label>
                        <input
                          type="text"
                          value={netWithOutVatDSalesNoInvoice}
                          readOnly
                          className={`mt-1 p-2 border bg-gray-100  w-[60%] ${i18n.language === "ar" ? " text-start" : "text-end"
                            }`}
                        />
                      </div>

                      <div
                        className={`flex justify-between items-center ${i18n.language === "ar"
                          ? "flex-row-reverse"
                          : "flex-row"
                          }`}
                      >
                        <label
                          className={`block text-gray-700 font-bold ${i18n.language === "ar"
                            ? "direction-rtl"
                            : "text-start direction-ltr"
                            }`}
                        >
                          {t("Total VAT")}:
                        </label>
                        <input
                          type="text"
                          value={totalWithOutVatDSalesNoInvoice}
                          readOnly
                          className={`mt-1 p-2 border bg-gray-100  w-[60%] ${i18n.language === "ar" ? " text-start" : "text-end"
                            }`}
                        />
                      </div>

                      <div
                        className={`flex justify-between items-center ${i18n.language === "ar"
                          ? "flex-row-reverse"
                          : "flex-row"
                          }`}
                      >
                        <label
                          className={`block text-gray-700 font-bold ${i18n.language === "ar"
                            ? "direction-rtl"
                            : "text-start direction-ltr"
                            }`}
                        >
                          {t("Total Amount With VAT")}:
                        </label>
                        <input
                          type="text"
                          value={totolAmountWithoutVatDSalesNoInvoice}
                          readOnly
                          className={`mt-1 p-2 border bg-gray-100  w-[60%] ${i18n.language === "ar" ? " text-start" : "text-end"
                            }`}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* DSALES Exchange data grid */}
              {dSalesNoInvoiceexchangeData.length > 0 && (
                <div className="mt-10">
                  <button className="px-3 py-2 bg-gray-300 font-sans font-semibold rounded-t-md">
                    {selectedSalesType === "DSALES NO INVOICE"
                      ? t("Exchange Item DSales No Invoice")
                      : t("Exchange Item BTOC Customer")}
                    {/* {t("Exchange Item DSales No Invoice")} */}
                  </button>
                  <div className="overflow-x-auto">
                    <table className="table-auto w-full">
                      <thead className="bg-secondary text-white truncate">
                        <tr>
                          <th className="px-4 py-2">{t("SKU")}</th>
                          <th className="px-4 py-2">{t("Barcode")}</th>
                          <th className="px-4 py-2">{t("Description")}</th>
                          <th className="px-4 py-2">{t("Item Size")}</th>
                          <th className="px-4 py-2">{t("Available Stock Qty")}</th>
                          <th className="px-4 py-2">{t("Qty")}</th>
                          <th className="px-4 py-2">{t("Item Price")}</th>
                          <th className="px-4 py-2">{t("VAT")}</th>
                          <th className="px-4 py-2">{t("Total")}</th>
                          <th className="px-4 py-2">{t("Action")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dSalesNoInvoiceexchangeData?.map((item, index) => (
                          <tr key={index} className="bg-gray-100">
                            <td className="border px-4 py-2">
                              {/* {item.ItemCode || ""} */}
                              {item.SKU || ""}
                            </td>
                            {/* <td className="border px-4 py-2">{item.GTIN}</td> */}
                            <td className="border px-4 py-2">{item.Barcode}</td>
                            <td className="border px-4 py-2">
                              {item.Description}
                            </td>
                            <td className="border px-4 py-2">
                              {item.ItemSize}
                            </td>
                            <td className="border px-4 py-2">
                              {item?.FreeStock}
                            </td>
                            <td className="border px-4 py-2">{item?.Qty}</td>
                            <td className="border px-4 py-2">
                              {parseFloat(item.ItemPrice).toFixed(2)}
                            </td>
                            <td className="border px-4 py-2">{parseFloat(item.VAT).toFixed(2)}</td>
                            <td className="border px-4 py-2">{parseFloat(item.Total).toFixed(2)}</td>
                            <td className="border px-4 py-2 text-center">
                              <button>
                                <MdRemoveCircle className="text-secondary hover:text-red-500" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div
                    className={`flex items-center ${i18n.language === "ar" ? " justify-start" : "justify-end"
                      }`}
                  >
                    <div className="bg-white p-4 rounded shadow-md w-[50%]">
                      <div className="flex flex-col gap-4">
                        <div
                          className={`flex justify-between items-center ${i18n.language === "ar"
                            ? "flex-row-reverse"
                            : "flex-row"
                            }`}
                        >
                          <label
                            className={`block text-gray-700 font-bold ${i18n.language === "ar"
                              ? "direction-rtl"
                              : "text-start direction-ltr"
                              }`}
                          >
                            {t("Net Without VAT")}:
                          </label>
                          <input
                            type="text"
                            value={netWithVat}
                            readOnly
                            className={`mt-1 p-2 border bg-gray-100  w-[60%] ${i18n.language === "ar"
                              ? " text-start"
                              : "text-end"
                              }`}
                          />
                        </div>

                        <div
                          className={`flex justify-between items-center ${i18n.language === "ar"
                            ? "flex-row-reverse"
                            : "flex-row"
                            }`}
                        >
                          <label
                            className={`block text-gray-700 font-bold ${i18n.language === "ar"
                              ? "direction-rtl"
                              : "text-start direction-ltr"
                              }`}
                          >
                            {t("Total VAT")}:
                          </label>
                          <input
                            type="text"
                            value={totalVat}
                            readOnly
                            className={`mt-1 p-2 border bg-gray-100  w-[60%] ${i18n.language === "ar"
                              ? " text-start"
                              : "text-end"
                              }`}
                          />
                        </div>

                        <div
                          className={`flex justify-between items-center ${i18n.language === "ar"
                            ? "flex-row-reverse"
                            : "flex-row"
                            }`}
                        >
                          <label
                            className={`block text-gray-700 font-bold ${i18n.language === "ar"
                              ? "direction-rtl"
                              : "text-start direction-ltr"
                              }`}
                          >
                            {t("Total Amount With VAT")}:
                          </label>
                          <input
                            type="text"
                            value={totalAmountWithVat}
                            readOnly
                            className={`mt-1 p-2 border bg-gray-100  w-[60%] ${i18n.language === "ar"
                              ? " text-start"
                              : "text-end"
                              }`}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          <div
            className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${i18n.language === "ar" ? "direction-rtl" : "direction-ltr"
              }`}
          >
            <div className="p-4 rounded mb-4">
              <div className="grid grid-cols-2 md:grid-cols-2 gap-4 text-center">
                <button
                  onClick={handleShowConfirmTransactionPopup}
                  className={`bg-blue-500 text-white py-4 px-4 rounded transform hover:scale-90 hover:cursor-pointer ${isConfirmDisabled
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-blue-500"
                    }`}
                  disabled={isConfirmDisabled}
                >
                  {t("Confirm Transactions")}
                </button>
                <button
                  onClick={handleShowCreatePopup}
                  className={`${isTenderCashEnabled
                    ? "bg-red-500 hover:bg-red-600"
                    : "bg-gray-400 cursor-not-allowed"
                    } text-white py-4 px-4 rounded transform hover:scale-90 hover:cursor-pointer`}
                  disabled={!isTenderCashEnabled}
                >
                  {t("F3 - Tender Cash")}
                </button>
              </div>
            </div>
          </div>

          {isCreatePopupVisible && (
            <F3TenderCashPopUp
              isVisible={isCreatePopupVisible}
              setVisibility={setCreatePopupVisibility}
              storeDatagridData={storeDatagridData}
              storeInvoiceDatagridData={storeInvoiceDatagridData}
              showOtpPopup={handleShowOtpPopup}
              handleClearData={handleClearData}
              // handleClearInvoiceData={handleClearInvoiceData}
              selectedSalesType={selectedSalesType}
              handleInvoiceGenerator={handleInvoiceGenerator}
              handleZatcaInvoiceGenerator={handleZatcaInvoiceGenerator}
              // pass in props netwithoutvat amount
              netWithVat={netWithVat}
              totalAmountWithVat={totalAmountWithVat}
              // invoice state without Exchange
              netWithOutVatExchange={netWithOutVatExchange}
              totolAmountWithoutExchange={totolAmountWithoutExchange}
              // state for Dsales No Invoice
              netWithOutVatDSalesNoInvoice={netWithOutVatDSalesNoInvoice}
              totolAmountWithoutVatDSalesNoInvoice={
                totolAmountWithoutVatDSalesNoInvoice
              }
              // insert the data in our pos history
              insertInvoiceRecord={insertInvoiceRecord}
              invoiceHeaderData={invoiceHeaderData?.invoiceHeader}
              mobileNo={mobileNo}
              customerName={customerName}
              remarks={remarks}
              selectedCustomerCode={selectedCustomerName}
              selectedCustomeNameWithDirectInvoice={
                selectedCustomeNameWithDirectInvoice
              }
              selectedTransactionCode={selectedTransactionCode}
              invoiceNumber={invoiceNumber}
              newInvoiceNumber={invoiceNumber}
              // newInvoiceNumber={newInvoiceNumber}
              isExchangeClick={isExchangeClick}
              selectedRowData={selectedRowData}
              exchangeData={exchangeData}
              isExchangeDSalesClick={isExchangeDSalesClick}
              DSalesNoInvoiceData={DSalesNoInvoiceData}
              dSalesNoInvoiceexchangeData={dSalesNoInvoiceexchangeData}
              // save the documents no
              setDirectSalesInvoiceDocumentNo={setDirectSalesInvoiceDocumentNo}
              setDirectSalesReturnDocumentNo={setDirectSalesReturnDocumentNo}
              setDSalesNoInvoice={setDSalesNoInvoice}
              handleDocumentNoUpdate={handleDocumentNoUpdate}
              // return sales type
              selectedSalesReturnType={selectedSalesReturnType}
              // search invoice number
              searchInvoiceNumber={searchInvoiceNumber}
            />
          )}

          {isOpenOtpPopupVisible && (
            <F3ResponsePopUp
              isVisible={isOpenOtpPopupVisible}
              setVisibility={setIsOpenOtpPopupVisible}
              apiResponse={apiResponse}
              handlePrintSalesInvoice={() => {
                handlePrintSalesInvoice(zatcaQrcode);
              }}
              handlePrintExchangeInvoice={() => {
                handlePrintExchangeInvoice(zatchaQrcodeExchange);
              }}
              selectedSalesType={selectedSalesType}
              isExchangeClick={isExchangeClick}
              isExchangeDSalesClick={isExchangeDSalesClick}
              sendWhatsAppInvoice={sendWhatsAppInvoice}
              setDirectInvoiceWhatsAppLoader={directInvoiceWhatsAppLoader}
              isReceiptPrinted={isReceiptPrinted}

              sendWhatsAppExchangeInvoice={sendWhatsAppExchangeInvoice}
              exhchangeWhatsAppInvoiceLoader={exhchangeWhatsAppInvoiceLoader}
            />
          )}

          {isExchangeItemPopupVisible && (
            <ExchangeItemPopUp
              isVisible={isExchangeItemPopupVisible}
              setVisibility={setIsExchangeItemPopupVisible}
              addExchangeData={addExchangeData}
              selectedRowData={selectedRowData}
              invoiceHeaderData={
                invoiceHeaderData?.invoiceHeader?.SalesLocationCode
              }
              dsalesLocationCode={selectedLocation?.stockLocation}
              selectedSalesType={selectedSalesType}
              addDSalesExchangeData={addDSalesExchangeData}
              selectedCustomerName={selectedCustomerName}
              // return sales type
              selectedSalesReturnType={selectedSalesReturnType}
              selectedCustomeNameWithDirectInvoice={
                selectedCustomeNameWithDirectInvoice
              }
              selectedTransactionCode={selectedTransactionCode}
            />
          )}

          {isConfirmTransactionPopupVisible && (
            <ConfirmTransactionPopUp
              isVisible={isConfirmTransactionPopupVisible}
              setVisibility={setIsConfirmTransactionPopupVisible}
              onSelectionsSaved={handleSelectionsSaved}
              onPaymentModeChange={handlePaymentModeUpdate}
            />
          )}

          {isMobileNumberPopupVisible && (
            <MobileNumberPopUp
              isVisible={isMobileNumberPopupVisible}
              setVisibility={setIsMobileNumberPopupVisible}
              mobileNo={mobileNo}
              onSelectInvoice={handleGetInvoiceDetails}
            />
          )}
        </div>
      </div>

      {/* What QR Code PopUp. */}
      {showPopup && <QRCodePopup qrCode={qrCode} onClose={handleClosePopup} />}
    </SideNav>
  );
};

export default POS;