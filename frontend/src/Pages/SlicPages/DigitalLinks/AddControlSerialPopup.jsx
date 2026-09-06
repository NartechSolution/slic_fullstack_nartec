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

let rowSeq = 0;
const uid = () => `${Date.now()}-${++rowSeq}`;

const newSizeRow = () => ({ id: uid(), size: "", rightQty: 10, leftQty: 10 });

const newItemGroup = (code) => ({
  id: uid(),
  itemCode: code,
  sizeQuantities: [newSizeRow()],
});

// Accepts a string, an item object, or a mixed array and returns unique item codes
const toUniqueCodes = (input) => {
  const list = Array.isArray(input) ? input : input ? [input] : [];
  const seen = new Set();
  const codes = [];
  list.forEach((entry) => {
    const code = typeof entry === "string" ? entry : entry?.ItemCode;
    if (code && !seen.has(code)) {
      seen.add(code);
      codes.push(code);
    }
  });
  return codes;
};

const AddControlSerialPopup = ({ isVisible, setVisibility, refreshData, itemCode, itemCodes }) => {
  const { t, i18n } = useTranslation();
  const [poNumber, setPoNumber] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [supplierData, setSupplierData] = useState([]);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // One group per item code, each with its own size/quantity rows
  const [itemGroups, setItemGroups] = useState([]);

  // Inline item-code search (to add more item codes without leaving the popup)
  const [itemSearchInput, setItemSearchInput] = useState("");
  const [itemOptions, setItemOptions] = useState([]);
  const [itemSearchLoading, setItemSearchLoading] = useState(false);

  // Per-item-code failures from the last submit, keyed by item code
  const [submitErrors, setSubmitErrors] = useState({});

  // Generate size options from 30 to 50
  const sizeOptions = Array.from({ length: 21 }, (_, i) => ({
    label: `${30 + i}`,
    value: `${30 + i}`
  }));

  const handleClosePopup = () => {
    setVisibility(false);
    setPoNumber("");
    setSelectedSupplier(null);
    setItemGroups([]);
    setItemSearchInput("");
    setItemOptions([]);
    setSubmitErrors({});
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

  // Seed the groups from whatever the caller passed in (array or single code)
  useEffect(() => {
    if (!isVisible) return;
    const codes = toUniqueCodes(itemCodes?.length ? itemCodes : itemCode);
    setItemGroups(codes.map((code) => newItemGroup(code)));
  }, [isVisible, itemCode, itemCodes]);

  // Debounced item code search
  useEffect(() => {
    const query = itemSearchInput.trim();
    if (query.length < 2) {
      setItemOptions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setItemSearchLoading(true);
      try {
        const response = await newRequest.get(
          `/itemCodes/v1/itemCodes/search?search=${encodeURIComponent(query)}`
        );
        const rows = response?.data?.data || [];
        // The same ItemCode is returned once per size — show each code only once
        const seen = new Set();
        const unique = [];
        rows.forEach((row) => {
          if (row?.ItemCode && !seen.has(row.ItemCode)) {
            seen.add(row.ItemCode);
            unique.push(row);
          }
        });
        setItemOptions(unique);
      } catch (err) {
        setItemOptions([]);
      } finally {
        setItemSearchLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [itemSearchInput]);

  // Add a new item code group
  const handleAddItemCode = (option) => {
    const code = typeof option === "string" ? option : option?.ItemCode;
    if (!code) return;

    if (itemGroups.some((group) => group.itemCode === code)) {
      toast.info(t("This item code is already added"));
      return;
    }

    setItemGroups((prev) => [...prev, newItemGroup(code)]);
    setItemSearchInput("");
    setItemOptions([]);
  };

  // Remove an item code group
  const handleRemoveItemCode = (groupId) => {
    setItemGroups((prev) => prev.filter((group) => group.id !== groupId));
  };

  // Add new size-qty pair to a specific item code
  const handleAddSizeQty = (groupId) => {
    setItemGroups((prev) =>
      prev.map((group) =>
        group.id === groupId
          ? { ...group, sizeQuantities: [...group.sizeQuantities, newSizeRow()] }
          : group
      )
    );
  };

  // Remove size-qty pair from a specific item code
  const handleRemoveSizeQty = (groupId, rowId) => {
    setItemGroups((prev) =>
      prev.map((group) =>
        group.id === groupId && group.sizeQuantities.length > 1
          ? { ...group, sizeQuantities: group.sizeQuantities.filter((row) => row.id !== rowId) }
          : group
      )
    );
  };

  // Update size for a specific pair
  const handleSizeChange = (groupId, rowId, value) => {
    setItemGroups((prev) =>
      prev.map((group) =>
        group.id === groupId
          ? {
              ...group,
              sizeQuantities: group.sizeQuantities.map((row) =>
                row.id === rowId ? { ...row, size: value } : row
              ),
            }
          : group
      )
    );
  };

  // Update quantity field for a specific pair
  const handleFieldChange = (groupId, rowId, field, value) => {
    setItemGroups((prev) =>
      prev.map((group) =>
        group.id === groupId
          ? {
              ...group,
              sizeQuantities: group.sizeQuantities.map((row) =>
                row.id === rowId ? { ...row, [field]: Number(value) } : row
              ),
            }
          : group
      )
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (itemGroups.length === 0) {
      toast.error(t("Please add at least one item code"));
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

    for (const group of itemGroups) {
      // Validate all sizes are filled
      if (group.sizeQuantities.some((row) => !String(row.size || "").trim())) {
        toast.error(`${group.itemCode}: ${t("Please fill in all size fields")}`);
        return;
      }

      // Validate quantities
      if (group.sizeQuantities.some((row) => (row.rightQty || 0) <= 0 && (row.leftQty || 0) <= 0)) {
        toast.error(`${group.itemCode}: ${t("Right or Left quantity must be greater than 0 for each size")}`);
        return;
      }

      // Validate no duplicate size within the same item code
      const sizes = group.sizeQuantities.map((row) => row.size);
      if (new Set(sizes).size !== sizes.length) {
        toast.error(`${group.itemCode}: ${t("Duplicate sizes are not allowed for the same item code")}`);
        return;
      }
    }

    setLoading(true);
    setSubmitErrors({});

    const succeeded = [];
    const failed = [];

    // One request (and therefore one control serial master) per item code
    for (const group of itemGroups) {
      try {
        await newRequest.post("/controlSerials", {
          ItemCode: group.itemCode,
          supplierId: selectedSupplier.id,
          poNumber: poNumber,
          sizeQuantities: group.sizeQuantities.map((row) => ({
            rightQty: row.rightQty,
            leftQty: row.leftQty,
            size: row.size
          }))
        });
        succeeded.push(group.itemCode);
      } catch (err) {
        failed.push({
          itemCode: group.itemCode,
          message:
            err?.response?.data?.message ||
            err?.response?.data?.error ||
            t("Error in adding control serials")
        });
      }
    }

    setLoading(false);

    // Toasts stack up and disappear — also keep the reason on each failed card
    setSubmitErrors(
      failed.reduce((acc, item) => ({ ...acc, [item.itemCode]: item.message }), {})
    );
    failed.forEach((item) => toast.error(`${item.itemCode}: ${item.message}`));

    if (succeeded.length > 0) {
      toast.success(
        `${t("Control serials added successfully for")} ${succeeded.length} ${t("item code(s)")}`
      );
      queryClient.invalidateQueries(['poNumbersWithQty']);
      if (typeof refreshData === "function") refreshData();

      if (failed.length === 0) {
        navigate('/po-number');
        handleClosePopup();
      } else {
        // Keep only the failed item codes on screen so they can be retried
        setItemGroups((prev) => prev.filter((group) => !succeeded.includes(group.itemCode)));
      }
    }
  };

  // Serials + units per item code (2 serials per size: 1 Right + 1 Left, skipping zero-qty sides)
  const groupTotals = (group) =>
    group.sizeQuantities.reduce(
      (acc, row) => ({
        serials: acc.serials + ((row.rightQty || 0) > 0 ? 1 : 0) + ((row.leftQty || 0) > 0 ? 1 : 0),
        units: acc.units + (row.rightQty || 0) + (row.leftQty || 0),
      }),
      { serials: 0, units: 0 }
    );

  const grandTotals = itemGroups.reduce(
    (acc, group) => {
      const totals = groupTotals(group);
      return { serials: acc.serials + totals.serials, units: acc.units + totals.units };
    },
    { serials: 0, units: 0 }
  );

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

                  {/* Add Item Code */}
                  <div className="w-full font-body sm:text-base text-sm flex flex-col gap-2">
                    <label
                      className={`text-secondary font-semibold ${i18n.language==='ar'?'text-end':'text-start'}`}
                    >
                      {t("Add Item Code")}
                    </label>
                    <Autocomplete
                      options={itemOptions}
                      getOptionLabel={(option) =>
                        typeof option === "string" ? option : option?.ItemCode || ""
                      }
                      filterOptions={(options) => options}
                      isOptionEqualToValue={(option, value) => option?.ItemCode === value?.ItemCode}
                      value={null}
                      inputValue={itemSearchInput}
                      onInputChange={(event, newInputValue, reason) => {
                        if (reason !== "reset") setItemSearchInput(newInputValue);
                      }}
                      onChange={(event, newValue) => handleAddItemCode(newValue)}
                      loading={itemSearchLoading}
                      noOptionsText={
                        itemSearchInput.trim().length < 2
                          ? t("Type at least 2 characters")
                          : t("No results found")
                      }
                      renderOption={(props, option) => (
                        <li {...props} key={option.ItemCode}>
                          <div className="flex flex-col">
                            <span className="font-semibold">{option.ItemCode}</span>
                            <span className="text-xs text-gray-600">
                              {option.EnglishName || option.ArabicName || "-"}
                            </span>
                          </div>
                        </li>
                      )}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          placeholder={t("Search item code to add")}
                          variant="outlined"
                          size="small"
                          InputProps={{
                            ...params.InputProps,
                            endAdornment: (
                              <>
                                {itemSearchLoading ? <CircularProgress color="inherit" size={18} /> : null}
                                {params.InputProps.endAdornment}
                              </>
                            ),
                          }}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              '& fieldset': {
                                borderColor: '#021F69',
                              },
                            },
                          }}
                        />
                      )}
                      sx={{ width: '100%' }}
                    />
                    <p className="text-xs text-gray-500">
                      {t("You can add multiple item codes. Each item code gets its own sizes and quantities.")}
                    </p>
                  </div>

                  {/* Partial-submit banner — the successful item codes are already saved */}
                  {Object.keys(submitErrors).length > 0 && (
                    <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {Object.keys(submitErrors).length} {t("item code(s) could not be created and are still listed below. Fix the reason shown on each, then submit again.")}
                    </div>
                  )}

                  {/* Item Codes with their Size & Quantity Pairs */}
                  {itemGroups.length === 0 ? (
                    <div className="border border-dashed border-gray-300 rounded-lg p-6 text-center text-gray-500 text-sm">
                      {t("No item code added yet. Search above to add one.")}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {itemGroups.map((group, groupIndex) => {
                        const totals = groupTotals(group);
                        return (
                          <div
                            key={group.id}
                            className="border border-secondary/30 rounded-lg bg-white shadow-sm"
                          >
                            {/* Item code header */}
                            <div className="flex justify-between items-center gap-2 px-4 py-3 border-b border-gray-200 bg-blue-50 rounded-t-lg">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-xs text-gray-500">#{groupIndex + 1}</span>
                                <span className="text-secondary font-semibold truncate">
                                  {t("Item Code")}: {group.itemCode}
                                </span>
                                <span className="text-xs text-gray-600 whitespace-nowrap">
                                  ({totals.serials} {t("serial(s)")}, {totals.units} {t("units")})
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="outlined"
                                  size="small"
                                  startIcon={<AddIcon />}
                                  onClick={() => handleAddSizeQty(group.id)}
                                  style={{
                                    borderColor: "#021F69",
                                    color: "#021F69",
                                    textTransform: "none"
                                  }}
                                >
                                  {t("Add Size")}
                                </Button>
                                {itemGroups.length > 1 && (
                                  <IconButton
                                    onClick={() => handleRemoveItemCode(group.id)}
                                    size="small"
                                    title={t("Remove item code")}
                                    style={{ color: "#dc2626" }}
                                  >
                                    <DeleteIcon />
                                  </IconButton>
                                )}
                              </div>
                            </div>

                            {/* Why this item code did not go through on the last submit */}
                            {submitErrors[group.itemCode] && (
                              <div className="mx-4 mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                                <strong>{t("Not created")}:</strong> {submitErrors[group.itemCode]}
                              </div>
                            )}

                            {/* Size rows */}
                            <div className="space-y-3 p-4">
                              {group.sizeQuantities.map((row) => (
                                <div
                                  key={row.id}
                                  className="border border-gray-300 rounded-lg p-4 bg-gray-50 shadow-sm hover:shadow-md transition-shadow"
                                >
                                  <div className="flex items-start gap-3">
                                    <div className="flex-1 grid grid-cols-3 gap-3">
                                      <div className="flex flex-col gap-1">
                                        <label className="text-xs font-semibold text-gray-700">
                                          {t("Size")}
                                        </label>
                                        <Autocomplete
                                          options={sizeOptions}
                                          getOptionLabel={(option) => option.label || ""}
                                          value={sizeOptions.find(opt => opt.value === row.size) || null}
                                          onChange={(event, newValue) => {
                                            handleSizeChange(group.id, row.id, newValue?.value || "");
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
                                          {t("Quantity Right")}
                                        </label>
                                        <input
                                          type="number"
                                          value={row.rightQty}
                                          onChange={(e) => handleFieldChange(group.id, row.id, "rightQty", e.target.value)}
                                          placeholder={t("Right")}
                                          min="0"
                                          className="border rounded-md border-gray-300 p-2 text-sm focus:border-secondary focus:outline-none"
                                          required
                                        />
                                      </div>
                                      <div className="flex flex-col gap-1">
                                        <label className="text-xs font-semibold text-gray-700">
                                          {t("Quantity Left")}
                                        </label>
                                        <input
                                          type="number"
                                          value={row.leftQty}
                                          onChange={(e) => handleFieldChange(group.id, row.id, "leftQty", e.target.value)}
                                          placeholder={t("Left")}
                                          min="0"
                                          className="border rounded-md border-gray-300 p-2 text-sm focus:border-secondary focus:outline-none"
                                          required
                                        />
                                      </div>
                                    </div>
                                    {group.sizeQuantities.length > 1 && (
                                      <IconButton
                                        onClick={() => handleRemoveSizeQty(group.id, row.id)}
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
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <p className="text-xs text-gray-500">
                    {t("Add multiple sizes with their quantities. Click")} <strong>"{t("Add Size")}"</strong> {t("to add more.")}
                  </p>

                  {/* Summary */}
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                    <p className="text-sm text-blue-800">
                      <strong>{t("Summary")}:</strong>{" "}
                      <strong>{grandTotals.serials}</strong> {t("unique control serial(s) will be generated")} ({grandTotals.units} {t("total units")}) {t("for")} <strong>{itemGroups.length}</strong> {t("item code(s)")}
                    </p>
                    <p className="text-xs text-blue-700 mt-1 italic">
                      {t("Note: each size generates up to 2 serials — one for Right shoes, one for Left shoes.")}
                    </p>
                    {itemGroups.length > 0 && (
                      <div className="mt-2 text-xs text-blue-700 space-y-2">
                        {itemGroups.map((group) => (
                          <div key={group.id}>
                            <div className="font-semibold">{group.itemCode}</div>
                            {group.sizeQuantities.map((row) => {
                              const serialsForSize =
                                ((row.rightQty || 0) > 0 ? 1 : 0) + ((row.leftQty || 0) > 0 ? 1 : 0);
                              return (
                                <div key={row.id} className="ps-3">
                                  • {t("Size")} <strong>{row.size || "___"}</strong>: R={row.rightQty || 0}, L={row.leftQty || 0}
                                  {" → "}
                                  <strong>{serialsForSize}</strong> {t("serial(s)")}, {(row.rightQty || 0) + (row.leftQty || 0)} {t("units")}
                                </div>
                              );
                            })}
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
                      disabled={loading || itemGroups.length === 0}
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
