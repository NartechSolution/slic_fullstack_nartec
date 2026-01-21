import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import newRequest from "../../../utils/userRequest";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import SendIcon from "@mui/icons-material/Send";
import { Autocomplete, TextField } from "@mui/material";
import { useTranslation } from "react-i18next";

const UpdateControlSerialPopup = ({ isVisible, setVisibility, refreshData, data }) => {
  const { t, i18n } = useTranslation();
  const [newSize, setNewSize] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Generate size options from 31 to 49
  const sizeOptions = Array.from({ length: 19 }, (_, i) => ({
    label: `${31 + i}`,
    value: `${31 + i}`
  }));

  useEffect(() => {
    if (isVisible && data) {
      setNewSize("");
    }
  }, [isVisible, data]);

  const handleClosePopup = () => {
    setVisibility(false);
    setNewSize("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!data?.poNumber) {
      toast.error(t("Invalid PO Number"));
      return;
    }

    if (!data?.size) {
      toast.error(t("Current size not found"));
      return;
    }

    if (!newSize) {
      toast.error(t("New size is required"));
      return;
    }

    if (data.size === newSize) {
      toast.warning(t("New size must be different from current size"));
      return;
    }

    setLoading(true);

    try {
      const response = await newRequest.put(`/controlSerials/bulk/update-size-by-po`, {
        poNumber: data.poNumber,
        oldSize: data.size,
        newSize: newSize
      });
      
      toast.success(response?.data?.message || t("Size updated successfully for all items in PO"));
      if (refreshData) refreshData();
      handleClosePopup();
    } catch (err) {
      // console.error(err);
      toast.error(err?.response?.data?.message || err?.response?.data?.error || t("Error updating size"));
    } finally {
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
                    {t("Bulk Update PO Size")}
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

              <form onSubmit={handleSubmit} className="w-full overflow-y-auto mt-6 px-4">
                <div className="space-y-4">
                  {/* Info message */}
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                    <p className="text-sm text-blue-800">
                      {t("This will update the size for all items in this PO")}
                    </p>
                  </div>

                  {/* PO Number - Read Only */}
                  <div className="w-full font-body sm:text-base text-sm flex flex-col gap-2">
                    <label 
                      className={`text-secondary font-semibold ${i18n.language==='ar'?'text-end':'text-start'}`}
                    >
                      {t("PO Number")}:
                    </label>
                    <input
                      type="text"
                      value={data?.poNumber || ""}
                      readOnly
                      className="border w-full rounded-md border-secondary bg-gray-100 p-2 text-gray-600"
                    />
                  </div>

                  {/* Item Code - Read Only */}
                  <div className="w-full font-body sm:text-base text-sm flex flex-col gap-2">
                    <label 
                      className={`text-secondary font-semibold ${i18n.language==='ar'?'text-end':'text-start'}`}
                    >
                      {t("Item Code")}:
                    </label>
                    <input
                      type="text"
                      value={data?.ItemCode || ""}
                      readOnly
                      className="border w-full rounded-md border-secondary bg-gray-100 p-2 text-gray-600"
                    />
                  </div>

                  {/* Current Size - Read Only */}
                  <div className="w-full font-body sm:text-base text-sm flex flex-col gap-2">
                    <label 
                      className={`text-secondary font-semibold ${i18n.language==='ar'?'text-end':'text-start'}`}
                    >
                      {t("Current Size")}:
                    </label>
                    <input
                      type="text"
                      value={data?.size || ""}
                      readOnly
                      className="border w-full rounded-md border-secondary bg-gray-100 p-2 text-gray-600 font-semibold"
                    />
                  </div>

                  {/* New Size - Editable */}
                  <div className="w-full font-body sm:text-base text-sm flex flex-col gap-2">
                    <label className={`text-secondary font-semibold ${i18n.language==='ar'?'text-end':'text-start'}`}>
                      {t("New Size")} *:
                    </label>
                    <Autocomplete
                      options={sizeOptions}
                      getOptionLabel={(option) => option.label || ""}
                      value={sizeOptions.find(opt => opt.value === newSize) || null}
                      onChange={(event, newValue) => {
                        setNewSize(newValue?.value || "");
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          placeholder={t("Select new size")}
                          variant="outlined"
                          size="small"
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              '& fieldset': {
                                borderColor: '#021F69',
                              },
                            },
                          }}
                          required
                        />
                      )}
                      sx={{ width: '100%' }}
                    />
                  </div>

                  <div className="mt-6 py-4 border-t">
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
                      {t("UPDATE ALL ITEMS IN PO")}
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

export default UpdateControlSerialPopup;