import React, { useEffect, useState } from "react";
import sliclogo from "../../../Images/slic-logo.png";
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import SendIcon from '@mui/icons-material/Send';
import { useNavigate } from "react-router-dom";
import newRequest from "../../../utils/userRequest";
import { toast } from "react-toastify";
import VerfiyEmailPopUp from "../ForgotPassword/VerfiyEmailPopUp";
import NewPasswordPopUp from "../ForgotPassword/NewPasswordPopUp";

const SlicUserLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();


  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await newRequest.post("/users/v1/login", {
        userLoginID: email,
        userPassword: password,
      });
        // console.log(response?.data);
        sessionStorage.setItem("slicUserData", JSON.stringify(response?.data));
        navigate("/gtin-management");
        toast.success(response?.data?.message || "Login Successful");
    } catch (error) {
      // console.log(error);
      toast.error(error?.response?.data?.error || error?.response?.data?.message || "Something went wrong!");
      setLoading(false);
    }
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [])


  const [isResetPasswordPopupVisible, setIsResetPasswordPopupVisible] = useState(false);
  const handleShowResetPasswordPopup = (value) => {
    setIsResetPasswordPopupVisible(true);
  };

  const [apiResponse, setApiResponse] = useState(null);
  const [emailForOtp, setEmailForOtp] = useState("");
  const [isOpenOtpPopupVisible, setIsOpenOtpPopupVisible] = useState(false);
  const handleShowOtpPopup = (response, email) => {
    setIsResetPasswordPopupVisible(false);
    setApiResponse(response);
    setEmailForOtp(email);
    setIsOpenOtpPopupVisible(true);
  };

  return (
    <div>
      <div className="flex justify-center items-center min-h-screen mt-10 mb-10">
        <div className="sm:h-[725px] h-auto w-[85%] flex flex-col justify-center items-center border-2 border-primary rounded-md shadow-xl">
          
          {/* image */}
          <div className="flex flex-col justify-center items-center px-2">
            <img
              src={sliclogo}
              alt=""
              className="w-full object-contain sm:h-52 h-auto rounded-md mt-3"
            />
            <h2 className="text-secondary sm:text-2xl text-xl font-semibold font-sans mb-3 mt-6">SLIC User Log in</h2>
          </div>

          <form onSubmit={handleSubmit} className="w-full flex justify-center items-center h-[45%] mt-6 sm:mt-0">
            {/* username */}
            <div className="w-full sm:w-[50%] sm:px-0 px-4 mb-6">
              <label
                htmlFor="email"
                className="sm:text-2xl text-secondary text-lg font-sans"
              >
                Email
              </label>
              <div className="flex flex-col gap-6">
                <input
                  id="email"
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your Email"
                  className="p-2 border rounded-md border-secondary text-lg"
                />
              </div>

              <div className="mt-6">
                <label
                  htmlFor="password"
                  className="sm:text-2xl text-secondary text-lg font-sans"
                >
                  Password
                </label>
                <div className="flex flex-col gap-6">
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="p-2 border border-secondary rounded-md text-lg"
                  />
                  <Button
                    variant="contained"
                    type="submit"
                    style={{ backgroundColor: '#1D2F90', color: '#ffffff', padding: '10px' }}
                    disabled={loading}
                    className="w-full bg-[#B6BAD6] border-b-2 border-[#350F9F] hover:bg-[#9699b1] mb-6 text-white font-medium font-body text-xl rounded-md px-5 py-2"
                    endIcon={loading ? <CircularProgress size={24} color="inherit" /> : <SendIcon />}
                  >
                    Log in
                  </Button>

                  {/* add forgot password on left side */}
                  <div className="flex justify-between items-end gap-6 text-secondary text-lg font-sans">
                    <span 
                      onClick={() => navigate("/slic-signup")}
                      className="hover:text-primary hover:cursor-pointer transition-colors duration-300 ease-in-out"
                    >
                      Create your Account
                    </span>
                    <span 
                      onClick={handleShowResetPasswordPopup}
                      className="hover:text-primary hover:cursor-pointer transition-colors duration-300 ease-in-out"
                    >
                      Forgot Password?
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>

        {isResetPasswordPopupVisible && (
          <VerfiyEmailPopUp 
            isVisible={isResetPasswordPopupVisible} 
             setVisibility={setIsResetPasswordPopupVisible}
               showOtpPopup={handleShowOtpPopup}
          />
        )}

        {isOpenOtpPopupVisible && (
          <NewPasswordPopUp 
            isVisible={isOpenOtpPopupVisible}
             setVisibility={setIsOpenOtpPopupVisible} 
              apiResponse={apiResponse}
               email={emailForOtp}
          />
        )}
      </div>
    </div>
  );
};

export default SlicUserLogin;
