import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import newRequest from "../../../utils/userRequest";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import SendIcon from "@mui/icons-material/Send";
import Chip from "@mui/material/Chip";
import { useTranslation } from "react-i18next";

const UpdateImagesPopUp = ({ isVisible, setVisibility, refreshGTINData, selectedRows = [], onPrintComplete }) => {
  const { t, i18n } = useTranslation();
  const [itemCode, setItemCode] = useState("");
  const [sizes, setSizes] = useState([]);
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState("");
  
  const memberDataString = sessionStorage.getItem('slicUserData');
  const memberData = JSON.parse(memberDataString);

  useEffect(() => {
    if (isVisible && selectedRows && selectedRows.length > 0) {
      validateAndSetData();
    }
  }, [isVisible, selectedRows]);

  const validateAndSetData = () => {
    // Check if all selected rows have the same ItemCode
    const itemCodes = selectedRows.map(row => row.ItemCode || row.upper);
    const uniqueItemCodes = [...new Set(itemCodes)];
    
    if (uniqueItemCodes.length > 1) {
      setValidationError(t("All selected products must have the same Item Code"));
      setItemCode("");
      setSizes([]);
      return;
    }
    
    if (uniqueItemCodes.length === 0) {
      setValidationError(t("No valid Item Code found in selected products"));
      setItemCode("");
      setSizes([]);
      return;
    }

    // Set item code
    setItemCode(uniqueItemCodes[0]);
    
    // Extract all sizes from selected rows
    const extractedSizes = selectedRows
      .map(row => row.ProductSize)
      .filter(size => size); // Remove null/undefined values
    
    setSizes([...new Set(extractedSizes)]); // Remove duplicates
    setValidationError("");
  };

  const handleCloseCreatePopup = () => {
    setVisibility(false);
    setImage(null);
    setImagePreview(null);
    setItemCode("");
    setSizes([]);
    setValidationError("");
    onPrintComplete();
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error(t("Please select a valid image file"));
        return;
      }
      
      // Validate file size (e.g., max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error(t("Image size should be less than 5MB"));
        return;
      }

      setImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImage(null);
    setImagePreview(null);
  };

  const handleUpdateImages = async (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    
    // Validation checks
    if (validationError) {
      toast.error(validationError);
      return;
    }

    if (!itemCode) {
      toast.error(t("Item Code is required"));
      return;
    }

    if (sizes.length === 0) {
      toast.error(t("At least one size must be selected"));
      return;
    }

    if (!image) {
      toast.error(t("Please select an image to upload"));
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('itemCode', itemCode);
      formData.append('sizes', JSON.stringify(sizes));
      formData.append('image', image);

      const response = await newRequest.put(
        "/itemCodes/v1/itemCodes/bulk", 
        formData, 
        {
          headers: {
            Authorization: `Bearer ${memberData?.data?.token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      
      toast.success(response?.data?.message || t("Images updated successfully"));
      setLoading(false);
      handleCloseCreatePopup();
      onPrintComplete();
      refreshGTINData();
    } catch (error) {
      toast.error(error?.response?.data?.message || t("Error updating images"));
    //   console.error("Update error:", error);
      setLoading(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="popup-overlay z-50">
      <div className="popup-container h-auto sm:w-[45%] w-full">
        <div
          className="popup-form w-full"
          style={{ maxHeight: "90vh", overflowY: "auto" }}
        >
          {/* Header */}
          <div className="relative">
            <div className="fixed top-0 left-0 z-10 flex justify-between w-full px-3 bg-secondary">
              <h2 className="text-white sm:text-xl text-lg font-body font-semibold">
                {t("Update Product Images")}
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

          {/* Form Content */}
          <div className="w-full overflow-y-auto mt-5">
            {/* Validation Error Message */}
            {validationError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                <p className="font-semibold">{t("Validation Error")}</p>
                <p className="text-sm">{validationError}</p>
              </div>
            )}

            {/* Selected Products Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
              <p className="text-secondary font-semibold mb-2">
                {t("Selected Products")}: {selectedRows.length}
              </p>
              {itemCode && (
                <p className="text-secondary text-sm">
                  {t("Item Code")}: <span className="font-bold">{itemCode}</span>
                </p>
              )}
            </div>

            <div className={`flex justify-between flex-col gap-4 ${i18n.language==='ar'? 'text-end':'text-start'}`}>
              {/* Item Code - Read Only */}
              <div className="w-full font-body sm:text-base text-sm flex flex-col gap-2">
                <label htmlFor="itemCode" className="text-secondary font-semibold">
                  {t("Item Code")}
                </label>
                <input
                  type="text"
                  id="itemCode"
                  value={itemCode}
                  readOnly
                  className={`border w-full rounded-md border-secondary bg-gray-100 p-2 ${i18n.language==='ar'?'text-end':'text-start'}`}
                />
              </div>

              {/* Sizes Display */}
              <div className="w-full font-body sm:text-base text-sm flex flex-col gap-2">
                <label className="text-secondary font-semibold">
                  {t("Selected Sizes")} ({sizes.length})
                </label>
                <div className="border w-full rounded-md border-secondary p-3 bg-gray-50 min-h-[60px] flex flex-wrap gap-2">
                  {sizes.length > 0 ? (
                    sizes.map((size, index) => (
                      <Chip
                        key={index}
                        label={size}
                        color="primary"
                        size="small"
                        style={{ backgroundColor: "#1D2F90", color: "white" }}
                      />
                    ))
                  ) : (
                    <p className="text-gray-400 text-sm">{t("No sizes selected")}</p>
                  )}
                </div>
              </div>

              {/* Image Upload Section */}
              <div className="w-full font-body sm:text-base text-sm flex flex-col gap-2">
                <label htmlFor="image" className="text-secondary font-semibold">
                  {t("Product Image")} <span className="text-red-500">*</span>
                </label>
                <div className="border-2 border-dashed border-secondary rounded-md p-4 text-center">
                  {!imagePreview ? (
                    <div>
                      <input
                        type="file"
                        id="image"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                      <label
                        htmlFor="image"
                        className="cursor-pointer flex flex-col items-center justify-center"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-12 w-12 text-secondary mb-2"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                          />
                        </svg>
                        <span className="text-secondary font-semibold">
                          {t("Click to upload image")}
                        </span>
                        <span className="text-gray-500 text-xs mt-1">
                          {t("PNG, JPG up to 5MB")}
                        </span>
                      </label>
                    </div>
                  ) : (
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="max-h-48 mx-auto rounded-md shadow-md"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
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
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <div className="mt-4">
                <Button
                  variant="contained"
                  style={{ backgroundColor: "#021F69", color: "#ffffff" }}
                  onClick={handleUpdateImages}
                  disabled={loading || !!validationError || !itemCode || sizes.length === 0}
                  className="w-full"
                  endIcon={
                    loading ? (
                      <CircularProgress size={24} color="inherit" />
                    ) : (
                      <SendIcon />
                    )
                  }
                >
                  {loading ? t("Updating...") : t("Update Images")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpdateImagesPopUp;