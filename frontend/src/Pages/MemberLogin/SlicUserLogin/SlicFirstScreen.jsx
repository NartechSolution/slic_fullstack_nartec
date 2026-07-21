import React, { useContext, useEffect, useState } from "react";
import sliclogo from "../../../Images/sliclogo.png";
import warehouse from "../../../Images/warehouse.png";
import gtinmanagement from "../../../Images/gtinmanagement.png";
import supplychain from "../../../Images/supplychain.png";
import pointofsale from "../../../Images/pointofsale.png";
import { useNavigate } from "react-router-dom";
import newRequest from "../../../utils/userRequest";
import { toast } from "react-toastify";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import SendIcon from "@mui/icons-material/Send";
import SlicUserSignUpPopUp from "../SlicUserSignUp/SlicUserSignUpPopUp";
import { RolesContext } from '../../../Contexts/FetchRolesContext'
import ErpTeamRequest from "../../../utils/ErpTeamRequest";
import LanguageSwitcher from "../../../switer";
import { I18nextProvider, useTranslation } from "react-i18next";
import i18ns from "../../../i18n";

const SlicFirstScreen = () => {

  const { t, i18n } = useTranslation();
  const [companies, setCompanies] = useState([]);
  const [locations, setLocations] = useState([]);

  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      const response = await ErpTeamRequest.post(
        "/slicuat05api/v1/slicLogin",
        {
          apiKey:
            "b4d21674cd474705f6caa07d618b389ddc7ebc25a77a0dc591f49e9176beda01",
        },
        {
          headers: {
            "X-tenanttype": "live",
          },
        }
      );
      // console.log(response.data);
      sessionStorage.setItem(
        "slicLoginToken",
        JSON.stringify(response?.data?.token)
      );
    } catch (error) {
      // console.log(error);
    }
  };

  // map All the companies api response data
  const flattenCompanies = (data) => {
    return data.map((company) => {
      if (company.CompanyMaster) {
        return company.CompanyMaster;
      }
      return company;
    });
  };

  const getAllCompaniesDetails = async () => {
    try {
      const token = JSON.parse(sessionStorage.getItem("slicLoginToken"));
      const res = await ErpTeamRequest.post(
        "/slicuat05api/v1/getApi",
        {
          filter: {},
          M_COMP_CODE: "001",
          M_USER_ID: "SYSADMIN",
          APICODE: "CompanyMaster",
          M_LANG_CODE: "ENG",
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      // console.log(res.data);
      const flattenedData = flattenCompanies(res.data);
      setCompanies(flattenedData);
    } catch (error) {
      // console.log(error);
      toast.error(
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        "Something went wrong!"
      );
    }
  };

  // map All the location api response data
  const flattenLocations = (data) => {
    return data.map((location) => {
      if (location.LocationMaster) {
        return location.LocationMaster;
      }
      return location;
    });
  };

  const getAllLocationsDetails = async () => {
    try {
      const token = JSON.parse(sessionStorage.getItem("slicLoginToken"));
      const res = await ErpTeamRequest.post(
        "/slicuat05api/v1/getApi",
        {
          filter: {},
          M_COMP_CODE: "001",
          M_USER_ID: "SYSADMIN",
          APICODE: "LocationMaster",
          M_LANG_CODE: "ENG",
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      // console.log(res.data);
      const flattenedData = flattenLocations(res.data);
      setLocations(flattenedData);
    } catch (error) {
      // console.log(error);
      toast.error(
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        "Something went wrong!"
      );
    }
  };

  useEffect(() => {
    const initialize = async () => {
      await handleLogin();
      await getAllCompaniesDetails();
      await getAllLocationsDetails();
    };

    initialize();
  }, []);

  const [selectedCompany, setSelectedCompany] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);

  useEffect(() => {
    if (selectedCompany) {
      sessionStorage.setItem(
        "selectedCompany",
        JSON.stringify(selectedCompany)
      );
      // console.log(selectedCompany);
    }
  }, [selectedCompany]);

  const handleCompanyChange = (e) => {
    const selectedComp = companies.find(
      (company) => company.COMP_NAME === e.target.value
    );
    setSelectedCompany(selectedComp);
  };


  // useEffect(() => {
  //   if (selectedLocation) {
  //     sessionStorage.setItem(
  //       "selectedLocation",
  //       JSON.stringify(selectedLocation)
  //     );
  //     console.log(selectedLocation);
  //   }
  // }, [selectedLocation]);


  // const handleLocationChange = (e) => {
  //   const selectedLoc = locations.find(
  //     (location) => `${location.LOCN_CODE} - ${location.LOCN_NAME}` === e.target.value
  //   );
  //   setSelectedLocation(selectedLoc);
  // };

  const [selectedShowroom, setSelectedShowroom] = useState("");
  const [selectedStockLocation, setSelectedStockLocation] = useState("");
  const [stockLocations, setStockLocations] = useState([]);

  const handleShowroomChange = (e) => {
    const showroom = e.target.value;
    setSelectedShowroom(showroom);

    // Update stock locations based on showroom selection
    let locations = [];
    if (showroom === "Factory Showroom") {
      locations = ["FG203", "FG501", "FG502"];
    } else if (showroom === "Khobar Showroom") {
      locations = ["FG201", "FG504"];
    } else if (showroom === "Jubail Showroom") {
      locations = ["FG202", "FG505"];
    } else if (showroom === "Riyadh Showroom") {
      locations = ["FG206"];
    }

    setStockLocations(locations);
    setSelectedStockLocation("");
  };

  const handleStockLocationChange = (e) => {
    const stockLocation = e.target.value;
    setSelectedStockLocation(stockLocation);

    // Save the selected stock location and showroom in selectedLocation state
    setSelectedLocation({ stockLocation, showroom: selectedShowroom });
  };

  useEffect(() => {
    if (selectedLocation) {
      sessionStorage.setItem(
        "selectedLocation",
        JSON.stringify(selectedLocation)
      );
      // console.log("Selected Location saved to session:", selectedLocation);
    }
  }, [selectedLocation]);

  // login states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { fetchRoles, userRoles } = useContext(RolesContext);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await newRequest.post("/users/v1/login", {
        userLoginID: email,
        userPassword: password,
      });
      const adminData = response?.data;

      // console.log(adminData);

      sessionStorage.setItem('slicUserData', JSON.stringify(adminData));
      // fetchRoles(adminData.data?.user?.UserLoginID);

      await fetchRoles(adminData.data?.user?.UserLoginID);
      navigate("/gtin-management");
      toast.success(response?.data?.message || "Login Successful");
      setLoading(false);
    } catch (error) {
      // console.log(error);
      toast.error(error?.response?.data?.message || error?.response?.data?.error || "Something went wrong!");
      setLoading(false);
    }
  };


  const [isResetPasswordPopupVisible, setIsResetPasswordPopupVisible] = useState(false);
  const handleShowResetPasswordPopup = (value) => {
    setIsResetPasswordPopupVisible(true);
  };

  return (
    <div>
      <div
        className={`px-3 py-3 bg-secondary shadow font-semibold font-sans rounded-sm text-gray-100 lg:px-5 flex justify-between ${i18n.language === "ar" ? "flex-row-reverse" : "flex-row"
          }`}
      >
        <p className="my-auto">
          {t("SLIC - Saudi Leather Industries Company")}
        </p>
        <I18nextProvider i18n={i18ns}>
          <LanguageSwitcher />
        </I18nextProvider>
      </div>
      <div className={`flex justify-center items-center h-auto mt-6 mb-6 `}>
        <div
          className={`3xl:h-[775px] 2xl:h-[775px] lg:h-[775px] h-auto w-[95%] pb-3 bg-[#e7f4f3] flex flex-col justify-start items-start border-2 border-primary rounded-md shadow-xl`}
        >
          <div
            className={`flex flex-col items-center justify-between w-full sm:p-10 p-3 ${i18n.language === "ar" ? "sm:flex-row-reverse" : "sm:flex-row"
              }`}
          >
            <div
              className={`flex flex-col  space-y-4 w-full ${i18n.language === "ar" ? "items-end" : "items-start"
                }`}
            >
              <img src={sliclogo} alt="SLIC Logo" className="h-32 mb-4" />
              <div
                className={`w-full ${i18n.language === "ar" ? "text-end" : "text-start"
                  }`}
              >
                <label
                  className="block text-gray-700 text-sm font-bold mb-2"
                  htmlFor="company"
                >
                  {t("Select Company")}
                </label>
                <select
                  id="company"
                  onChange={handleCompanyChange}
                  className="block w-full bg-white border border-gray-300 hover:border-gray-500 px-4 py-2 pr-8 rounded leading-tight focus:outline-none focus:shadow-outline"
                >
                  <option value="" disabled>
                    {t("Select Company")}
                  </option>
                  {companies.map((company) => (
                    <option>{company.COMP_NAME}</option>
                  ))}
                </select>
              </div>
              <div
                className={`w-full ${i18n.language === "ar" ? "text-end" : "text-start"
                  }`}
              >
                <label
                  className="block text-gray-700 text-sm font-bold mb-2"
                  htmlFor="locations"
                >
                  {t("Select Showroom")}
                </label>
                <select
                  id="locations"
                  value={selectedShowroom}
                  onChange={handleShowroomChange}
                  className="block w-full bg-white border border-gray-300 hover:border-gray-500 px-4 py-2 pr-8 rounded leading-tight focus:outline-none focus:shadow-outline"
                >
                  <option value="" disabled>
                    {t("Select Showroom")}
                  </option>
                  <option value="Factory Showroom">Factory Showroom</option>
                  <option value="Khobar Showroom">Khobar Showroom</option>
                  <option value="Jubail Showroom">Jubail Showroom</option>
                  <option value="Riyadh Showroom">Riyadh Showroom</option>
                  {/* {locations.map((location) => (
                    <option>{location?.LOCN_CODE} - {location?.LOCN_NAME}</option>
                  ))} */}
                </select>
              </div>
            </div>
            <div className="sm:ml-0 flex justify-center items-end h-full">
              <img
                src={warehouse}
                alt="Warehouse"
                className="h-auto w-full sm:mb-20 object-contain"
              />
            </div>

            {/* Login Form */}
            <form
              onSubmit={handleSubmit}
              className="sm:w-[90%] w-full flex flex-col justify-center items-center sm:p-4 bg-white h-[100%] mt-6 sm:mt-0"
            >
              <h2 className="text-secondary sm:text-2xl text-xl font-semibold font-sans mb-3">
                {t("SLIC User Log in")}
              </h2>

              {/* Email */}
              <div
                className={`w-full sm:px-0 px-4 mb-6 ${i18n.language === "ar" ? "text-end" : "text-start"
                  }`}
              >
                <label
                  htmlFor="email"
                  className="sm:text-2xl text-secondary text-lg font-sans"
                >
                  {t("Email")}
                </label>
                <div className="flex flex-col gap-2">
                  <input
                    id="email"
                    type="text"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t("Enter your Email")}
                    className={`p-2 border rounded-md border-secondary text-lg ${i18n.language === "ar" ? "text-end" : "text-start"
                      }`}
                  />
                </div>
              </div>

              {/* Password */}
              <div
                className={`w-full sm:px-0 px-4 mb-6 ${i18n.language === "ar" ? "text-end" : "text-start"
                  }`}
              >
                <label
                  htmlFor="password"
                  className="sm:text-2xl text-secondary text-lg font-sans"
                >
                  {t("Password")}
                </label>
                <div className="flex flex-col gap-2">
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t("Enter your password")}
                    className={`p-2 border rounded-md border-secondary text-lg ${i18n.language === "ar" ? "text-end" : "text-start"
                      }`}
                  />
                </div>
              </div>

              {/* Stock Location */}
              <div
                className={`w-full sm:px-0 px-4 mb-6 ${i18n.language === "ar" ? "text-end" : "text-start"
                  }`}
              >
                <label
                  htmlFor="stocklocation"
                  className={`sm:text-2xl text-secondary text-lg font-sans ${i18n.language === "ar" ? "text-end" : "text-start"
                    }`}
                >
                  {t("Stock Location")}
                </label>
                <div className="flex flex-col gap-2">
                  <select
                    id="stocklocation"
                    required
                    value={selectedStockLocation}
                    onChange={handleStockLocationChange}
                    className={`p-2 border rounded-md border-secondary text-lg ${i18n.language === "ar" ? "text-end" : "text-start"
                      }`}
                    disabled={!selectedShowroom}
                  >
                    <option value="" disabled selected>
                      {selectedShowroom
                        ? `${t("Select Stock Location")}`
                        : `${t("Select Showroom First")}`}
                    </option>
                    {stockLocations.map((location, index) => (
                      <option key={index} value={location}>
                        {location}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Submit Button */}
              <div className="w-full sm:px-0 px-4 mb-6">
                <Button
                  variant="contained"
                  type="submit"
                  style={{
                    backgroundColor: "#1D2F90",
                    color: "#ffffff",
                    padding: "10px",
                  }}
                  disabled={loading}
                  className="w-full bg-[#B6BAD6] border-b-2 border-[#350F9F] hover:bg-[#9699b1] mb-6 text-white font-medium font-body text-xl rounded-md px-5 py-2"
                  endIcon={
                    loading ? (
                      <CircularProgress size={24} color="inherit" />
                    ) : (
                      <SendIcon />
                    )
                  }
                >
                  {t("Log in")}
                </Button>
              </div>

              {/* Create Account Link */}
              <div
                className={`w-full sm:px-0 px-4 text-secondary text-lg font-sans ${i18n.language === "ar" ? "text-end" : "text-start"
                  }`}
              >
                <span
                  onClick={handleShowResetPasswordPopup}
                  className="hover:text-primary hover:cursor-pointer transition-colors duration-300 ease-in-out"
                >
                  {t("Create your Account")}
                </span>
              </div>
            </form>
          </div>

          {/* Last Cards */}
          <div className="grid 3xl:grid-cols-3 2xl:grid-cols-3 xl:grid-cols-3 lg:grid-cols-3 md:grid-cols-2 grid-cols-1 sm:gap-6 gap-4 sm:px-6 px-2 mt-6">
            <div
              // onClick={() => navigate("/user-login")}
              className={`h-auto w-full flex justify-center items-center bg-white border-[2px] rounded-lg shadow-lg px-2 py-4 shadow-[#B4B2AE] cursor-pointer transition-transform transform hover:scale-90 ${i18n.language === "ar" ? "flex-row-reverse" : "flex-row"
                }`}
            >
              <div className={`h-auto w-[35%] flex ${i18n.language === 'ar' ? 'justify-end' : 'justify-start'}`}>
                <img
                  src={gtinmanagement}
                  className="h-auto w-auto object-contain"
                  alt=""
                />
              </div>
              <div className={`h-auto w-[65%] flex flex-col gap-1 px-2 ${i18n.language === 'ar' ? 'text-end' : 'text-start'}`}>
                <h2 className="text-xl font-semibold text-secondary font-sans">
                  {t("GTIN Management")}
                </h2>
                <p className="text-sm font-light text-black font-sans">
                  {t(
                    "Manage GTINs to ensure product identification and data accuracy. View barcode ,print and creation,"
                  )}
                </p>
              </div>
            </div>

            <div
              // onClick={() => navigate("/user-login")}
              className={`h-auto w-full flex justify-center items-center bg-white border-[2px] rounded-lg shadow-lg px-2 py-4 shadow-[#B4B2AE] cursor-pointer transition-transform transform hover:scale-90 ${i18n.language === "ar" ? "flex-row-reverse" : "flex-row"
                }`}
            >
              <div className={`h-auto w-[35%] flex ${i18n.language === 'ar' ? 'justify-end' : 'justify-start'}`}>
                <img
                  src={supplychain}
                  className="h-auto w-auto object-contain"
                  alt=""
                />
              </div>
              <div className={`h-auto w-[65%] flex flex-col gap-1 px-2 ${i18n.language === 'ar' ? 'text-end' : 'text-start'}`}>
                <h2 className="text-xl font-semibold text-secondary font-sans">
                  {t("Supply Chain Application")}
                </h2>
                <p className="text-sm font-light text-black font-sans">
                  {t(
                    "Optimize your supply chain with advanced applications for efficiency and transparency."
                  )}
                </p>
              </div>
            </div>

            <div
              // onClick={() => navigate("/user-login")}
              className={`h-auto w-full flex justify-center items-center bg-white border-[2px] rounded-lg shadow-lg px-2 py-4 shadow-[#B4B2AE] cursor-pointer transition-transform transform hover:scale-90 ${i18n.language === 'ar' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div className={`h-auto w-[35%] flex ${i18n.language === 'ar' ? 'justify-end' : 'justify-start'}`}>
                <img
                  src={pointofsale}
                  className="h-auto w-auto object-contain"
                  alt=""
                />
              </div>
              <div className={`h-auto w-[65%] flex flex-col gap-1 px-2 ${i18n.language === 'ar' ? 'text-end' : 'text-start'}`}>
                <h2 className="text-xl font-semibold text-secondary font-sans">
                  {t("Point of Sale System")}
                </h2>
                <p className="text-sm font-light text-black font-sans">
                  {t(
                    "Efficiently manage sales, inventory, and customer data with a robust Point of Sale System."
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isResetPasswordPopupVisible && (
        <SlicUserSignUpPopUp
          isVisible={isResetPasswordPopupVisible}
          setVisibility={setIsResetPasswordPopupVisible}
        />
      )}
    </div>
  );
};

export default SlicFirstScreen;
