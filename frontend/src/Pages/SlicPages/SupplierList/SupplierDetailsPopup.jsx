import React from "react";
import { useQuery } from "react-query";
import { toast } from "react-toastify";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import { useTranslation } from "react-i18next";
import "./SupplierDetails.css";
import newRequest from "../../../utils/userRequest";

const MAX_SERIALS_SHOWN = 25;

const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
};

const SupplierDetailsPopup = ({ isVisible, setVisibility, supplier }) => {
  const { t, i18n } = useTranslation();

  // Fetch the full record (control serials included) when the popup opens
  const { data: details, isLoading } = useQuery({
    queryKey: ["supplier-details", supplier?.id],
    queryFn: async () => {
      const response = await newRequest.get(`/suppliers/v1/${supplier?.id}`);
      return response?.data?.data;
    },
    enabled: Boolean(isVisible && supplier?.id),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    onError: (err) => {
      toast.error(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          t("Failed to load supplier details")
      );
    },
  });

  const handleCloseCreatePopup = () => {
    setVisibility(false);
  };

  // Fall back to the row data while the request is still in flight
  const record = details || supplier || {};
  const controlSerials = details?.controlSerials || [];

  const poNumbers = [
    ...new Set(controlSerials.map((item) => item?.poNumber).filter(Boolean)),
  ];
  const receivedCount = controlSerials.filter((item) => item?.isReceived).length;
  const sentCount = controlSerials.filter((item) => item?.isSentToSupplier)
    .length;

  const labelClass = `text-secondary ${
    i18n.language === "ar" ? "text-end" : "text-start"
  }`;
  const inputClass = `border w-full rounded-md border-secondary placeholder:text-secondary p-2 mb-3 ${
    i18n.language === "ar" ? "text-end" : "text-start"
  }`;

  const summaryCards = [
    { label: t("Total Serials"), value: controlSerials.length },
    { label: t("PO Numbers"), value: poNumbers.length },
    { label: t("Sent"), value: sentCount },
    { label: t("Received"), value: receivedCount },
  ];

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
                    {t("Supplier Details")}
                  </h2>
                  <div className="flex items-center space-x-3">
                    <button
                      className="text-white hover:text-gray-300 focus:outline-none"
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

              <div className="w-full overflow-y-auto">
                {isLoading ? (
                  <div className="flex justify-center items-center py-20">
                    <CircularProgress size={30} />
                  </div>
                ) : (
                  <div
                    className={`flex justify-between flex-col sm:gap-3 gap-3 mt-5 ${
                      i18n.language === "ar"
                        ? "sm:flex-row-reverse"
                        : "sm:flex-row"
                    }`}
                  >
                    {/* Account information */}
                    <div className="w-full lg:mt-0 md:mt-3 mt-6">
                      <div className="w-full font-body sm:text-base text-sm flex flex-col gap-0">
                        <label htmlFor="supplierName" className={labelClass}>
                          {t("Supplier Name")}
                        </label>
                        <input
                          type="text"
                          id="supplierName"
                          value={record?.name || ""}
                          className={inputClass}
                          readOnly
                        />
                      </div>

                      <div className="w-full font-body sm:text-base text-sm flex flex-col gap-0">
                        <label htmlFor="supplierEmail" className={labelClass}>
                          {t("Email")}
                        </label>
                        <input
                          type="text"
                          id="supplierEmail"
                          value={record?.email || ""}
                          className={inputClass}
                          readOnly
                        />
                      </div>

                      <div
                        className={`flex justify-center items-center sm:gap-3 gap-3 ${
                          i18n.language === "ar"
                            ? "sm:flex-row-reverse"
                            : "sm:flex-row"
                        }`}
                      >
                        <div className="w-full font-body sm:text-base text-sm flex flex-col gap-0">
                          <label htmlFor="supplierStatus" className={labelClass}>
                            {t("Status")}
                          </label>
                          <input
                            type="text"
                            id="supplierStatus"
                            value={record?.status || ""}
                            className={`${inputClass} capitalize font-semibold`}
                            readOnly
                          />
                        </div>

                        <div className="w-full font-body sm:text-base text-sm flex flex-col gap-0">
                          <label htmlFor="registeredOn" className={labelClass}>
                            {t("Registered On")}
                          </label>
                          <input
                            type="text"
                            id="registeredOn"
                            value={formatDate(record?.createdAt)}
                            className={inputClass}
                            readOnly
                          />
                        </div>
                      </div>

                      <div className="w-full font-body sm:text-base text-sm flex flex-col gap-0">
                        <label htmlFor="lastUpdated" className={labelClass}>
                          {t("Last Updated")}
                        </label>
                        <input
                          type="text"
                          id="lastUpdated"
                          value={formatDate(record?.updatedAt)}
                          className={inputClass}
                          readOnly
                        />
                      </div>

                      {/* Control serials */}
                      <div
                        className={`w-full font-body sm:text-base text-sm mt-2 ${
                          i18n.language === "ar" ? "text-end" : "text-start"
                        }`}
                      >
                        <label className={labelClass}>
                          {t("Control Serials")}
                        </label>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-2">
                          {summaryCards.map((card) => (
                            <div
                              key={card.label}
                              className="border border-secondary rounded-md py-2 text-center"
                            >
                              <p className="text-lg font-bold text-secondary">
                                {card.value}
                              </p>
                              <p className="text-[11px] text-secondary">
                                {card.label}
                              </p>
                            </div>
                          ))}
                        </div>

                        {controlSerials.length === 0 ? (
                          <p className="text-sm text-gray-500 italic mb-3">
                            {t("No control serials assigned to this supplier yet.")}
                          </p>
                        ) : (
                          <div className="border border-secondary rounded-md overflow-hidden mb-3">
                            <div className="max-h-52 overflow-y-auto">
                              <table className="w-full text-sm text-start">
                                <thead className="bg-secondary sticky top-0">
                                  <tr>
                                    <th className="text-start px-2 py-1.5 text-white font-semibold">
                                      {t("Serial Number")}
                                    </th>
                                    <th className="text-start px-2 py-1.5 text-white font-semibold">
                                      {t("PO Number")}
                                    </th>
                                    <th className="text-start px-2 py-1.5 text-white font-semibold">
                                      {t("Size")}
                                    </th>
                                    <th className="text-start px-2 py-1.5 text-white font-semibold">
                                      {t("Side")}
                                    </th>
                                    <th className="text-start px-2 py-1.5 text-white font-semibold">
                                      {t("Received")}
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {controlSerials
                                    .slice(0, MAX_SERIALS_SHOWN)
                                    .map((item) => (
                                      <tr
                                        key={item?.id}
                                        className="border-t border-gray-200"
                                      >
                                        <td className="px-2 py-1.5">
                                          {item?.serialNumber || "-"}
                                        </td>
                                        <td className="px-2 py-1.5">
                                          {item?.poNumber || "-"}
                                        </td>
                                        <td className="px-2 py-1.5">
                                          {item?.size || "-"}
                                        </td>
                                        <td className="px-2 py-1.5">
                                          {item?.side || "-"}
                                        </td>
                                        <td className="px-2 py-1.5">
                                          <span
                                            className={
                                              item?.isReceived
                                                ? "text-green-600 font-semibold"
                                                : "text-gray-400"
                                            }
                                          >
                                            {item?.isReceived
                                              ? t("Yes")
                                              : t("No")}
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                </tbody>
                              </table>
                            </div>
                            {controlSerials.length > MAX_SERIALS_SHOWN && (
                              <p className="text-xs text-gray-500 px-2 py-1.5 bg-gray-50 border-t border-gray-200">
                                {t("Showing first")} {MAX_SERIALS_SHOWN}{" "}
                                {t("of")} {controlSerials.length}{" "}
                                {t("serials")}
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end w-full mt-2">
                        <Button
                          variant="contained"
                          style={{
                            backgroundColor: "#021F69",
                            color: "#ffffff",
                          }}
                          onClick={handleCloseCreatePopup}
                        >
                          {t("Close")}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierDetailsPopup;
