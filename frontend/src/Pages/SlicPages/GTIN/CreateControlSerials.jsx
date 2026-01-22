import React, { useState } from "react";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import SearchIcon from "@mui/icons-material/Search";
import { useTranslation } from "react-i18next";
import CheckCircle from "@mui/icons-material/CheckCircle";
import newRequest from "../../../utils/userRequest";
import { toast } from "react-toastify";
import imageLiveUrl from "../../../utils/urlConverter/imageLiveUrl";

const CreateControlSerials = ({ isVisible, setVisibility, onContinue }) => {
  const { t, i18n } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    setVisibility(false);
    setSearchQuery("");
    setSearchResults([]);
    setSelectedItem(null);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const response = await newRequest.get(
        `/itemCodes/v1/itemCodes/search?search=${searchQuery}`
      );
      
      if (response?.data?.success) {
        setSearchResults(response.data.data);
        if (response.data.data.length === 0) {
          toast.info(t("No results found"));
        }
      } else {
        toast.error(response?.data?.message || t("Error searching items"));
        setSearchResults([]);
      }
    } catch (error) {
      toast.error(error?.response?.data?.error || t("Error searching items"));
      // console.error(error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  const handleContinue = () => {
    if (selectedItem) {
      onContinue(selectedItem);
      handleClose();
    }
  };

  return (
    <div>
      {isVisible && (
        <div className="popup-overlay z-50">
          <div className="popup-container h-auto sm:w-[50%] w-full flex flex-col" style={{ maxHeight: "90vh" }}>
            
            {/* Header */}
            <div className="flex justify-between w-full px-3 bg-secondary rounded-t-lg">
              <h2 className="text-white sm:text-lg text-base font-body font-semibold">
                {t("Create Control Serials")}
              </h2>
              <div className="flex items-center space-x-3">
                <button className="text-white hover:text-gray-300 focus:outline-none" onClick={handleClose}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 14H4"/>
                  </svg>
                </button>
                <button className="text-white hover:text-gray-300 focus:outline-none" onClick={handleClose}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4h16v16H4z"/>
                  </svg>
                </button>
                <button className="text-white hover:text-red-400 focus:outline-none" onClick={handleClose}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="w-full flex-1 overflow-y-auto px-4 py-4 bg-gray-50">
              <div className="flex items-end gap-3 mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <div className="flex-1">
                  <label className={`text-secondary font-semibold text-sm mb-1 block ${i18n.language==='ar'?'text-end':'text-start'}`}>
                    {t("Search Item Code")}
                  </label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={t("Enter Item Code")}
                    className={`border w-full rounded-md border-secondary p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all ${i18n.language==='ar'?'text-end':'text-start'}`}
                  />
                </div>
                <Button
                  variant="contained"
                  style={{ backgroundColor: "#021F69", color: "#ffffff", height: "45px" }}
                  onClick={handleSearch}
                  disabled={loading}
                  className="shadow-md hover:shadow-lg"
                >
                  {loading ? <CircularProgress size={24} color="inherit" /> : <SearchIcon />}
                </Button>
              </div>

              {searchResults.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {searchResults.map((item) => (
                    <div
                      key={item.id}
                      className={`relative rounded-lg p-3 cursor-pointer transition-all duration-200 group ${
                        selectedItem?.id === item.id
                          ? "bg-white ring-2 ring-secondary shadow-lg"
                          : "bg-white border border-gray-200 hover:border-secondary hover:shadow-md"
                      }`}
                      onClick={() => setSelectedItem(item)}
                    >
                      <div className="flex justify-between items-start gap-3">
                        {/* Product Image */}
                        <div className="flex-shrink-0">
                          {item.image ? (
                            <img 
                              src={imageLiveUrl(item.image)} 
                              alt={item.EnglishName || item.ItemCode}
                              className="w-24 h-24 object-cover rounded-lg border border-gray-200"
                            />
                          ) : (
                            <div className="w-24 h-24 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                             <div className="bg-blue-50 text-secondary px-2 py-0.5 rounded text-xs font-bold border border-blue-100">
                               {item.ItemCode}
                             </div>
                             {selectedItem?.id === item.id && (
                                <span className="bg-green-100 text-green-700 text-xs px-1.5 py-0.5 rounded-full font-medium flex items-center gap-1">
                                  <CheckCircle fontSize="inherit" /> {t("Selected")}
                                </span>
                             )}
                          </div>
                          
                          <div className="space-y-1.5 mb-2">
                            <div className="flex items-start gap-2 text-sm">
                              <span className="text-gray-500 min-w-[90px] text-xs">{t("English Name")}:</span>
                              <span className="font-medium text-gray-800 truncate">{item.EnglishName || '-'}</span>
                            </div>
                            <div className="flex items-start gap-2 text-sm">
                              <span className="text-gray-500 min-w-[90px] text-xs">{t("Arabic Name")}:</span>
                              <span className="font-medium text-gray-800 truncate">{item.ArabicName || '-'}</span>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pt-2 border-t border-gray-100">
                            <div className="flex flex-col">
                              <span className="text-gray-400 text-xs uppercase tracking-wide">{t("GTIN")}</span>
                              <span className="font-semibold text-gray-700 text-sm">{item.GTIN}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-gray-400 text-xs uppercase tracking-wide">{t("sole")}</span>
                              <span className="font-semibold text-gray-700 text-sm truncate">{item.sole || '-'}</span>
                            </div>
                            <div className="flex flex-col col-span-2">
                              <span className="text-gray-400 text-xs uppercase tracking-wide">{t("Upper")}</span>
                              <span className="font-semibold text-gray-700 text-sm truncate">{item.upper || '-'}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className={`flex-shrink-0 transition-colors ${
                             selectedItem?.id === item.id ? "text-secondary" : "text-gray-300 group-hover:text-secondary"
                        }`}>
                           {selectedItem?.id === item.id ? (
                               <CheckCircle style={{ fontSize: '28px', color: "#021F69" }} /> 
                           ) : (
                               <div className="w-6 h-6 rounded-full border-2 border-gray-300 group-hover:border-secondary"></div>
                           )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                searchResults.length === 0 && searchQuery && !loading && (
                    <div className="text-center py-12 text-gray-400">
                        <SearchIcon style={{ fontSize: 48, marginBottom: 8, opacity: 0.5 }} />
                        <p>{t("No results found")}</p>
                    </div>
                )
              )}
            </div>

            {/* Fixed Footer */}
            <div className="w-full p-4 bg-white border-t border-gray-200 rounded-b-lg flex justify-end gap-3 z-10">
               <Button
                 variant="contained"
                 style={{ backgroundColor: "#021F69", color: "#ffffff", paddingLeft: "30px", paddingRight: "30px" }}
                 onClick={handleContinue}
                 disabled={!selectedItem}
                 className="shadow-md"
               >
                 {t("Continue")}
               </Button>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateControlSerials;