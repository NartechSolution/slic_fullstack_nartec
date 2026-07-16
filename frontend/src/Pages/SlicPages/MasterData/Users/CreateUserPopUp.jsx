import React, { useState } from "react";
import { toast } from "react-toastify";
import newRequest from "../../../../utils/userRequest";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import SendIcon from "@mui/icons-material/Send";
import { useTranslation } from "react-i18next";

const CreateUserPopUp = ({ isVisible, setVisibility, refreshGTINData }) => {
  const { t, i18n } = useTranslation();
  const [userLoginID, setUserLoginID] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const memberDataString = sessionStorage.getItem("slicUserData");
  const memberData = JSON.parse(memberDataString);

  const handleCloseCreatePopup = () => {
    setVisibility(false);
  };

  const handleAddUser = async (e) => {
    e.preventDefault();

    if (password.length < 8) {
      toast.error(t("Password must be at least 8 characters long"));
      return;
    }

    setLoading(true);
    try {
      const requestBody = {
        userLoginID: userLoginID,
        userPassword: password,
      };

      const response = await newRequest.post(`/users/v1/signup`, requestBody, {
        headers: {
          Authorization: `Bearer ${memberData?.data?.token}`,
        },
      });
      toast.success(response?.data?.message || "User created successfully");
      setLoading(false);
      handleCloseCreatePopup();
      refreshGTINData();
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          "Error in adding User"
      );
      console.log(error);
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
                    {t("Add User")}
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
              <form onSubmit={handleAddUser} className="w-full overflow-y-auto">
                <div className="flex justify-between items-center flex-col sm:flex-row sm:gap-3 gap-3 mt-5">
                  <div className="w-full lg:mt-0 md:mt-3 mt-6">
                    <div className="flex justify-center items-center sm:gap-3 gap-3">
                      <div className="w-full font-body sm:text-base text-sm flex flex-col gap-0">
                        <label
                          htmlFor="userLoginID"
                          className={`text-secondary ${
                            i18n.language === "ar" ? "text-end" : "text-start"
                          }`}
                        >
                          {t("User Login ID")}
                        </label>
                        <input
                          type="text"
                          id="userLoginID"
                          value={userLoginID}
                          onChange={(e) => setUserLoginID(e.target.value)}
                          placeholder={t("User Login ID")}
                          className={`border w-full rounded-md border-secondary placeholder:text-secondary p-2 mb-3  ${
                            i18n.language === "ar" ? "text-end" : "text-start"
                          }`}
                          required
                        />
                      </div>
                    </div>

                    <div className="flex justify-center items-center sm:gap-3 gap-3">
                      <div className="w-full font-body sm:text-base text-sm flex flex-col gap-0">
                        <label
                          htmlFor="password"
                          className={`text-secondary ${
                            i18n.language === "ar" ? "text-end" : "text-start"
                          }`}
                        >
                          {t("Password")}
                        </label>
                        <input
                          type="text"
                          id="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder={t("Enter Password")}
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
                        {t("Add User")}
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

export default CreateUserPopUp;
