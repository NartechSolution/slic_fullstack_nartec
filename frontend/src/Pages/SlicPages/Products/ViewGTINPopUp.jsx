import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import "./AddGTIN.css";
import Barcode from "react-barcode";
import { QRCodeSVG } from "qrcode.react";
import ErpTeamRequest from "../../../utils/ErpTeamRequest";
import { useTranslation } from "react-i18next";

const ViewGTINPopUp = ({ isVisible, setVisibility }) => {
  const { t, i18n } = useTranslation();
  const [barcode, setBarcode] = useState("");
  const [itemCode, setItemCode] = useState("");
  const [quantity, setQuantiity] = useState("");
  const [description, setDescription] = useState("");
  const [startSize, setStartSize] = useState("");
  const [productSize, setProductSize] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [endSize, setEndSize] = useState("");
  const [loading, setLoading] = useState(false);
  const memberDataString = sessionStorage.getItem('slicUserData');
  const memberData = JSON.parse(memberDataString);
  // console.log(memberData)
  
  const handleCloseCreatePopup = () => {
    setVisibility(false);
  };

  // get this session data
  const updateProductsData = JSON.parse(sessionStorage.getItem("viewGtinBarcodesData"));
  const token = JSON.parse(sessionStorage.getItem("slicLoginToken"));
  // console.log(updateProductsData);

  useEffect(() => {
    setItemCode(updateProductsData?.ItemCode || "");
    setQuantiity(updateProductsData?.ItemQty || "");
    setDescription(updateProductsData?.EnglishName || "");
    setProductSize(updateProductsData?.ProductSize || "");
    setEndSize(updateProductsData?.EndSize || "");
    setBarcode(updateProductsData?.GTIN || "");


    // Call the API to fetch the price when the component loads
    if (updateProductsData) {
        handleGetAllPrices();
      }
  }, []);


  const handleGetAllPrices = async () => {
    try {
        // call the second api later in their
        const secondApiBody = {
            "filter": {
              "P_COMP_CODE": "SLIC",
              "P_ITEM_CODE": itemCode,
              "P_CUST_CODE": "CL100948",
                "P_GRADE_CODE_1": productSize
            },
            "M_COMP_CODE": "SLIC",
            "M_USER_ID":"SYSADMIN",
            "APICODE": "PRICELIST",
            "M_LANG_CODE": "ENG"
  
          };
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
            // console.log(secondApiData)

            const itemRates = secondApiData.map(item => item?.PRICELIST?.PLI_RATE);
            setItemPrice(itemRates);
            console.log(itemRates)
          
      } catch (error) {
        toast.error("Failed to fetch product prices!");
      }
  }

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
                    {t("View Products Barcodes")}
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
              {/* <form onSubmit={handleAddGTIN} className="w-full overflow-y-auto"> */}
              <div className="w-full overflow-y-auto">
                <div className={`flex justify-between items-center flex-col  sm:gap-3 gap-3 mt-5 ${
                            i18n.language === "ar" ? "sm:flex-row-reverse" : "sm:flex-row"
                          }`}>
                  <div className="w-full lg:mt-0 md:mt-3 mt-6">
                    <div className="flex justify-center items-center sm:gap-3 gap-3">
                      <div className="w-full font-body sm:text-base text-sm flex flex-col gap-0">
                        <label
                          htmlFor="englishName"
                          className={`text-secondary ${
                            i18n.language === "ar" ? "text-end" : "text-start"
                          }`}
                        >
                          {t("Description")}
                        </label>
                        <textarea
                          type="text"
                          id="englishName"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder={t("Enter Description")}
                          className={`border w-full rounded-md border-secondary placeholder:text-secondary p-2 mb-3  ${
                            i18n.language === "ar" ? "text-end" : "text-start"
                          }`}
                          required
                        />
                      </div>
                    </div>

                    <div className={`flex justify-center items-center sm:gap-3 gap-3 `}>
                      <div className="w-full font-body sm:text-base text-sm flex flex-col gap-0">
                        <p>
                          {t("Price")}:{" "}
                          <span className="font-sans font-bold">
                            {itemPrice}
                          </span>
                        </p>
                        <p>
                          {t("Available Stock")}:{" "}
                          <span className="font-sans font-bold">
                            {quantity}
                          </span>
                        </p>
                      </div>
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

                    <QRCodeSVG
                      value={`${barcode}`}
                      height={120}
                      width={150}
                    />
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

export default ViewGTINPopUp;
