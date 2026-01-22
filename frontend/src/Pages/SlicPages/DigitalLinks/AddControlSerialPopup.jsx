import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import newRequest from "../../../utils/userRequest";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import SendIcon from "@mui/icons-material/Send";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import { Autocomplete, TextField, IconButton } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "react-query";
import { useNavigate } from "react-router-dom";

const AddControlSerialPopup = ({ isVisible, setVisibility, refreshData, itemCode }) => {
  const { t, i18n } = useTranslation();
  const [poNumber, setPoNumber] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [supplierData, setSupplierData] = useState([]);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Array to store multiple qty-size pairs
  const [sizeQuantities, setSizeQuantities] = useState([
    { id: 1, size: "", qty: 10 }
  ]);

  // Generate size options from 31 to 49
  const sizeOptions = Array.from({ length: 19 }, (_, i) => ({
    label: `${31 + i}`,
    value: `${31 + i}`
  }));

  const handleClosePopup = () => {
    setVisibility(false);
    setPoNumber("");
    setSelectedSupplier(null);
    setSizeQuantities([{ id: 1, size: "", qty: 10 }]);
  };

  const fetchAllSupplierData = async () => {
    setIsLoading(true);
    try {
      const response = await newRequest.get(
        '/suppliers/v1?page=1&limit=100&status=approved'
      );
      
      const mappedData = response.data.data.suppliers.map(supplier => ({
        label: `${supplier.name} (${supplier.email})`,
        value: supplier.id,
        name: supplier.name,
        email: supplier.email,
        id: supplier.id
      }));

      setSupplierData(mappedData);
      setIsLoading(false);
    } catch (err) {
      setIsLoading(false);
      toast.error(err?.response?.data?.message || t("Failed to load suppliers. Please try again."));
    }
  };

  useEffect(() => {
    if (isVisible) {
      fetchAllSupplierData();
    }
  }, [isVisible]);

  // Add new size-qty pair
  const handleAddSizeQty = () => {
    setSizeQuantities([
      ...sizeQuantities,
      { id: Date.now(), size: "", qty: 10 }
    ]);
  };

  // Remove size-qty pair
  const handleRemoveSizeQty = (id) => {
    if (sizeQuantities.length > 1) {
      setSizeQuantities(sizeQuantities.filter(item => item.id !== id));
    }
  };

  // Update size for a specific pair
  const handleSizeChange = (id, value) => {
    setSizeQuantities(sizeQuantities.map(item =>
      item.id === id ? { ...item, size: value } : item
    ));
  };

  // Update qty for a specific pair
  const handleQtyChange = (id, value) => {
    setSizeQuantities(sizeQuantities.map(item =>
      item.id === id ? { ...item, qty: Number(value) } : item
    ));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!itemCode) {
      toast.error(t("Item code is required"));
      return;
    }

    if (!selectedSupplier) {
      toast.error(t("Please select a supplier"));
      return;
    }

    if (!poNumber.trim()) {
      toast.error(t("PO Number is required"));
      return;
    }

    // Validate all quantities
    const invalidQty = sizeQuantities.some(item => item.qty <= 0);
    if (invalidQty) {
      toast.error(t("All quantities must be greater than 0"));
      return;
    }

    // Validate all sizes are filled
    const emptySizes = sizeQuantities.some(item => !item.size.trim());
    if (emptySizes) {
      toast.error(t("Please fill in all size fields"));
      return;
    }

    setLoading(true);

    try {
      const response = await newRequest.post("/controlSerials", {
        ItemCode: itemCode,
        supplierId: selectedSupplier.id,
        poNumber: poNumber,
        sizeQuantities: sizeQuantities.map(item => ({
          qty: item.qty,
          size: item.size
        }))
      });
      
      toast.success(response?.data?.message || t("Control serials added successfully"));
      // queryClient.invalidateQueries(['poNumbersWithQty']);
      setLoading(false);
      navigate('/po-number');
      handleClosePopup();
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.response?.data?.error || t("Error in adding control serials"));
      setLoading(false);
    }
  };

  const totalQuantity = sizeQuantities.reduce((sum, item) => sum + item.qty, 0);

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
                    {t("Add Control Serials")}
                  </h2>
                  <div className="flex items-center space-x-3">
                    <button 
                      className="text-white hover:text-gray-300 focus:outline-none"
                      onClick={handleClosePopup}
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
                      className="text-white hover:text-red-600 focus:outline-none"
                      onClick={handleClosePopup}
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

              <form onSubmit={handleSubmit} className="w-full overflow-y-auto mt-6 px-4">
                <div className="space-y-4">
                  {/* PO Number */}
                  <div className="w-full font-body sm:text-base text-sm flex flex-col gap-2">
                    <label 
                      htmlFor="poNumber" 
                      className={`text-secondary font-semibold ${i18n.language==='ar'?'text-end':'text-start'}`}
                    >
                      {t("PO Number")} *:
                    </label>
                    <input
                      type="text"
                      id="poNumber"
                      value={poNumber}
                      onChange={(e) => setPoNumber(e.target.value)}
                      placeholder={t("Enter PO Number")}
                      className={`border w-full rounded-md border-secondary placeholder:text-gray-400 p-2 ${i18n.language==='ar'?'text-end':'text-start'}`}
                      required
                    />
                  </div>

                  {/* Supplier */}
                  <div className="w-full font-body sm:text-base text-sm flex flex-col gap-2">
                    <label 
                      className={`text-secondary font-semibold ${i18n.language==='ar'?'text-end':'text-start'}`}
                    >
                      {t("Supplier")} *:
                    </label>
                    <Autocomplete
                      options={supplierData}
                      getOptionLabel={(option) => option.label || ""}
                      value={selectedSupplier}
                      onChange={(event, newValue) => {
                        setSelectedSupplier(newValue);
                      }}
                      loading={isLoading}
                      disabled={isLoading}
                      renderOption={(props, option) => (
                        <li {...props}>
                          <div className="flex flex-col">
                            <span className="font-semibold">{option.name}</span>
                            <span className="text-sm text-gray-600">{option.email}</span>
                          </div>
                        </li>
                      )}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          placeholder={isLoading ? t("Loading suppliers...") : t("selection / search")}
                          variant="outlined"
                          size="small"
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              '& fieldset': {
                                borderColor: '#021F69',
                              },
                            },
                          }}
                          required
                        />
                      )}
                      sx={{ width: '100%' }}
                    />
                    {selectedSupplier && (
                      <div className="text-xs text-gray-600 mt-1 flex flex-col gap-1">
                        <div><strong>{t("Name")}:</strong> {selectedSupplier.name}</div>
                        <div><strong>{t("Email")}:</strong> {selectedSupplier.email}</div>
                      </div>
                    )}
                  </div>

                  {/* Item Code */}
                  <div className="w-full font-body sm:text-base text-sm flex flex-col gap-2">
                    <label 
                      htmlFor="itemCode" 
                      className={`text-secondary font-semibold ${i18n.language==='ar'?'text-end':'text-start'}`}
                    >
                      {t("Item Code")}
                    </label>
                    <input
                      type="text"
                      id="itemCode"
                      value={itemCode}
                      readOnly
                      className={`border w-full rounded-md border-secondary bg-gray-100 p-2 ${i18n.language==='ar'?'text-end':'text-start'}`}
                    />
                  </div>

                  {/* Size & Quantity Pairs */}
                  <div className="w-full font-body sm:text-base text-sm flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <label className={`text-secondary font-semibold ${i18n.language==='ar'?'text-end':'text-start'}`}>
                        {t("Size & Quantity")} *
                      </label>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={handleAddSizeQty}
                        style={{ 
                          borderColor: "#021F69", 
                          color: "#021F69",
                          textTransform: "none"
                        }}
                      >
                        {t("Add Size")}
                      </Button>
                    </div>

                    <div className="space-y-3 mt-2">
                      {sizeQuantities.map((item, index) => (
                        <div 
                          key={item.id} 
                          className="border border-gray-300 rounded-lg p-4 bg-gray-50 shadow-sm hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-1 grid grid-cols-2 gap-3">
                              <div className="flex flex-col gap-1">
                                <label className="text-xs font-semibold text-gray-700">
                                  {t("Size")}
                                </label>
                                <Autocomplete
                                  options={sizeOptions}
                                  getOptionLabel={(option) => option.label || ""}
                                  value={sizeOptions.find(opt => opt.value === item.size) || null}
                                  onChange={(event, newValue) => {
                                    handleSizeChange(item.id, newValue?.value || "");
                                  }}
                                  renderInput={(params) => (
                                    <TextField
                                      {...params}
                                      placeholder={t("Select size")}
                                      variant="outlined"
                                      size="small"
                                      sx={{
                                        '& .MuiOutlinedInput-root': {
                                          '& fieldset': {
                                            borderColor: '#d1d5db',
                                          },
                                          '&:hover fieldset': {
                                            borderColor: '#021F69',
                                          },
                                          '&.Mui-focused fieldset': {
                                            borderColor: '#021F69',
                                          },
                                        },
                                      }}
                                      required
                                    />
                                  )}
                                  sx={{ width: '100%' }}
                                />
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-xs font-semibold text-gray-700">
                                  {t("Quantity")}
                                </label>
                                <input
                                  type="number"
                                  value={item.qty}
                                  onChange={(e) => handleQtyChange(item.id, e.target.value)}
                                  placeholder={t("Enter qty")}
                                  min="1"
                                  className="border rounded-md border-gray-300 p-2 text-sm focus:border-secondary focus:outline-none"
                                  required
                                />
                              </div>
                            </div>
                            {sizeQuantities.length > 1 && (
                              <IconButton
                                onClick={() => handleRemoveSizeQty(item.id)}
                                size="small"
                                style={{ color: "#dc2626", marginTop: "20px" }}
                              >
                                <DeleteIcon />
                              </IconButton>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <p className="text-xs text-gray-500 mt-2">
                      {t("Add multiple sizes with their quantities. Click")} <strong>"{t("Add Size")}"</strong> {t("to add more.")}
                    </p>
                  </div>

                  {/* Summary */}
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                    <p className="text-sm text-blue-800">
                      <strong>{t("Summary")}:</strong> {t("Total")} <strong>{totalQuantity}</strong> {t("control serial numbers will be generated for item")} <strong>{itemCode}</strong>
                    </p>
                    {sizeQuantities.length > 0 && (
                      <div className="mt-2 text-xs text-blue-700">
                        {sizeQuantities.map((item, idx) => (
                          <div key={item.id}>
                            • {t("Size")} <strong>{item.size || "___"}</strong>: {item.qty} {t("serials")}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-6 py-4 border-t">
                    <Button
                      variant="contained"
                      style={{ backgroundColor: "#021F69", color: "#ffffff" }}
                      type="submit"
                      disabled={loading}
                      className="w-full"
                      endIcon={
                        loading ? (
                          <CircularProgress size={24} color="inherit" />
                        ) : (
                          <SendIcon />
                        )
                      }
                    >
                      {t("GENERATE CONTROL SERIALS")}
                    </Button>
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

export default AddControlSerialPopup;