import React, { useState } from "react";
import SideNav from "../../../components/Sidebar/SideNav";
import RightDashboardHeader from "../../../components/RightDashboardHeader/RightDashboardHeader";
import sliclogo from "../../../Images/slic-logo.png"
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import { useTranslation } from "react-i18next";

const UserProfile = () => {
  const { t, i18n } = useTranslation();
  const [selectedImage, setSelectedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  
  return (
    <div>
      <SideNav>
        <div>
          <RightDashboardHeader title={t("User Profile")} />
        </div>

        <div className="h-auto w-full">
          <div className="h-auto w-full p-4 bg-white shadow-xl rounded-md pb-10">
            <div className={`flex justify-between items-center flex-wrap gap-5 mb-6 ${i18n.language === "ar" ? "flex-row-reverse" : ""}`}>
              {/* Image container */}
              <div className="flex justify-center items-center gap-7 flex-wrap mb-4">
                <div className="border-2 border-secondary h-56 w-56 relative flex justify-center">
                  {sliclogo && (
                    <div className="h-56 flex justify-center items-center object-contain w-auto">
                      <img
                        src={sliclogo}
                        className="h-56 w-56 object-contain"
                        alt="Selected Image"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:space-x-40 sm:flex-row sm:justify-between">
              <div
                className={`font-sans sm:text-base text-sm text-secondary flex flex-col gap-2 w-full ${i18n.language === "ar" ? "text-end" : "text-start"}`}
              >
                <label htmlFor="username">{t("Users Name")}</label>
                <input
                  id="username"
                  type="text"
                 className={`border border-secondary rounded-md p-2 mb-3 ${i18n.language === "ar" ? "text-end" : "text-start"}`}
                  
                />
              </div>

              <div
                 className={`font-sans sm:text-base text-sm text-secondary flex flex-col gap-2 w-full ${i18n.language === "ar" ? "text-end" : "text-start"}`}
              >
                <label htmlFor="email">{t("Email")}</label>
                <input
                  id="email"
                  type="email"
                 className={`border border-secondary rounded-md p-2 mb-3 ${i18n.language === "ar" ? "text-end" : "text-start"}`}
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:space-x-40 sm:flex-row sm:justify-between sm:mt-6 mt-3">
              <div
                 className={`font-sans sm:text-base text-sm text-secondary flex flex-col gap-2 w-full ${i18n.language === "ar" ? "text-end" : "text-start"}`}
              >
                <label htmlFor="position">{t("Position")}</label>
                <input
                  id="position"
                  type="text"
                 className={`border border-secondary rounded-md p-2 mb-3 ${i18n.language === "ar" ? "text-end" : "text-start"}`}
                />
              </div>

              <div
                 className={`font-sans sm:text-base text-sm text-secondary flex flex-col gap-2 w-full ${i18n.language === "ar" ? "text-end" : "text-start"}`}
              >
                <label htmlFor="mobilenumber">{t("Mobile Number")}</label>
                <input
                  id="mobilenumber"
                  type="number"
                 className={`border border-secondary rounded-md p-2 mb-3 ${i18n.language === "ar" ? "text-end" : "text-start"}`}
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:space-x-40 sm:flex-row sm:justify-between sm:mt-6 mt-3">
              <div
                 className={`font-sans sm:text-base text-sm text-secondary flex flex-col gap-2 w-full ${i18n.language === "ar" ? "text-end" : "text-start"}`}
              >
                <label htmlFor="employeid">{t('Employee ID')}</label>
                <input
                  id="employeid"
                  type="text"
                 className={`border border-secondary rounded-md p-2 mb-3 ${i18n.language === "ar" ? "text-end" : "text-start"}`}
                />
              </div>

              <div
                className={`font-sans sm:text-base text-sm flex flex-col justify-center items-center gap-2 w-full mt-6`}
              >
                <Button
                  variant="contained"
                  style={{ backgroundColor: "#021F69", color: "#ffffff" }}
                  type="submit"
                  // disabled={loading}
                  className="sm:w-[50%] w-full ml-2"
                  endIcon={
                    loading ? (
                      <CircularProgress size={24} color="inherit" />
                    ) : null
                  }
                >
                  {t("Update Profile")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </SideNav>
    </div>
  );
};

export default UserProfile;
