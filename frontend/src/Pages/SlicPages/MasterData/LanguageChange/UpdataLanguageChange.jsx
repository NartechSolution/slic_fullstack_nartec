import React, { useState } from 'react'
import { toast } from 'react-toastify';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import SendIcon from '@mui/icons-material/Send';
import { useTranslation } from 'react-i18next';
import newRequest from '../../../../utils/userRequest';

const UpdataLanguageChange = ({ isVisible, setVisibility, refreshBrandData }) => {
    const updateBrandData = JSON.parse(sessionStorage.getItem("updatelanguageData"));
    const [loading, setLoading] = useState(false);
    const { t, i18n } = useTranslation();
    
    const handleCloseUpdatePopup = () => {
      setVisibility(false);
    };

    const [category_name_en, setcategory_name_en] = useState(updateBrandData?.key || '');
    const [category_name_ar, setcategory_name_ar] = useState(updateBrandData?.value || '');

    const handleUpdateBrand = async () => {
      setLoading(true);

      try {
        const response = await newRequest.put(`/language/translations_put/${updateBrandData?.id}`, {
          'value': category_name_ar,
        });

        toast.success(response?.data?.message || `${t('Word')} ${category_name_en}  ${t('has been')} ${t('Updated Successfully')}.`);
        refreshBrandData();
        handleCloseUpdatePopup();

      } catch (err) {
          toast.error(err?.response?.data?.error || err?.response?.data?.message || `${t('Something went wrong')}`);
          // console.log(error);
      }
      finally {
        setLoading(false);
      }
    };


    return (
      <div>
        {isVisible && (
          <div className="popup-overlay">
            <div className="popup-container h-auto sm:w-[45%] w-full">
              <div className="relative">
                <div className="fixed top-0 left-0 z-10 flex justify-between w-full px-3 bg-secondary">
                  <h2
                    className={`text-white font-sans font-semibold text-2xl ${
                      i18n.language === "ar" ? "text-end" : "text-start"
                    }`}
                  >
                    {t("Edit")}
                  </h2>
                  <div className="flex items-center space-x-3">
                    <button
                      className="text-white hover:text-red-600 focus:outline-none"
                        onClick={handleCloseUpdatePopup}
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
              <div className="popup-form w-full">
                <form className="w-full">
                  <div className="flex flex-col sm:gap-3 gap-3 mt-5">
                    <div className="w-full font-body sm:text-base text-sm flex flex-col gap-2">
                      <label
                        htmlFor="field1"
                        className={`text-secondary  ${
                          i18n.language === "ar" ? "text-end" : "text-start"
                        }`}
                      >
                        {t("Word[English]")}
                      </label>
                      <input
                        type="text"
                        id="category_name_en"
                        value={category_name_en}
                        onChange={(e) => setcategory_name_en(e.target.value)}
                        placeholder={`${t("Enter")} ${t("Word[English]")}`}
                        className={`border w-full rounded-sm border-[#8E9CAB] p-2 mb-3 ${
                          i18n.language === "ar" ? "text-end" : "text-start"
                        }`}
                      />
                    </div>

                    <div className="w-full font-body sm:text-base text-sm flex flex-col gap-2">
                      <label
                        htmlFor="field1"
                        className={`text-secondary  ${
                          i18n.language === "ar" ? "text-end" : "text-start"
                        }`}
                      >
                        {t("Word [Arabic]")}
                      </label>
                      <input
                        type="text"
                        id="category_name_ar"
                        value={category_name_ar}
                        onChange={(e) => setcategory_name_ar(e.target.value)}
                        placeholder={`${t("Enter")} ${t("Word[Arabic]")}`}
                        className={`border w-full rounded-sm border-[#8E9CAB] p-2 mb-3 ${
                          i18n.language === "ar" ? "text-end" : "text-start"
                        }`}
                      />
                    </div>
                  </div>

                  <div className="w-full flex justify-center items-center gap-8 mt-5">
                    <button
                      type="button"
                      className="px-5 py-2 w-[30%] rounded-sm bg-primary text-white font-body text-sm"
                      onClick={handleCloseUpdatePopup}
                    >
                      {t("Close")}
                    </button>

                    <Button
                      variant="contained"
                      style={{ backgroundColor: "#021F69", color: "#ffffff" }}
                      onClick={handleUpdateBrand}
                      disabled={loading}
                      className="w-[70%] ml-2"
                      endIcon={
                        loading ? (
                          <CircularProgress size={24} color="inherit" />
                        ) : (
                          <SendIcon />
                        )
                      }
                    >
                      {t("Update")}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    );
}

export default UpdataLanguageChange