import React, { useState, useEffect } from "react";
import CircularProgress from "@mui/material/CircularProgress";
import newRequest from "../../../utils/userRequest";
import { showApiError } from "../../../utils/apiErrorHandler";
import { useTranslation } from "react-i18next";


// Helper function to format date
const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

const MobileNumberPopUp = ({ isVisible, setVisibility, mobileNo, onSelectInvoice }) => {
  const [invoiceNumbers, setInvoiceNumbers] = useState([]);
  
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(false);
  
  const handleCloseCreatePopup = () => {
    setVisibility(false);
  };

  const fetchInvoiceNumbers = async () => {
    setLoading(true);
    try {
      const res = await newRequest.get(`/invoice/v1/invoices?MobileNo=${mobileNo}`);
      let sortedInvoices = res.data?.data;
  
      // Sorting the invoices in descending order by `createdAt`
      sortedInvoices = sortedInvoices.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      setInvoiceNumbers(sortedInvoices);
    } catch (err) {
      showApiError(err, {
        title: "Loading invoices for this mobile number failed",
        fallbackMessage: "Error fetching invoice numbers",
      });
    } finally {
      setLoading(false);
    }
  };  

  // Trigger the API call when popup becomes visible
  useEffect(() => {
    if (isVisible && mobileNo) {
      fetchInvoiceNumbers();
    }
  }, [isVisible, mobileNo]);


  const handleRowClick = (invoiceNo) => {
    onSelectInvoice(invoiceNo); // Pass the selected invoice number to parent
    setVisibility(false); // Close the popup
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
                    {t("Invoice Numbers for")} <span className="">{mobileNo}</span>
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
              
              <div className="popup-body w-full">
              {loading ? (
                <div className="flex justify-center py-4">
                  <CircularProgress />
                </div>
              ) : (
                <div className="w-full mt-3">
                  {invoiceNumbers.length > 0 ? (
                    <table className="w-full table-auto border-collapse m-0">
                      <thead>
                        <tr className="bg-gray-200">
                          <th className="border px-4 py-2 text-left">{t("Transaction Date")}</th>
                          <th className="border px-4 py-2 text-left">{t("Invoice Number")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoiceNumbers.map((invoice) => (
                          <tr 
                            key={invoice.TblSysNoID}
                            className="border-t cursor-pointer hover:bg-gray-100"
                            onClick={() => handleRowClick(invoice.InvoiceNo)}
                            >
                            <td className="border px-4 py-2">{formatDate(invoice.TransactionDate)}</td>
                            <td className="border px-4 py-2">{invoice.InvoiceNo}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p  className={`text-gray-500 ${i18n.language === "ar" ? "text-end"  : "text-start" }`}>{t("No invoice numbers found for this mobile number.")}</p>
                  )}
                </div>
              )}
            </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileNumberPopUp;
