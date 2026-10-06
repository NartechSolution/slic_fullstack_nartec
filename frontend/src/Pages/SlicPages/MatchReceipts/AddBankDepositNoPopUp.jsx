import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import newRequest from "../../../utils/userRequest";
import { showApiError } from "../../../utils/apiErrorHandler";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import SendIcon from "@mui/icons-material/Send";
import { useTranslation } from "react-i18next";
import { AiOutlineFieldNumber, AiOutlineNumber } from "react-icons/ai";
import { FaFileInvoiceDollar, FaMoneyBillWave } from "react-icons/fa";

const AddBankDepositNoPopUp = ({
  isVisible,
  setVisibility,
  refreshGTINData,
  resetComboBox,
}) => {
  const { t, i18n } = useTranslation();
  const [bankDepositNumber, setBankDepositNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const memberDataString = sessionStorage.getItem("slicUserData");
  const memberData = JSON.parse(memberDataString);
  // console.log(memberData)

  const handleCloseCreatePopup = () => {
    setVisibility(false);
  };

  // get this session data
  const updateProductsData = JSON.parse(
    sessionStorage.getItem("updateListOfEmployeeData")
  );

  //   console.log("Selected Value", updateProductsData);

  const handleAddGTIN = async (e) => {
    e.preventDefault();
    // console.log(itemCode, quantity, description, startSize, endSize);
    setLoading(true);

    try {
      const requestBody = {
        bankDepositNo: bankDepositNumber,
      };

      //   console.log(requestBody);

      const response = await newRequest.put(
        `/invoice/v1/updatePOSInvoiceBatch/${updateProductsData?.id}`,
        requestBody,
        {
          headers: {
            Authorization: `Bearer ${memberData?.data?.token}`,
          },
        }
      );
      // console.log(response?.data);
      toast.success(
        response?.data?.message || "Bank Deposit Number Added Successfully"
      );
      setLoading(false);
      handleCloseCreatePopup();
      refreshGTINData();
      resetComboBox();
    } catch (error) {
      showApiError(error, {
        title: "Saving the bank deposit number failed",
        fallbackMessage: "Failed to Add Bank Deposit Number",
      });
      //   console.log(error);
      setLoading(false);
    }
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
                    {t("Adding Bank Deposit Number")}
                  </h2>
                  <div className="flex items-center space-x-3">
                    <button
                      className="text-white hover:text-gray-300 focus:outline-none"
                      onClick={handleCloseCreatePopup}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M20 14H4"
                        />
                      </svg>
                    </button>
                    <button
                      className="text-white hover:text-gray-300 focus:outline-none"
                      onClick={handleCloseCreatePopup}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 4h16v16H4z"
                        />
                      </svg>
                    </button>
                    <button
                      className="text-white hover:text-red-600 focus:outline-none"
                      onClick={handleCloseCreatePopup}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
              <form onSubmit={handleAddGTIN} className="w-full overflow-y-auto">
                <div
                  className={`flex justify-between flex-col  sm:gap-3 gap-3 mt-5 ${
                    i18n.language === "ar"
                      ? "sm:flex-row-reverse"
                      : "sm:flex-row"
                  }`}
                >
                  <div className="w-full lg:mt-0 md:mt-3 mt-6">
                    {/* Selected Information */}
                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 shadow-md border border-blue-300 rounded-lg p-6 mb-4">
                      <h3 className="font-bold text-xl text-secondary mb-4 text-center">
                        {t("Bulk Cash Information")}
                      </h3>

                      <div className="flex flex-col gap-4">
                        <div className="flex justify-between items-center text-lg">
                          <div className="flex items-center gap-2">
                            <AiOutlineFieldNumber className="text-blue-600 text-xl" />
                            <span className="font-semibold">
                              {t("Bulk Cash Reference Number")}:
                            </span>
                          </div>
                          <span className="text-blue-700">
                            {updateProductsData?.bulkCashRefNo || t("N/A")}
                          </span>
                        </div>

                        <div className="flex justify-between items-center text-lg">
                          <div className="flex items-center gap-2">
                            <FaFileInvoiceDollar className="text-green-600 text-xl" />
                            <span className="font-semibold">
                              {t("Bulk Cash Document Number")}:
                            </span>
                          </div>
                          <span className="text-green-700">
                            {updateProductsData?.bulkCashDocNo || t("N/A")}
                          </span>
                        </div>

                        <div className="flex justify-between items-center text-lg">
                          <div className="flex items-center gap-2">
                            <FaMoneyBillWave className="text-yellow-600 text-xl" />
                            <span className="font-semibold">
                              {t("Bulk Cash Deposit Number")}:
                            </span>
                          </div>
                          <span className="text-yellow-700">
                            {updateProductsData?.bankDepositNo || t("N/A")}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-center items-center sm:gap-3 gap-3">
                      <div className="w-full font-body sm:text-base text-sm flex flex-col gap-0">
                        <label
                          htmlFor="depositnumber"
                          className={`text-secondary ${
                            i18n.language === "ar" ? "text-end" : "text-start"
                          }`}
                        >
                          {t("Enter Bank Deposit Number")}
                        </label>
                        <input
                          type="text"
                          id="depositnumber"
                          value={bankDepositNumber}
                          onChange={(e) => setBankDepositNumber(e.target.value)}
                          placeholder={t("Enter Bank Deposit Number")}
                          className={`border w-full rounded-md border-secondary placeholder:text-secondary p-2 mb-3  ${
                            i18n.language === "ar" ? "text-end" : "text-start"
                          }`}
                          required
                        />
                      </div>
                    </div>

                    <div className="mt-5">
                      <Button
                        variant="contained"
                        style={{ backgroundColor: "#021F69", color: "#ffffff" }}
                        type="submit"
                        disabled={loading}
                        className="w-full ml-2"
                        endIcon={
                          loading ? (
                            <CircularProgress size={24} color="inherit" />
                          ) : (
                            <SendIcon />
                          )
                        }
                      >
                        {t("Add Deposit Number")}
                      </Button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddBankDepositNoPopUp;
