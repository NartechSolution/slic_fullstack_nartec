import {
  Autocomplete,
  Button,
  CircularProgress,
  TextField,
} from "@mui/material";
import React, { useState, useEffect } from "react";
import ErpTeamRequest from "../../../utils/ErpTeamRequest";
import { showApiError } from "../../../utils/apiErrorHandler";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";

const ConfirmTransactionPopUp = ({
  isVisible,
  setVisibility,
  onSelectionsSaved,
  onPaymentModeChange,
}) => {
  
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(false);
  const token = JSON.parse(sessionStorage.getItem("slicLoginToken"));

  const [locations, setLocations] = useState([]);
  const [selectedPaymentModels, setSelectedPaymentModels] = useState(null);
  const getAllPaymentsModels = async () => {
    let res;
    try {
      res = await ErpTeamRequest.post(
        "/slicuat05api/v1/getApi",
        {
          filter: {},
          M_COMP_CODE: "SLIC",
          M_USER_ID: "SYSADMIN",
          APICODE: "ZATCAPAYMENTMODE",
          M_LANG_CODE: "ENG",
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      // Assuming the response structure is similar to what you provided
      const paymentModes = res.data.map((item) => ({
        code: item.ZATCAPAYMENTMODE.VSSV_CODE,
        name: item.ZATCAPAYMENTMODE.VSSV_NAME,
      }));

      setLocations(paymentModes);
    } catch (error) {
      console.log(error);
      showApiError(error, {
        title: "Loading payment modes (ZATCAPAYMENTMODE) failed",
        response: res,
      });
    }
  };

  const [examptionsTypes, setExamptionsTypes] = useState([]);
  const [selectedExamption, setSelectedExamption] = useState(null);

  const getAllExamptions = async () => {
    let res;
    try {
      res = await ErpTeamRequest.post(
        "/slicuat05api/v1/getApi",
        {
          filter: {},
          M_COMP_CODE: "SLIC",
          M_USER_ID: "SYSADMIN",
          APICODE: "TAXEXEMPTIONREASON",
          M_LANG_CODE: "ENG",
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const exemptionReasons = res.data.map((item) => ({
        code: item.TAXEXEMPTIONREASON.VSSV_CODE,
        name: item.TAXEXEMPTIONREASON.VSSV_NAME,
      }));

      setExamptionsTypes(exemptionReasons);
    } catch (error) {
      console.log(error);
      showApiError(error, {
        title: "Loading tax exemption reasons (TAXEXEMPTIONREASON) failed",
        response: res,
      });
    }
  };

  useEffect(() => {
    getAllPaymentsModels();
    getAllExamptions();
  }, []);

  const handlePaymentModelsChange = (e) => {
    const selectedPaymentMode = locations.find(
      (location) => `${location.code} - ${location.name}` === e.target.value
    );
    setSelectedPaymentModels(selectedPaymentMode);
    if (selectedPaymentMode) {
      sessionStorage.setItem(
        "selectedPaymentModels",
        JSON.stringify(selectedPaymentMode)
      );

      onPaymentModeChange(selectedPaymentMode);
    }
  };

  // const handleExamptionsTypesChange = (event, value) => {
  //   setSelectedExamption(value);
  //   if (value) {
  //     sessionStorage.setItem("selectedExamptionReason", JSON.stringify(value));
  //   }
  // };

  const handleExamptionsTypesChange = (event, value) => {
    setSelectedExamption(value);
    sessionStorage.setItem("selectedExamptionReason", JSON.stringify(value));
  };

  // Ensure reset happens when the popup becomes visible or invisible
  useEffect(() => {
    if (isVisible) {
      // Clear the selection when popup is closed
      setSelectedExamption(null);
      sessionStorage.removeItem("selectedExamptionReason");
    }
  }, [isVisible]);


    useEffect(() => {
      if (selectedPaymentModels) {
        console.log(selectedPaymentModels);
      }
    }, [selectedPaymentModels]);

  //   useEffect(() => {
  //     if (selectedExamption) {
  //       console.log(selectedExamption);
  //     }
  //   }, [selectedExamption]);

  const handleConfirm = () => {
    if (!selectedPaymentModels) {
      toast.error("Please select a Payment Mode before confirming.");
      return;
    }
    
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onSelectionsSaved();
      setVisibility(false);
    }, 500);
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
                    {t("Confirm Transactions")}
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
              <div className="w-full overflow-y-auto">
                <div className="flex justify-between flex-col sm:flex-row sm:gap-3 gap-3 mt-5">
                  <div className="w-full lg:mt-0 md:mt-3 mt-6">
                    {/* dropdown */}
                    <div className={`w-full font-body sm:text-base text-sm flex flex-col gap-0 ${
                        i18n.language === "ar" ? "text-end" : "text-start"
                      }`}>
                      <label htmlFor="startsize" className={`text-secondary`}>
                        {t("Payment Mode")}
                      </label>
                      <select
                        id="locations"
                        onChange={handlePaymentModelsChange}
                        className="block w-full bg-white border border-gray-300 hover:border-gray-500 px-4 py-2 pr-8 rounded leading-tight focus:outline-none focus:shadow-outline"
                      >
                        <option value="" disabled selected>
                          {t("Select Payment Mode")}
                        </option>
                        {locations.map((location) => (
                          <option key={location.code}>
                            {location.code} - {location.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div
                      className={`w-full font-body sm:text-base text-sm flex flex-col mt-6 ${
                        i18n.language === "ar" ? "text-end" : "text-start"
                      }`}
                    >
                      <label htmlFor="SelectRoles" className={`text-secondary`}>
                        {t("Tax Exemption Reason")}
                      </label>
                      <Autocomplete
                        id="SelectRoles"
                        options={examptionsTypes}
                        getOptionLabel={(option) =>
                          option ? `${option.code} - ${option.name}` : ""
                        }
                        value={selectedExamption}
                        onChange={handleExamptionsTypesChange}
                        filterSelectedOptions
                        renderInput={(params) => (
                          <TextField
                            autoComplete="off"
                            {...params}
                            label={t("Select Reasons")}
                            placeholder={t("Select Roles")}
                            variant="outlined"
                          />
                        )}
                        required
                      />
                    </div>

                    <div className="mt-5">
                      <Button
                        variant="contained"
                        style={{ backgroundColor: "#021F69", color: "#ffffff" }}
                        onClick={handleConfirm}
                        disabled={loading}
                        className="w-full ml-2"
                        endIcon={
                          loading ? (
                            <CircularProgress size={24} color="inherit" />
                          ) : null
                        }
                      >
                        {t("Confirm")}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConfirmTransactionPopUp;
