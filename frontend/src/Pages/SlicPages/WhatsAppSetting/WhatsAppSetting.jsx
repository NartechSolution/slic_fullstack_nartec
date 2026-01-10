import React, { useEffect, useState, useRef } from "react";
import SideNav from "../../../components/Sidebar/SideNav";
import RightDashboardHeader from "../../../components/RightDashboardHeader/RightDashboardHeader";
import newRequest from "../../../utils/userRequest";
import { toast } from "react-toastify";
import { CircleLoader } from 'react-spinners';
import QRCodePopup from "../../../components/WhatsAppQRCode/QRCodePopup";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import { useTranslation } from "react-i18next";
import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";

const WhatsAppSetting = () => {
  const { t, i18n } = useTranslation();
  const [profilePicUrl, setProfilePicUrl] = useState(null);
  const [userName, setUserName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkSessionLoader, setCheckSessionLoader] = useState(false);
  const [logoutSessionLoader, setLogoutSessionLoader] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [sessionCorrupted, setSessionCorrupted] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [autoLogoutInProgress, setAutoLogoutInProgress] = useState(false);

  const [qrCode, setQrCode] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  
  const fetchAttempts = useRef(0);
  const MAX_FETCH_ATTEMPTS = 2;

  const fetchWhatsAppData = async (showLoader = true) => {
    if (showLoader) {
      setLoading(true);
    }
    setConnectionError(null);
    
    try {
      const res = await newRequest.get('whatsapp/getUserProfile');
      const userData = res.data.data;
      setUserName(userData?.name);
      setMobileNumber(userData?.number);
      setProfilePicUrl(userData?.profilePicUrl);
      setSessionCorrupted(false);
      setConnectionStatus('connected');
      fetchAttempts.current = 0;
      toast.success("WhatsApp connected successfully!");
    } catch (err) {
      console.log("WhatsApp fetch error:", err?.response?.data);
      
      const errorData = err?.response?.data;
      
      // If session is corrupted, immediately trigger auto logout
      if (errorData?.sessionCorrupted) {
        setSessionCorrupted(true);
        setConnectionStatus('disconnected');
        setConnectionError("Session corrupted. Auto-logging out...");
        
        // Auto logout and show fresh QR
        setTimeout(() => {
          handleAutoLogoutAndReconnect();
        }, 1000);
      } 
      // If initializing, wait briefly then retry
      else if (errorData?.isInitializing) {
        fetchAttempts.current++;
        
        if (fetchAttempts.current < MAX_FETCH_ATTEMPTS) {
          setConnectionStatus('initializing');
          setConnectionError("Initializing...");
          
          setTimeout(() => {
            fetchWhatsAppData(false);
          }, 3000);
        } else {
          // Max attempts reached, trigger auto logout
          setConnectionStatus('disconnected');
          setConnectionError("Initialization failed. Auto-logging out...");
          fetchAttempts.current = 0;
          
          setTimeout(() => {
            handleAutoLogoutAndReconnect();
          }, 1000);
        }
      }
      // Needs connection
      else if (errorData?.needsConnection) {
        setConnectionStatus('disconnected');
        setConnectionError("Not connected. Please connect.");
        fetchAttempts.current = 0;
      } 
      // Other errors
      else {
        setConnectionStatus('disconnected');
        setConnectionError(errorData?.error || "Failed to fetch profile");
        fetchAttempts.current = 0;
      }
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  };

  // Auto logout and show fresh QR code
  const handleAutoLogoutAndReconnect = async () => {
    if (autoLogoutInProgress) return;
    
    setAutoLogoutInProgress(true);
    setConnectionError("Auto-logging out and generating fresh QR code...");
    
    try {
      // Logout first
      await newRequest.post("/whatsapp/logoutWhatsApp");
      console.log("Auto logout successful");
      
      // Clear profile data
      setUserName('');
      setMobileNumber('');
      setProfilePicUrl(null);
      
      // Wait a moment then get fresh QR
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Now get fresh QR code with forceNew
      const response = await newRequest.get("/whatsapp/checkSession?forceNew=true");
      const data = response.data;
      
      if (data.status === "qr_required" && data.qrCode) {
        setQrCode(data.qrCode);
        setShowPopup(true);
        setSessionCorrupted(false);
        setConnectionError(null);
        toast.info("Please scan the QR code to reconnect");
      } else if (data.status === "success") {
        // Somehow already connected
        toast.success("Already connected!");
        setConnectionStatus('connected');
        fetchWhatsAppData(false);
      }
    } catch (error) {
      console.error("Auto logout error:", error);
      setConnectionError("Failed to auto-logout. Please try manually.");
      toast.error("Please logout and reconnect manually");
    } finally {
      setAutoLogoutInProgress(false);
    }
  };
  
  // Auto-fetch WhatsApp profile after component mounts
  useEffect(() => {
    setConnectionStatus('initializing');
    fetchAttempts.current = 0;
    
    const timeoutId = setTimeout(() => {
      fetchWhatsAppData();
    }, 2000); // Reduced from 3s to 2s

    return () => {
      clearTimeout(timeoutId);
    };
  }, []);

  // Connect to WhatsApp API
  const checkSession = async () => {
    setCheckSessionLoader(true);
    setConnectionError(null);
    setConnectionStatus('initializing');
    fetchAttempts.current = 0;
    
    try {
      const response = await newRequest.get("/whatsapp/checkSession");
      const data = response.data;
      
      if (data.status === "success") {
        toast.success("Connected to WhatsApp!");
        setSessionCorrupted(false);
        setConnectionStatus('connected');
        setTimeout(() => fetchWhatsAppData(false), 1500);
      } else if (data.status === "qr_required" && data.qrCode) {
        setQrCode(data.qrCode);
        setShowPopup(true);
        setSessionCorrupted(false);
        setConnectionStatus('disconnected');
        
        if (data.sessionCorrupted) {
          toast.info("Session expired. Scan QR to reconnect.");
        } else if (data.autoLoggedOut) {
          toast.info("Auto logged out. Scan QR to reconnect.");
        }
      } else if (data.status === "initializing") {
        setConnectionStatus('initializing');
        toast.info("Initializing...");
        
        // Wait and retry once
        setTimeout(() => {
          checkSession();
        }, 3000);
      } else if (data.status === "error") {
        setConnectionStatus('disconnected');
        setConnectionError(data.message || "Failed");
        toast.error(data.message || "Failed");
      }
    } catch (error) {
      console.error("Error checking session:", error);
      
      const errorData = error?.response?.data;
      
      if (errorData?.status === "error") {
        setConnectionStatus('disconnected');
        setConnectionError(errorData.error || "Failed to connect");
        toast.error(errorData.error || "Failed");
        
        if (errorData.sessionCorrupted) {
          setSessionCorrupted(true);
          // Trigger auto logout
          setTimeout(() => {
            handleAutoLogoutAndReconnect();
          }, 1000);
        }
      } else {
        setConnectionStatus('disconnected');
        setConnectionError("Failed to check session");
        toast.error("Failed to check session");
      }
    } finally {
      setCheckSessionLoader(false);
    }
  };

  // Manual logout
  const logOutSession = async () => {
    setLogoutSessionLoader(true);
    setConnectionError(null);
    fetchAttempts.current = 0;
    
    try {
      const response = await newRequest.post("/whatsapp/logoutWhatsApp");
      const data = response.data;
      toast.success(data.message || "Logged out successfully!");

      setUserName('');
      setMobileNumber('');
      setProfilePicUrl(null);
      setSessionCorrupted(false);
      setConnectionStatus('disconnected');
    } catch (err) {
      console.log("Error logging out:", err);
      toast.error(err?.response?.data?.message || "Failed to logout");
    } finally {
      setLogoutSessionLoader(false);
    }
  };

  const handleClosePopup = () => {
    setShowPopup(false);
    setConnectionError(null);
    setConnectionStatus('initializing');
    fetchAttempts.current = 0;

    toast.info("Connecting... Please wait");

    // Wait for initialization - reduced from 12s to 8s
    setTimeout(() => {
      fetchWhatsAppData(false);
    }, 8000);
  };

  // Get status color
  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'success';
      case 'initializing': return 'warning';
      case 'disconnected': return 'error';
      default: return 'default';
    }
  };

  // Get status label
  const getStatusLabel = () => {
    switch (connectionStatus) {
      case 'connected': return t('Connected');
      case 'initializing': return t('Initializing...');
      case 'disconnected': return t('Disconnected');
      default: return t('Unknown');
    }
  };

  return (
    <div>
      {(loading || autoLogoutInProgress) && (
        <div
          className="loading-spinner-background"
          style={{
            zIndex: 9999,
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(255, 255, 255, 0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            flexDirection: "column",
            gap: "10px"
          }}
        >
          <CircleLoader size={45} color={"#1D2F90"} loading={true} />
          {autoLogoutInProgress && (
            <p className="text-secondary font-semibold">Auto-logging out...</p>
          )}
        </div>
      )}
      
      <SideNav>
        <div>
          <RightDashboardHeader title={t("SLIC User WhatsApp Profile")} />
        </div>

        <section className="py-3 my-auto dark:bg-gray-900">
          <div className="lg:w-[80%] md:w-[90%] xs:w-[96%] mx-auto flex gap-4 mb-6">
            <div className="lg:w-[88%] md:w-[80%] sm:w-[88%] xs:w-full mx-auto shadow-2xl p-4 rounded-xl h-fit self-center dark:bg-gray-800/40">
              
              {/* Connection Status Badge */}
              <Box className="mb-4 flex justify-end">
                <Chip 
                  label={getStatusLabel()} 
                  color={getStatusColor()}
                  icon={connectionStatus === 'initializing' ? <CircularProgress size={16} color="inherit" /> : null}
                />
              </Box>

              {/* Error Alert */}
              {connectionError && !autoLogoutInProgress && (
                <Alert 
                  severity={sessionCorrupted ? "error" : "warning"} 
                  className="mb-4"
                  onClose={() => setConnectionError(null)}
                >
                  <AlertTitle>
                    {sessionCorrupted ? t("Session Corrupted") : t("Connection Issue")}
                  </AlertTitle>
                  {connectionError}
                </Alert>
              )}

              {/* Success Alert */}
              {connectionStatus === 'connected' && !connectionError && (
                <Alert severity="success" className="mb-4">
                  <AlertTitle>{t("Connected")}</AlertTitle>
                  {t("WhatsApp is connected and ready!")}
                </Alert>
              )}

              <div>
                <h1 className={`lg:text-3xl md:text-2xl sm:text-xl xs:text-xl font-sans font-semibold text-secondary mb-2 dark:text-white ${
                  i18n.language === "ar" ? "text-end" : "text-start"
                }`}>
                  {t("Profile")}
                </h1>
                
                <div>
                  <div className="relative mx-auto flex justify-center w-[221px] h-[221px]">
                    <img
                      className="w-full h-full bg-blue-300/20 rounded-full bg-cover bg-center bg-no-repeat object-cover"
                      src={profilePicUrl || "https://via.placeholder.com/221?text=No+Image"}
                      alt="slic"
                      onError={(e) => {
                        e.target.src = "https://via.placeholder.com/221?text=No+Image";
                      }}
                    />
                    <div 
                      className={`absolute bottom-2 right-2 w-8 h-8 rounded-full border-4 border-white ${
                        connectionStatus === 'connected' ? 'bg-green-500' :
                        connectionStatus === 'initializing' ? 'bg-yellow-500' :
                        'bg-gray-400'
                      }`}
                      style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}
                    />
                  </div>

                  <h2 className="text-center mt-1 font-semibold dark:text-gray-300">
                    {t("SLIC User Profile")}
                  </h2>
                  
                  <div className="flex lg:flex-row md:flex-col sm:flex-col xs:flex-col gap-2 justify-center w-full">
                    <div className={`w-full mb-4 mt-6 ${
                      i18n.language === "ar" ? "text-end" : "text-start"
                    }`}>
                      <label className={`mb-2 dark:text-gray-300 ${
                        i18n.language === "ar" ? "text-end" : "text-start"
                      }`}>
                        {t("SLIC User Name")}
                      </label>
                      <input
                        type="text"
                        value={userName}
                        className={`mt-2 p-2 w-full border rounded-lg border-secondary bg-gray-50 ${
                          i18n.language === "ar" ? "text-end" : "text-start"
                        }`}
                        placeholder={userName || t("Not connected")}
                        readOnly
                      />
                    </div>
                  </div>

                  <div className="flex lg:flex-row md:flex-col sm:flex-col xs:flex-col gap-2 justify-center w-full">
                    <div className={`w-full ${
                      i18n.language === "ar" ? "text-end" : "text-start"
                    }`}>
                      <label className={`mb-2 dark:text-gray-300 ${
                        i18n.language === "ar" ? "text-end" : "text-start"
                      }`}>
                        {t("Mobile Number")}
                      </label>
                      <input
                        type="text"
                        value={mobileNumber}
                        className={`mt-2 p-2 w-full border rounded-lg border-secondary bg-gray-50 ${
                          i18n.language === "ar" ? "text-end" : "text-start"
                        }`}
                        placeholder={mobileNumber || t("Not connected")}
                        readOnly
                      />
                    </div>
                  </div>

                  <div className="flex justify-between gap-3 mt-6 text-white text-lg font-semibold">
                    <Button
                      onClick={checkSession}
                      variant="contained"
                      style={{ backgroundColor: "#F35C08" }}
                      className="sm:w-[70%] w-full"
                      disabled={checkSessionLoader || connectionStatus === 'initializing' || autoLogoutInProgress}
                      endIcon={
                        checkSessionLoader ? (
                          <CircularProgress size={24} color="inherit" />
                        ) : null
                      }
                    >
                      {connectionStatus === 'connected' 
                        ? t("Reconnect") 
                        : t("WhatsApp Connection")
                      }
                    </Button>

                    <Button
                      onClick={logOutSession}
                      variant="contained"
                      style={{ backgroundColor: "#1d2f90" }}
                      className="sm:w-[70%] w-full"
                      disabled={logoutSessionLoader || connectionStatus === 'disconnected' || autoLogoutInProgress}
                      endIcon={
                        logoutSessionLoader ? (
                          <CircularProgress size={24} color="inherit" />
                        ) : null
                      }
                    >
                      {t("Log-out")}
                    </Button>
                  </div>

                  {/* Help Text */}
                  <div className={`mt-4 text-sm text-gray-600 dark:text-gray-400 ${
                    i18n.language === "ar" ? "text-end" : "text-start"
                  }`}>
                    {connectionStatus === 'disconnected' && !autoLogoutInProgress && (
                      <p>
                        💡 {t("Click 'WhatsApp Connection' to scan QR and connect.")}
                      </p>
                    )}
                    {connectionStatus === 'initializing' && (
                      <p>
                        ⏳ {t("Establishing connection...")}
                      </p>
                    )}
                    {connectionStatus === 'connected' && (
                      <p>
                        ✅ {t("WhatsApp is ready to send messages!")}
                      </p>
                    )}
                    {autoLogoutInProgress && (
                      <p>
                        🔄 {t("Auto-logging out and generating fresh QR code...")}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* WhatsApp QR Code PopUp */}
        {showPopup && (
          <QRCodePopup qrCode={qrCode} onClose={handleClosePopup} />
        )}
      </SideNav>
    </div>
  );
};

export default WhatsAppSetting;