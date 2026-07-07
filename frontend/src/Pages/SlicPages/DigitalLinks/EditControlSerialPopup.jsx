import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import newRequest from "../../../utils/userRequest";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import SendIcon from "@mui/icons-material/Send";
import { useTranslation } from "react-i18next";

const EditControlSerialPopup = ({ isVisible, setVisibility, refreshData, serialData }) => {
  const { t, i18n } = useTranslation();
  const [itemCode, setItemCode] = useState("");
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (serialData) {
      setItemCode(serialData.ItemCode || "");
    }
  }, [serialData]);

  const handleClosePopup = () => {
    setVisibility(false);
    setItemCode("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!itemCode) {
      toast.error(t("Item code is required"));
      return;
    }

    if (!serialData?.id) {
      toast.error(t("Serial ID is required"));
      return;
    }

    setLoading(true);

    try {
      const response = await newRequest.put(
        `/controlSerials/${serialData.id}`,
        {
          ItemCode: itemCode
        }
      );
      
      toast.success(response?.data?.message || t("Control serial updated successfully"));
      setLoading(false);
      handleClosePopup();
      refreshData();
    } catch (err) {
        //   console.error(err);
      toast.error(err?.response?.data?.error || err?.response?.data?.message || t("Error in updating control serial"));
      setLoading(false);
    }
  };

  return (
    <div>
      {isVisible && (
        <div className="popup-overlay z-50">
          <div className="popup-container h-auto sm:w-[40%] w-full">
            <div
              className="popup-form w-full"
              style={{ maxHeight: "90vh", overflowY: "auto" }}
            >
              <div className="relative">
                <div className="fixed top-0 left-0 z-10 flex justify-between w-full px-3 bg-secondary">
                  <h2 className="text-white sm:text-xl text-lg font-body font-semibold">
                    {t("Edit Control Serial")}
                  </h2>
                  <div className="flex items-center space-x-3">
                    <button 
                      className="text-white hover:text-gray-300 focus:outline-none"
                      onClick={handleClosePopup}
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
                      className="text-white hover:text-red-600 focus:outline-none"
                      onClick={handleClosePopup}
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

              <form onSubmit={handleSubmit} className="w-full overflow-y-auto mt-12 px-4">
                <div className="space-y-4">
                  <div className="w-full font-body sm:text-base text-sm flex flex-col gap-2">
                    <label 
                      htmlFor="serialNumber" 
                      className={`text-secondary font-semibold ${i18n.language==='ar'?'text-end':'text-start'}`}
                    >
                      {t("Serial Number")}
                    </label>
                    <input
                      type="text"
                      id="serialNumber"
                      value={serialData?.serialNumber || ""}
                      readOnly
                      className={`border w-full rounded-md border-secondary bg-gray-100 p-2 ${i18n.language==='ar'?'text-end':'text-start'}`}
                    />
                  </div>

                  <div className="w-full font-body sm:text-base text-sm flex flex-col gap-2">
                    <label 
                      htmlFor="itemCode" 
                      className={`text-secondary font-semibold ${i18n.language==='ar'?'text-end':'text-start'}`}
                    >
                      {t("Item Code")} *
                    </label>
                    <input
                      type="text"
                      id="itemCode"
                      value={itemCode}
                      onChange={(e) => setItemCode(e.target.value)}
                      placeholder={t("Enter item code")}
                      className={`border w-full rounded-md border-secondary placeholder:text-secondary p-2 ${i18n.language==='ar'?'text-end':'text-start'}`}
                      required
                    />
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
                    <p className="text-sm text-amber-800">
                      <strong>{t("Note")}:</strong> {t("You are updating the item code for serial number")} <strong>{serialData?.serialNumber}</strong>
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t">
                    <Button
                      variant="contained"
                      style={{ backgroundColor: "#021F69", color: "#ffffff" }}
                      type="submit"
                      disabled={loading}
                      className="w-full"
                      endIcon={
                        loading ? (
                          <CircularProgress size={24} color="inherit" />
                        ) : (
                          <SendIcon />
                        )
                      }
                    >
                      {t("Update Control Serial")}
                    </Button>
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

export default EditControlSerialPopup;