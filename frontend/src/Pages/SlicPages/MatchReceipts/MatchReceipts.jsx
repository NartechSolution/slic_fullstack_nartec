import React, { useContext, useEffect, useState } from "react";
import SideNav from "../../../components/Sidebar/SideNav";
import { useNavigate } from "react-router-dom";
import { posBulkCashreceiptInvoiceColumns } from "../../../utils/datatablesource";
import DataTable from "../../../components/Datatable/Datatable";
import EditIcon from "@mui/icons-material/Edit";
import { useTranslation } from "react-i18next";
import newRequest from "../../../utils/userRequest";
import { showApiError } from "../../../utils/apiErrorHandler";
import {
  Autocomplete,
  Button,
  CircularProgress,
  TextField,
} from "@mui/material";
import { toast } from "react-toastify";
import QRCode from "qrcode";
import sliclogo from "../../../Images/sliclogo.png";
import AddBankDepositNoPopUp from "./AddBankDepositNoPopUp";
import ErpTeamRequest from "../../../utils/ErpTeamRequest";
import { newERPBaseUrl } from "../../../utils/config";
import { useTaxContext } from "../../../Contexts/TaxContext";
import { RolesContext } from "../../../Contexts/FetchRolesContext";
import jsPDF from "jspdf";
import "jspdf-autotable";

const PosBulkMatchReceipts = () => {
  const { t, i18n } = useTranslation();
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [matchingTransactionLoader, setMatchingTransactionLaoder] =
    useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [totalInvoiceAmount, setTotalInvoiceAmount] = useState(0);
  const [exchangeAmount, setExchangeAmount] = useState(0);
  const [remainingAmount, setRemainingAmount] = useState(0);
  const [token, setToken] = useState(null);
  const { taxAmount } = useTaxContext();
  // console.log(taxAmount);

  const { userRoles } = useContext(RolesContext);
  const [hasBulkCashRole, setHasBulkCashRole] = useState(false);

  useEffect(() => {
    // Check if the user has the "bulk_cash" role
    const bulkCashRole = userRoles.find((role) => role.RoleName === "matching_receipt");
    setHasBulkCashRole(!!bulkCashRole);
  }, [userRoles]);

  console.log(hasBulkCashRole)

  useEffect(() => {
    // slic login api token get
    const token = JSON.parse(sessionStorage.getItem("slicLoginToken"));
    setToken(token);

    const storedLocationData = sessionStorage.getItem("selectedLocation");
    if (storedLocationData) {
      const locationData = JSON.parse(storedLocationData);
      if (JSON.stringify(locationData) !== JSON.stringify(selectedLocation)) {
        setSelectedLocation(locationData);
      }
      // console.log(locationData)
    }
  }, []);

  const [slicUserData, setSlicUserData] = useState(null);
  useEffect(() => {
    // slic our user data
    const slicUser = sessionStorage.getItem("slicUserData");
    const adminData = JSON.parse(slicUser);
    if (JSON.stringify(adminData) !== JSON.stringify(slicUserData)) {
      setSlicUserData(adminData?.data?.user);
      // console.log(adminData?.data?.user)
    }
  }, []);

  // console.log(slicUserData?.SalesmanCode);

  const [selectedMatchReceipts, setSelectedMatchReceipts] = useState(null);
  const [matchReceiptsList, setMatchReceiptsList] = useState([]);
  const [buttonEnabled, setButtonEnabled] = useState(false);
  const [matchingButtonEnabled, setMatchingButtonEnabled] = useState(false); // For "Matching Transaction" button
  const [matchingButtonText, setMatchingButtonText] = useState(
    "Matching Transaction"
  );

  const handleSelectedBrvReceipts = (event, value) => {
    console.log(value);
    setSelectedMatchReceipts(value);

    // Update "Add Bank Deposit Number" button
    setButtonEnabled(value !== null);

    // Check if isMatched is true, and update the "Matching Transaction" button
    if (value && value.isMatched) {
      setMatchingButtonEnabled(false);
      setMatchingButtonText("Already Matched");
    } else if (value) {
      setMatchingButtonEnabled(true);
      setMatchingButtonText("Matching Transaction");
    } else {
      setMatchingButtonEnabled(false);
      setMatchingButtonText("Matching Transaction");
    }

    if (value) {
      fetchData(value);
    }
  };

  const handleFetchAllBrvReceipts = async () => {
    try {
      const response = await newRequest.get(
        `/invoice/v1/getPOSInvoiceBatch?isMatched=false`
      );
      console.log(response.data);
      const data = response.data;
      const name = data.map((receipt) => ({
        id: receipt?.id,
        bulkCashDocNo: receipt.bulkCashDocNo,
        bulkCashRefNo: receipt.bulkCashRefNo,
        bankDepositNo: receipt.bankDepositNo,

      }));
      setMatchReceiptsList(name);
    } catch (error) {
      console.log(error);
      showApiError(error, { title: "Loading BRV receipts failed" });
    }
  };

  useEffect(() => {
    handleFetchAllBrvReceipts();
  }, []);

  // Calculate amounts based on IN and SR transactions
  const calculateAmounts = (transactions) => {
    let totalINAmount = 0;
    let totalSRAmount = 0;

    transactions.forEach((transaction) => {
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
      const dataWithTax = (response?.data || []).map(row => ({
        ...row,
        AmountWithTax: row.AdjAmount + (row.AdjAmount * taxAmount / 100)
      }));
      setData(dataWithTax);
      calculateAmounts(response?.data);
      console.log(response.data);
      setIsLoading(false);
    } catch (err) {
      console.log(err);
      setIsLoading(false);
      showApiError(err, { title: "Loading receipt invoices failed" });
    }
  };

  const [isAddBankDepositPopupVisible, setAddBankDepositPopupVisible] =
    useState(false);
  const handleShowUpdatePopup = (row) => {
    setAddBankDepositPopupVisible(true);
    // console.log(row)
    sessionStorage.setItem(
      "updateListOfEmployeeData",
      JSON.stringify(selectedMatchReceipts)
    );
  };

  // after the success of popup
  const resetComboBox = () => {
    setSelectedMatchReceipts(null);
    setButtonEnabled(false);
  };

  const handleRowClickInParent = async () => { };

  // const [zatcaQrcode, setZatcaQrcode] = useState(null);
  const handleInvoiceGenerator = async (selectedRow) => {
    const { createdAt, AdjAmount, InvoiceNo, TransactionCode } = selectedRow;

    try {
      const dynamicTransactionCode = TransactionCode
        ? TransactionCode.slice(-2)
        : "";
      console.log(dynamicTransactionCode);

      const invoiceResponse = await newRequest.get(
        // `/invoice/v1/headers-and-line-items?InvoiceNo=${InvoiceNo}`
        `/invoice/v1/headers-and-line-items?InvoiceNo=${InvoiceNo}&TransactionCode=${dynamicTransactionCode}`
      );

      const invoiceData = invoiceResponse?.data?.data;

      // console.log("Fetched invoice data:", invoiceData);

      const { invoiceDetails, invoiceHeader } = invoiceData;

      // Get VAT rate from VatNumber or use default (15%)
      const vatRate = invoiceHeader?.VatNumber
        ? parseFloat(invoiceHeader.VatNumber) / 100
        : 0.15;

      let totalGrossAmount = 0;
      let totalVAT = 0;

      // Loop through invoiceDetails and calculate gross, VAT, and total amounts
      invoiceDetails.forEach((item) => {
        const itemGross = item.ItemPrice * item.ItemQry; // Calculate gross amount for each item
        // const itemVAT = itemGross * vatRate; // Calculate VAT for each item
        const itemVAT = itemGross * taxAmount / 100; // Calculate VAT for each item
        totalGrossAmount += itemGross;
        totalVAT += itemVAT;
      });

      const totalAmountWithVAT = totalGrossAmount + totalVAT;

      const payload = {
        invoiceDate: createdAt,
        totalWithVat: totalAmountWithVAT,
        vatTotal: totalVAT,
      };

      const res = await newRequest.post("/zatca/generateZatcaQRCode", payload);
      const qrCodeDataFromApi = res?.data?.qrCodeData;
      // setZatcaQrcode(qrCodeDataFromApi);

      // Now pass the invoice data to handle the printing logic
      // handlePrintSalesInvoice(selectedRow, invoiceData);
      if (qrCodeDataFromApi) {
        // Now pass the invoice data to handle the printing logic
        handlePrintSalesInvoice(selectedRow, invoiceData, qrCodeDataFromApi);
      } else {
        throw new Error("QR code data not generated properly.");
      }

      toast.success("Invoice generated and ready to print!");
    } catch (err) {
      showApiError(err, {
        title: "Generating the invoice for printing failed",
        fallbackMessage: "An error occurred while generating the invoice",
      });
    }
  };

  // invoice generate
  const handlePrintSalesInvoice = async (
    selectedRow,
    invoiceData,
    qrCodeDataFromApi
  ) => {
    const { InvoiceNo, DocNo } = selectedRow;

    const { invoiceHeader, invoiceDetails } = invoiceData;

    // Generate QR code data URL
    const qrCodeDataURL = await QRCode.toDataURL(`${InvoiceNo}`);

    const formattedDate = new Date(
      invoiceHeader?.TransactionDate
    ).toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });

    let salesInvoiceTitle = "";
    const lastTwoTransactionCode = invoiceHeader?.TransactionCode.slice(-2);

    if (lastTwoTransactionCode === "IN") {
      salesInvoiceTitle = "SALES INVOICE";
    } else if (lastTwoTransactionCode === "SR") {
      salesInvoiceTitle = "CREDIT NOTE";
    }

    // Get VAT rate from VatNumber or use default (15%)
    const vatRate = invoiceHeader?.VatNumber
      ? parseFloat(invoiceHeader.VatNumber) / 100
      : 0.15;

    // const vatMultiplier = 1 + vatRate; // Multiplier for calculating total with VAT
    const vatMultiplier = 1 + taxAmount / 100; // Multiplier for calculating total with VAT
    // Calculate total VAT
    let totalGrossAmount = 0;
    let totalVAT = 0;
    let totalAmountWithVAT = 0;

    // Loop through invoiceDetails and calculate gross, VAT, and total amounts
    invoiceDetails.forEach((item) => {
      console.log(item);
      const itemGross = item.ItemPrice * item.ItemQry; // Calculate gross amount for each item
      // const itemVAT = itemGross * vatRate; // Calculate VAT for each item
      const itemVAT = itemGross * taxAmount / 100; // Calculate VAT for each item
      totalGrossAmount += itemGross;
      totalVAT += itemVAT;
    });

    totalAmountWithVAT = totalGrossAmount + totalVAT; // Total amount including VAT

    // Generate totals for exchange invoice
    const totalsContent = `
      <div>
        <strong>Gross:</strong>
        <div class="arabic-label">(ريال) المجموع</div>
        ${totalGrossAmount.toFixed(2)}
      </div>
      <div>
        <strong>VAT (${taxAmount || 0}%):</strong>
        <div class="arabic-label">ضريبة القيمة المضافة</div>
        ${totalVAT.toFixed(2)}
      </div>
      <div>
        <strong>Total Amount With VAT:</strong>
        <div class="arabic-label">المجموع</div>
        ${totalAmountWithVAT.toFixed(2)}
      </div>
      <div>
        <strong>Document No.:</strong>
        <div class="arabic-label">المتبقي</div>
        ${DocNo}
      </div>
    `;

    const html = `
      <html>
        <head>
          <title>Pos History</title>
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

          <div class="sales-invoice-title">${salesInvoiceTitle}</div>
          
          <div class="customer-info">
            <div><span class="field-label">Customer: </span>${invoiceHeader?.CustomerName
      }</div>
            <div style="display: flex; justify-content: space-between;">
              <div><span class="field-label">VAT#: </span>
                ${invoiceHeader?.VatNumber}
              </div>
              <div class="arabic-label" style="text-align: right; direction: rtl;">
                <span class="field-label">الرقم الضريبي#:</span>
                  ${invoiceHeader?.VatNumber}
              </div>
            </div>
            <div class="customer-invoiceNumber">
              <div>
                <div><span class="field-label">Receipt: </span>
                 ${InvoiceNo}
                </div>
                <div><span class="field-label">Date: </span>${formattedDate}</div>
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
           ${invoiceDetails
        .map(
          (item) => `
                <tr>
                  <td style="border-bottom: none;">${item.ItemSKU}</td>
                  <td style="border-bottom: none;">${item.ItemQry}</td>
                  <td style="border-bottom: none;">${item.ItemPrice}</td>
                  <td style="border-bottom: none;">${(
              item.ItemPrice * vatMultiplier
            ).toFixed(2)}</td>
                </tr>
                <tr>
                  <td colspan="4" style="text-align: left; padding-left: 20px;">
                    <div>
                      <span style="direction: ltr; text-align: left; display: block;">
                        ${item.Remarks}
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
      // let newQR='ARBOYXJ0ZWMgU29sdXRpb25zAg8zMDA0NTY0MTY1MDAwMDMDFDIwMjQtMDgtMTdUMTI6MDA6MDBaBAcxMDAwLjAwBQMxNTAGQGQzMzlkZDlkZGZkZTQ5MDI1NmM3OTVjOTFlM2RmZjBiNGQ2MTAyYjhhMGM4OTYxYzhhNGExNDE1YjZhZGMxNjYHjjMwNDUwMjIxMDBjZjk1MjkwMzc2ZTM5MjgzOGE4ZGYwMjc2YTdiMjEyYmUzMjMyNzAxNjFlNWFjYWY0MGNjOTgwMGJjNzJjNTY4MDIyMDQzYzEyZjEzMTdiZjMxN2Q2YWZkNTAwNTgxNDRlMjdmOTczNWUzZDZlMDYzYWI0MTk2YWU5YWQyZDlhMWVhN2MIgjA0OWM2MDM2NmQxNDg5NTdkMzAwMWQzZDQxNGI0NGIxYjA1MGY0NWZlODJjNDBkZTE4ZWI3NWM2M2Y1YzU2MjRmNDM3NzY0MWFjY2JlZmJiNDlhNGE4MmM1ZDAxY2YyMDRkNTdhMzEzODE1N2RmZDJmNmFlOTIzYjkzMjZiZmI5NWI='
      // Generate the QR code using the `qrcode` library
      QRCode.toCanvas(
        qrCodeCanvas,
        qrCodeDataFromApi,
        { width: 380 },
        function (error) {
          if (error) console.error(error);
          else {
            // Trigger the print dialog after the QR code is rendered
            printWindow.print();
            printWindow.close();
          }
        }
      );
      // setIsOpenOtpPopupVisible(false);
      // console.log(qrCodeData);
    };
  };

  const handleMatchingTransactions = async () => {
    setMatchingTransactionLaoder(true);
    let response;

    const payload = {
      url: newERPBaseUrl,
      data: [
        {
          BrvDocNo: selectedMatchReceipts?.bulkCashDocNo,
          BrvSysId: selectedMatchReceipts?.bulkCashRefNo,
          bankDepositNo: selectedMatchReceipts?.bankDepositNo,
          MatchingTransactions: data.map((row) => {
            // Determine VAT rate dynamically, defaulting to 15% if VatNumber is not provided
            const vatRate = row?.VatNumber
              ? parseFloat(row.VatNumber) / 100
              : 0.15;
            // const vatMultiplier = 1 + vatRate; // Multiplier for calculating total with VAT
            const vatMultiplier = 1 + taxAmount / 100; // Multiplier for calculating total with VAT

            return {
              DocNo: row?.DocNo,
              TransactionCode: row?.TransactionCode,
              CustCode: row?.CustomerCode,
              PendingAmount: parseFloat((row?.PendingAmount * vatMultiplier).toFixed(2)),
              AdjAmount: parseFloat((row?.AdjAmount * vatMultiplier).toFixed(2)),

            };
          }),
        },
      ],
      COMPANY: "SLIC",
      USERID: slicUserData?.UserLoginID,
      APICODE: "BULKBRVMATCHAPI",
      LANG: "ENG",
    };

    try {
      response = await ErpTeamRequest.post(
        "/slicuat05api/v1/postData",
        payload,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Check for 200 status and if the message property exists
      if (response?.status === 200 && response?.data?.message) {
        toast.success(response.data.message); // First API message

        const secondResponse = await newRequest.put(
          `/invoice/v1/updatePOSInvoiceBatch/${selectedMatchReceipts?.id}`,
          {
            isMatched: true,
          }
        );
        // Display message from the second API response
        if (secondResponse?.data?.message) {
          toast.success(
            secondResponse.data.message ||
            "POS Invoice Batch updated successfully!"
          );
          setData([]);
          // fetchData();
          resetComboBox();
        }
      } else {
        throw new Error("Message property missing from API response");
      }
    } catch (error) {
      showApiError(error, {
        title: "Matching transactions (BULKBRVMATCHAPI) failed",
        fallbackMessage: "Error in matching transactions.",
        response,
      });
      console.error("Matching transaction error:", error);
    }

    setMatchingTransactionLaoder(false);
  };

  const handlePrintPDF = () => {
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "pt", // Use points for better control over dimensions
      format: [1140, 600], // Custom page size
    });

    // Add title
    doc.setFontSize(16);
    doc.text("POS Bulk Match Receipts", 40, 40);

    // Define the columns and rows for the table
    const columns = [
      { header: "Invoice No", dataKey: "invoiceNo" },
      { header: "Customer Name", dataKey: "customerName" },
      { header: "Adjustment Amount", dataKey: "AdjAmount" },
      { header: "Amount With Tax", dataKey: "AmountWithTax" },
      { header: "Pending Amount", dataKey: "pendingAmount" },
      { header: "Document No", dataKey: "DocNo" },
      { header: "Transaction Code", dataKey: "transactionCode" },
      { header: "Customer Code", dataKey: "customerCode" },
      { header: "Transaction Type", dataKey: "transactionType" },
      { header: "Mobile No", dataKey: "mobileNo" },
    ];

    const rows = data.map((row) => ({
      invoiceNo: row.InvoiceNo,
      customerName: row.CustomerName,
      AdjAmount: row.AdjAmount,
      AmountWithTax: row.AmountWithTax,
      pendingAmount: row.PendingAmount,
      DocNo: row.DocNo,
      transactionCode: row.TransactionCode,
      customerCode: row.CustomerCode,
      transactionType: row.TransactionType,
      mobileNo: row.MobileNo,
    }));

    // Add the table to the PDF
    doc.autoTable({
      columns,
      body: rows,
      startY: 60,
      theme: 'grid',
      styles: {
        fontSize: 11, // Adjust font size
        cellPadding: 5, // Adjust cell padding
      },
      headStyles: {
        fillColor: [29, 47, 144], // Custom header color
        textColor: [255, 255, 255], // White text
      },
      columnStyles: {
        0: { cellWidth: 100 }, // Adjust column width
        1: { cellWidth: 110 },
        2: { cellWidth: 120 },
        3: { cellWidth: 110 },
        4: { cellWidth: 110 },
        5: { cellWidth: 110 },
        6: { cellWidth: 110 },
        7: { cellWidth: 100 },
        8: { cellWidth: 100 },
        9: { cellWidth: 90 },
      },
    });

    // Add totals at the end
    doc.setFontSize(12);
    doc.text(`Total Invoice Amount With VAT: ${totalInvoiceAmount}`, 40, doc.lastAutoTable.finalY + 20);
    doc.text(`Exchange Amount: ${exchangeAmount}`, 40, doc.lastAutoTable.finalY + 40);
    doc.text(`Remaining Amount: ${remainingAmount}`, 40, doc.lastAutoTable.finalY + 60);

    // Save the PDF
    doc.save("Match_Receipts.pdf");
  };

  return (
    <SideNav>
      <div className="p-3 h-full">
        <div className="flex justify-center items-center">
          <div className="h-auto w-full">
            <div className="h-auto w-full bg-white shadow-xl rounded-md">
              <div
                className={`sm:flex p-4 gap-2 w-full ${i18n.language === "ar" ? "flex-row-reverse" : "flex-row"
                  }`}
              >
                <div className="px-3 sm:w-[30%] w-full">
                  <Autocomplete
                    id="field1"
                    options={matchReceiptsList}
                    getOptionLabel={(option) =>
                      `${option?.bulkCashDocNo} - ${option?.bulkCashRefNo}`
                    }
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
                {hasBulkCashRole ? (
                  <div className="flex justify-end items-center w-full gap-3">
                    <button
                      className={`px-3 py-2 rounded-md font-sans mt-2 transition duration-300 ease-in-out ${buttonEnabled
                          ? "bg-secondary hover:bg-primary text-white hover:text-black"
                          : "bg-gray-400 text-white cursor-not-allowed"
                        }`}
                      disabled={!buttonEnabled}
                      onClick={handlePrintPDF}
                    >
                      Print PDF
                    </button>
                    <button
                      className={`px-3 py-2 rounded-md font-sans mt-2 transition duration-300 ease-in-out ${buttonEnabled
                          ? "bg-secondary hover:bg-primary text-white hover:text-black"
                          : "bg-gray-400 text-white cursor-not-allowed"
                        }`}
                      disabled={!buttonEnabled}
                      onClick={handleShowUpdatePopup}
                    >
                      Add Bank Deposit Number
                    </button>

                    <div className="mt-2">
                      <Button
                        variant="contained"
                        style={{
                          backgroundColor: matchingButtonEnabled
                            ? "#1d2f90"
                            : "#9ca3af",
                          color:
                            matchingButtonText === "Already Matched"
                              ? "#000000"
                              : "#ffffff",
                        }}
                        type="button"
                        onClick={handleMatchingTransactions}
                        disabled={!matchingButtonEnabled}
                        className="ml-2"
                        endIcon={
                          matchingTransactionLoader ? (
                            <CircularProgress size={24} color="inherit" />
                          ) : null
                        }
                      >
                        {matchingButtonText}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-end items-center w-full gap-3">You do not have permission to access these actions.</div>
                )}
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
              title={t("POS Bulk Match Receipts")}
              columnsName={posBulkCashreceiptInvoiceColumns(t)}
              loading={isLoading}
              secondaryColor="secondary"
              checkboxSelection="disabled"
              handleRowClickInParent={handleRowClickInParent}
              globalSearch={true}
              // actionColumnVisibility={false}
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
                  action: handleInvoiceGenerator,
                },
              ]}
              uniqueId="posHistoryId"
            />
          </div>
        </div>
        <div
          className={`flex  ${i18n.language === "ar" ? " justify-start" : "justify-end"
            }`}
        >
          <div className="bg-white p-4 rounded shadow-md sm:w-[60%] w-full">
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
                  {t("Total Invoice Amount WithVAT")}:
                </label>
                <input
                  type="text"
                  value={totalInvoiceAmount}
                  readOnly
                  className={`mt-1 p-2 border bg-gray-100 w-[60%] ${i18n.language === "ar" ? "text-start" : "text-end"
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
                  {t("Exchange Amount")}
                </label>
                <input
                  type="text"
                  value={exchangeAmount}
                  readOnly
                  className={`mt-1 p-2 border bg-gray-100 w-[60%]  ${i18n.language === "ar" ? "text-start" : "text-end"
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
                  {t("Remaining Amount")}
                </label>
                <input
                  type="text"
                  value={remainingAmount}
                  readOnly
                  className={`mt-1 p-2 border bg-gray-100  w-[60%] ${i18n.language === "ar" ? "text-start" : "text-end"
                    }`}
                />
              </div>
            </div>
          </div>
        </div>

        {isAddBankDepositPopupVisible && (
          <AddBankDepositNoPopUp
            isVisible={isAddBankDepositPopupVisible}
            setVisibility={setAddBankDepositPopupVisible}
            refreshGTINData={fetchData}
            resetComboBox={resetComboBox}
          />
        )}
      </div>
    </SideNav>
  );
};

export default PosBulkMatchReceipts;
