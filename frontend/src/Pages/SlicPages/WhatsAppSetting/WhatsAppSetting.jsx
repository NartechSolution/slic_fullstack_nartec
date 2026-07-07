import React, { useEffect, useState } from "react";
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
  const [connectionStatus, setConnectionStatus] = useState('checking');

  const [qrCode, setQrCode] = useState(null);
  const [showPopup, setShowPopup] = useState(false);

  // Fetch WhatsApp profile
  const fetchWhatsAppData = async (showLoader = true) => {
    if (showLoader) setLoading(true);

    try {
      const res = await newRequest.get('whatsapp/getUserProfile');
      const userData = res.data.data;
      setUserName(userData?.name || '');
      setMobileNumber(userData?.number || '');
      setProfilePicUrl(userData?.profilePicUrl);
      setConnectionStatus('connected');
      if (showLoader) toast.success(t("WhatsApp connected!"));
    } catch (err) {
      console.log("WhatsApp not connected:", err?.response?.data?.message);
      setConnectionStatus('disconnected');
      setUserName('');
      setMobileNumber('');
      setProfilePicUrl(null);
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  // Check session on mount
  useEffect(() => {
    setConnectionStatus('checking');
    const timer = setTimeout(() => {
      fetchWhatsAppData(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  // Connect to WhatsApp
  const checkSession = async () => {
    setCheckSessionLoader(true);
    setConnectionStatus('checking');

    try {
      const response = await newRequest.get("/whatsapp/checkSession");
      const data = response.data;

      if (data.status === "success") {
        toast.success(t("Connected to WhatsApp!"));
        setConnectionStatus('connected');
        setTimeout(() => fetchWhatsAppData(false), 1000);
      } else if (data.status === "qr_required" && data.qrCode) {
        setQrCode(data.qrCode);
        setShowPopup(true);
        setConnectionStatus('disconnected');

        if (data.sessionExpired) {
          toast.info(t("Session expired. Scan QR to reconnect."));
        }
      } else if (data.status === "error" || data.needsRetry) {
        setConnectionStatus('disconnected');
        toast.error(data.message || t("Failed to connect"));
      }
    } catch (error) {
      console.error("Error checking session:", error);
      setConnectionStatus('disconnected');
      toast.error(error?.response?.data?.error || t("Failed to check session"));
    } finally {
      setCheckSessionLoader(false);
    }
  };

  // Logout
  const logOutSession = async () => {
    setLogoutSessionLoader(true);

    try {
      const response = await newRequest.post("/whatsapp/logoutWhatsApp");
      toast.success(response.data.message || t("Logged out successfully!"));
      setUserName('');
      setMobileNumber('');
      setProfilePicUrl(null);
      setConnectionStatus('disconnected');
    } catch (err) {
      console.log("Error logging out:", err);
      toast.error(err?.response?.data?.message || t("Failed to logout"));
    } finally {
      setLogoutSessionLoader(false);
    }
  };

  // Handle QR popup close
  const handleClosePopup = () => {
    setShowPopup(false);
    setConnectionStatus('checking');
    toast.info(t("Connecting... Please wait"));

    // Wait for connection then fetch profile
    setTimeout(() => {
      fetchWhatsAppData(false);
    }, 5000);
  };

  // Status helpers
  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'success';
      case 'checking': return 'warning';
      case 'disconnected': return 'error';
      default: return 'default';
    }
  };

  const getStatusLabel = () => {
    switch (connectionStatus) {
      case 'connected': return t('Connected');
      case 'checking': return t('Checking...');
      case 'disconnected': return t('Disconnected');
      default: return t('Unknown');
    }
  };

  return (
    <div>
      {loading && (
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
          }}
        >
          <CircleLoader size={45} color={"#1D2F90"} loading={true} />
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
                  icon={connectionStatus === 'checking' ? <CircularProgress size={16} color="inherit" /> : null}
                />
              </Box>

              {/* Status Alert */}
              {connectionStatus === 'connected' && (
                <Alert severity="success" className="mb-4">
                  <AlertTitle>{t("Connected")}</AlertTitle>
                  {t("WhatsApp is connected and ready!")}
                </Alert>
              )}

              {connectionStatus === 'disconnected' && (
                <Alert severity="info" className="mb-4">
                  <AlertTitle>{t("Not Connected")}</AlertTitle>
                  {t("Click 'WhatsApp Connection' to scan QR and connect.")}
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
                        connectionStatus === 'checking' ? 'bg-yellow-500' :
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
                      disabled={checkSessionLoader || connectionStatus === 'checking'}
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
                      disabled={logoutSessionLoader || connectionStatus === 'disconnected'}
                      endIcon={
                        logoutSessionLoader ? (
                          <CircularProgress size={24} color="inherit" />
                        ) : null
                      }
                    >
                      {t("Log-out")}
                    </Button>
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
