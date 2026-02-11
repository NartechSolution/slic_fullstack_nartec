import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import newRequest from "../../../utils/userRequest";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import SendIcon from "@mui/icons-material/Send";
import "./AddGTIN.css";
import Barcode from "react-barcode";
import { QRCodeSVG } from "qrcode.react";
import { useTranslation } from "react-i18next";
import imageLiveUrl from "../../../utils/urlConverter/imageLiveUrl";

const UpdateGTINPopUp = ({ isVisible, setVisibility, refreshGTINData }) => {
  const { t, i18n } = useTranslation();
  const [barcode, setBarcode] = useState("");
  const [itemCode, setItemCode] = useState("");
  const [quantity, setQuantiity] = useState("");
  const [description, setDescription] = useState("");
  const [arabicDescription, setArabicDescription] = useState("");
  const [startSize, setStartSize] = useState("");
  const [endSize, setEndSize] = useState("");
  const [upper, setUpper] = useState("");
  const [sole, setSole] = useState("");
  const [width, setWidth] = useState("");
  const [label, setLabel] = useState("");
  const [color, setColor] = useState("");
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [existingImage, setExistingImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const memberDataString = sessionStorage.getItem('slicUserData');
  const memberData = JSON.parse(memberDataString);
  
  const handleCloseCreatePopup = () => {
    setVisibility(false);
    setImage(null);
    setImagePreview(null);
  };

  // get this session data
  const updateProductsData = JSON.parse(sessionStorage.getItem("updateListOfEmployeeData"));

  useEffect(() => {
    setItemCode(updateProductsData?.ItemCode || "");
    setQuantiity(1 || "");
    setDescription(updateProductsData?.EnglishName || "");
    setArabicDescription(updateProductsData?.ArabicName || "");
    setStartSize(updateProductsData?.ProductSize || "");
    setEndSize(updateProductsData?.EndSize || "");
    setUpper(updateProductsData?.upper || "");
    setSole(updateProductsData?.sole || "");
    setWidth(updateProductsData?.width || "");
    setLabel(updateProductsData?.label || "");
    setColor(updateProductsData?.color || "");
    setBarcode(updateProductsData?.GTIN || "");
    setExistingImage(imageLiveUrl(updateProductsData?.image) || null);
  }, []);

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

  const handleAddGTIN = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('itemCode', itemCode);
      formData.append('description', description);
      formData.append('startSize', startSize);
      formData.append('ArabicName', arabicDescription);
      formData.append('upper', upper);
      formData.append('sole', sole);
      formData.append('width', width);
      formData.append('label', label);
      formData.append('color', color);
      
      // Only append image if a new one is selected
      if (image) {
        formData.append('image', image);
      }

      const response = await newRequest.put(
        `/itemCodes/v1/itemCode/${updateProductsData?.GTIN}`, 
        formData, 
        {
          headers: {
            Authorization: `Bearer ${memberData?.data?.token}`,
            'Content-Type': 'multipart/form-data',
          }
        }
      );
      
      toast.success(response?.data?.message || t("GTIN Updated successfully"));
      setLoading(false);
      handleCloseCreatePopup();
      refreshGTINData();
    } catch (error) {
      toast.error(error?.response?.data?.message || t("Error in updating GTIN"));
      // console.log(error);
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
                    {t("Update Products Barcodes")}
                  </h2>
                  <div className="flex items-center space-x-3">
                    <button className="text-white hover:text-gray-300 focus:outline-none"
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
                    <button className="text-white hover:text-gray-300 focus:outline-none"
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
                <div className={`flex justify-between flex-col  sm:gap-3 gap-3 mt-5 ${i18n.language==='ar'? 'sm:flex-row-reverse':'sm:flex-row'}`}>
                  <div className="w-full lg:mt-0 md:mt-3 mt-6">
                    <div className="flex justify-center items-center sm:gap-3 gap-3">
                      {/* Quantity field commented out as per original */}
                    </div>

                    <div className="flex justify-center items-center sm:gap-3 gap-3">
                      <div className="w-full font-body sm:text-base text-sm flex flex-col gap-0">
                        <label
                          htmlFor="englishName"
                          className={`text-secondary ${i18n.language==='ar'?'text-end':'text-start'}`}
                        >
                          {t("Description")}
                        </label>
                        <textarea
                          type="text"
                          id="englishName"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder={t("Enter Description")}
                          className={`border w-full rounded-md border-secondary placeholder:text-secondary p-2 mb-3  ${i18n.language==='ar'?'text-end':'text-start'}`}
                          required
                        />
                      </div>
                    </div>

                    <div className="w-full font-body sm:text-base text-sm flex flex-col gap-0">
                      <label
                        htmlFor="arabicName"
                        className={`text-secondary ${i18n.language==='ar'?'text-end':'text-start'}`}
                      >
                        {t("Arabic Description")}
                      </label>
                      <textarea
                        type="text"
                        id="arabicName"
                        value={arabicDescription}
                        onChange={(e) => setArabicDescription(e.target.value)}
                        placeholder={t("Enter Arabic Description")}
                        className={`border w-full rounded-md border-secondary placeholder:text-secondary p-2 mb-3  ${i18n.language==='ar'?'text-end':'text-start'}`}
                        required
                      />
                    </div>

                    <div className="flex justify-center items-center sm:gap-3 gap-3">
                      <div className="w-full font-body sm:text-base text-sm flex flex-col gap-0">
                        <label htmlFor="startsize" className={`text-secondary ${i18n.language==='ar'?'text-end':'text-start'}`}>
                          {t("Size")}
                        </label>
                        <input
                          type="text"
                          id="startsize"
                          value={startSize}
                          onChange={(e) => setStartSize(e.target.value)}
                          placeholder={t("Enter Size")}
                          className={`border w-full rounded-md border-secondary placeholder:text-secondary p-2 mb-3  ${i18n.language==='ar'?'text-end':'text-start'}`}
                          required
                        />
                      </div>
                      
                      <div className="w-full font-body sm:text-base text-sm flex flex-col gap-0">
                        <label htmlFor="color" className={`text-secondary ${i18n.language==='ar'?'text-end':'text-start'}`}>
                          {t("Color")}
                        </label>
                        <input
                          type="text"
                          id="color"
                          value={color}
                          onChange={(e) => setColor(e.target.value)}
                          placeholder={t("Enter Color")}
                          className={`border w-full rounded-md border-secondary placeholder:text-secondary p-2 mb-3  ${i18n.language==='ar'?'text-end':'text-start'}`}
                          required
                        />
                      </div>
                    </div>

                    <div className="flex justify-center items-center sm:gap-3 gap-3">
                      <div className="w-full font-body sm:text-base text-sm flex flex-col gap-0">
                        <label htmlFor="itemCode" className={`text-secondary ${i18n.language==='ar'?'text-end':'text-start'}`}>
                          {t("Item Code")}
                        </label>
                        <input
                          type="text"
                          id="itemCode"
                          value={itemCode}
                          onChange={(e) => setItemCode(e.target.value)}
                          placeholder={t("Enter item Code")}
                          className={`border w-full rounded-md border-secondary placeholder:text-secondary p-2 mb-3  ${i18n.language==='ar'?'text-end':'text-start'}`}
                          required
                        />
                      </div>
                      <div className="w-full font-body sm:text-base text-sm flex flex-col gap-0">
                        <label htmlFor="label" className={`text-secondary ${i18n.language==='ar'?'text-end':'text-start'}`}>
                          {t("Label")}
                        </label>
                        <input
                          type="text"
                          id="label"
                          value={label}
                          onChange={(e) => setLabel(e.target.value)}
                          placeholder={t("Enter Label")}
                          className={`border w-full rounded-md border-secondary placeholder:text-secondary p-2 mb-3  ${i18n.language==='ar'?'text-end':'text-start'}`}
                          required
                        />
                      </div>
                    </div>

                    <div className="flex justify-center items-center sm:gap-3 gap-3">
                      <div className="w-full font-body sm:text-base text-sm flex flex-col gap-0">
                        <label htmlFor="modelName" className={`text-secondary ${i18n.language==='ar'?'text-end':'text-start'}`}>
                          {t("Upper")}
                        </label>
                        <input
                          type="text"
                          id="modelName"
                          value={upper}
                          onChange={(e) => setUpper(e.target.value)}
                          placeholder={t("Enter Upper")}
                          className={`border w-full rounded-md border-secondary placeholder:text-secondary p-2 mb-3  ${i18n.language==='ar'?'text-end':'text-start'}`}
                          required
                        />
                      </div>
                      <div className="w-full font-body sm:text-base text-sm flex flex-col gap-0">
                        <label htmlFor="productType" className={`text-secondary ${i18n.language==='ar'?'text-end':'text-start'}`}>
                          {t("Sole")}
                        </label>
                        <input
                          type="text"
                          id="productType"
                          value={sole}
                          onChange={(e) => setSole(e.target.value)}
                          placeholder={t("Enter Sole")}
                          className={`border w-full rounded-md border-secondary placeholder:text-secondary p-2 mb-3  ${i18n.language==='ar'?'text-end':'text-start'}`}
                          required
                        />
                      </div>
                    </div>

                    <div className="w-full font-body sm:text-base text-sm flex flex-col gap-0">
                        <label htmlFor="serialNumber" className={`text-secondary ${i18n.language==='ar'?'text-end':'text-start'}`}>
                          {t("Width")}
                        </label>
                        <input
                          type="text"
                          id="serialNumber"
                          value={width}
                          onChange={(e) => setWidth(e.target.value)}
                          placeholder={t("Enter Width")}
                          className={`border w-full rounded-md border-secondary placeholder:text-secondary p-2 mb-3  ${i18n.language==='ar'?'text-end':'text-start'}`}
                          required
                        />
                      </div>

                    {/* Image Upload Section */}
                    <div className="w-full font-body sm:text-base text-sm flex flex-col gap-0 mb-3">
                      <label htmlFor="image" className={`text-secondary ${i18n.language==='ar'?'text-end':'text-start'}`}>
                        {t("Product Image")}
                      </label>
                      <div className="border-2 border-dashed border-secondary rounded-md p-4 text-center">
                        {!imagePreview && !existingImage ? (
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
                              src={imagePreview || existingImage}
                              alt="Preview"
                              className="max-h-40 mx-auto rounded-md"
                            />
                            <button
                              type="button"
                              onClick={handleRemoveImage}
                              className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
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
                            {!imagePreview && existingImage && (
                              <div className="mt-2">
                                <input
                                  type="file"
                                  id="imageChange"
                                  accept="image/*"
                                  onChange={handleImageChange}
                                  className="hidden"
                                />
                                <label
                                  htmlFor="imageChange"
                                  className="cursor-pointer text-secondary text-sm underline"
                                >
                                  {t("Change Image")}
                                </label>
                              </div>
                            )}
                          </div>
                        )}
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
                        {t("Update Changes")}
                      </Button>
                    </div>
                  </div>

                  <div className="sm:w-1/3 w-full flex flex-col justify-start items-center lg:mt-3 md:mt-3 gap-3">
                    <Barcode
                      value={barcode}
                      format="EAN13"
                      height={75}
                      width={1.5}
                      background="transparent"
                    />

                    {/* <QRCodeSVG value={`${barcode}, ${itemCode}, ${quantity}, ${description}, ${startSize}`} height={120} width={150} /> */}
                    <QRCodeSVG value={`${barcode}`} height={120} width={150} />
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

export default UpdateGTINPopUp;