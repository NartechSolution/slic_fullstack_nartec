import React, { useState } from "react";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import SearchIcon from "@mui/icons-material/Search";
import { useTranslation } from "react-i18next";
import CheckCircle from "@mui/icons-material/CheckCircle";

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

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    // Dummy search logic as requested
    setTimeout(() => {
        // Mock result
        const dummyData = [
            {
                 id: 1,
                 itemCode: searchQuery,
                 description: "Sample Product Description",
                 quantity: 100,
                 brand: "Nike",
                 category: "Shoes"
            },
            {
                 id: 2,
                 itemCode: searchQuery,
                 description: "Sample Product Description",
                 quantity: 100,
                 brand: "Nike",
                 category: "Shoes"
            },
            {
                 id: 3,
                 itemCode: searchQuery,
                 description: "Sample Product Description",
                 quantity: 100,
                 brand: "Nike",
                 category: "Shoes"
            }
        ];
        setSearchResults(dummyData);
        setLoading(false);
    }, 1000);
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
              <form onSubmit={handleSearch} className="flex items-end gap-3 mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <div className="flex-1">
                  <label className={`text-secondary font-semibold text-sm mb-1 block ${i18n.language==='ar'?'text-end':'text-start'}`}>
                    {t("Search Item Code")}
                  </label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t("Enter Item Code")}
                    className={`border w-full rounded-md border-secondary p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all ${i18n.language==='ar'?'text-end':'text-start'}`}
                  />
                </div>
                <Button
                  variant="contained"
                  style={{ backgroundColor: "#021F69", color: "#ffffff", height: "45px" }}
                  type="submit"
                  disabled={loading}
                  className="shadow-md hover:shadow-lg"
                >
                  {loading ? <CircularProgress size={24} color="inherit" /> : <SearchIcon />}
                </Button>
              </form>

              {searchResults.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {searchResults.map((item) => (
                    <div
                      key={item.id}
                      className={`relative rounded-xl p-4 cursor-pointer transition-all duration-200 group ${
                        selectedItem?.id === item.id
                          ? "bg-white ring-2 ring-secondary shadow-lg scale-[1.01]"
                          : "bg-white border border-gray-200 hover:border-secondary hover:shadow-md"
                      }`}
                      onClick={() => setSelectedItem(item)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                             <div className="bg-blue-50 text-secondary px-3 py-1 rounded-md text-sm font-bold border border-blue-100">
                               {item.itemCode}
                             </div>
                             {selectedItem?.id === item.id && (
                                <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                                  <CheckCircle fontSize="inherit" /> {t("Selected")}
                                </span>
                             )}
                          </div>
                          
                          <h3 className="font-semibold text-gray-800 text-lg mb-1 group-hover:text-secondary transition-colors">
                            {item.description}
                          </h3>
                          
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-2 gap-x-6 mt-4 text-sm text-gray-600">
                            <div className="flex flex-col">
                              <span className="text-gray-400 text-xs uppercase tracking-wider">{t("Brand")}</span>
                              <span className="font-medium">{item.brand}</span>
                            </div>
                            <div className="flex flex-col">
                               <span className="text-gray-400 text-xs uppercase tracking-wider">{t("Category")}</span>
                               <span className="font-medium">{item.category}</span>
                            </div>
                             <div className="flex flex-col">
                               <span className="text-gray-400 text-xs uppercase tracking-wider">{t("Quantity")}</span>
                               <span className="font-medium">{item.quantity}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className={`ml-4 mt-1 rounded-full p-1 transition-colors ${
                             selectedItem?.id === item.id ? "text-secondary" : "text-gray-300 group-hover:text-secondary"
                        }`}>
                           {selectedItem?.id === item.id ? (
                               <CheckCircle fontSize="large" style={{ color: "#021F69" }} /> 
                           ) : (
                               <div className="w-7 h-7 rounded-full border-2 border-gray-300 group-hover:border-secondary"></div>
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
