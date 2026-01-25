import React, { useState, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { FiEdit2, FiTrash2, FiPlus, FiPrinter, FiLock } from "react-icons/fi";
import { HiRefresh } from "react-icons/hi";
import { Button, CircularProgress, Tooltip } from "@mui/material";
import { toast } from "react-toastify";
import newRequest from "../../../utils/userRequest";
import EditControlSerialPopup from "./EditControlSerialPopup";
import ExportControlSerials from "./ExportControlSerials";
import ControlledSerialsPrint from "./ControlledSerialsPrint";

const DigitalLinkTable = ({ 
  serials, 
  allSerials,
  isLoading, 
  refetchSerials, 
  onAddSerial,
  pagination,
  onPageChange,
}) => {
  const [isEditPopupVisible, setIsEditPopupVisible] = useState(false);
  const [selectedSerial, setSelectedSerial] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);
  const [selectAllMode, setSelectAllMode] = useState(false);
  const printTriggerRef = useRef(null);

  const serialsArray = Array.isArray(serials) ? serials : [];
  const allSerialsArray = Array.isArray(allSerials) ? allSerials : [];

  // Use server-side pagination data
  const currentPage = pagination?.page || 1;
  const totalPages = pagination?.totalPages || 1;
  const totalItems = pagination?.total || 0;
  const limit = pagination?.limit || 10;

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetchSerials();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleDelete = async (serial) => {
    // Check if already sent to supplier
    if (serial.isSentToSupplier) {
      toast.warning('Cannot delete: This serial has already been sent to supplier');
      return;
    }

    setDeletingId(serial.id);
    try {
      const res = await newRequest.delete(`/controlSerials/${serial.id}`);
      toast.success(res?.data?.message || "Control serial deleted successfully");
      refetchSerials();
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.response?.data?.message || "Failed to delete control serial");
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdit = (serial) => {
    // Check if already sent to supplier
    if (serial.isSentToSupplier) {
      toast.warning('Cannot edit: This serial has already been sent to supplier');
      return;
    }

    setSelectedSerial(serial);
    setIsEditPopupVisible(true);
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages && onPageChange) {
      onPageChange(page);
      // Don't clear selection if in "select all" mode
      if (!selectAllMode) {
        setSelectedRows([]);
      }
    }
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  // Handle select all checkbox - Selects all serials on current page
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedRows(allSerialsArray.length > 0 ? allSerialsArray : serialsArray);
      setSelectAllMode(true);
    } else {
      setSelectedRows([]);
      setSelectAllMode(false);
    }
  };

  // Handle individual row selection
  const handleSelectRow = (serial) => {
    setSelectedRows(prev => {
      const isSelected = prev.some(row => row.id === serial.id);
      if (isSelected) {
        const newSelection = prev.filter(row => row.id !== serial.id);
        // If we deselect and had select all mode, turn it off
        if (selectAllMode) {
          setSelectAllMode(false);
        }
        return newSelection;
      } else {
        return [...prev, serial];
      }
    });
  };

  // Check if row is selected
  const isRowSelected = (serial) => {
    return selectedRows.some(row => row.id === serial.id);
  };

  // Check if all serials on current page are selected
  const isAllCurrentPageSelected = serialsArray.length > 0 && 
    serialsArray.every(serial => isRowSelected(serial));

  const isSomeSelected = selectedRows.length > 0 && !selectAllMode;

  // Handle print
  const handlePrint = () => {
    if (selectedRows.length === 0) {
      toast.warning("Please select at least one row to print");
      return;
    }

    // Trigger print
    if (printTriggerRef.current) {
      printTriggerRef.current.click();
    }
  };

  // Clear selection after print
  const handlePrintComplete = () => {
    setSelectedRows([]);
    setSelectAllMode(false);
  };

  return (
    <div className="bg-white">
      {/* Header Section */}
      <div className="px-6 py-4 flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
        <div>
          <h3 className="font-bold text-gray-900 text-lg mb-1">Controlled Serials</h3>
          <p className="text-sm text-gray-500">
            Total {totalItems} controlled serials
            {selectedRows.length > 0 && ` • ${selectedRows.length} selected`}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          {selectedRows.length > 0 && (
            <Button 
              onClick={handlePrint}
              variant="contained"
              sx={{
                backgroundColor: '#9333ea',
                '&:hover': {
                  backgroundColor: '#7e22ce',
                },
              }}
              endIcon={<FiPrinter className="w-4 h-4" />}
            >
              Print Labels ({selectedRows.length})
            </Button>
          )}
          <Button 
            onClick={handleRefresh}
            variant="contained"
            disabled={isRefreshing || isLoading}
            sx={{
              backgroundColor: '#1D2F90',
              '&:hover': {
                backgroundColor: '#162561',
              },
              '&:disabled': {
                backgroundColor: '#ccc',
              },
            }}
            endIcon={
              isRefreshing ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <HiRefresh className="text-xl" />
              )
            }
          >
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>
          <ExportControlSerials serials={allSerialsArray} />
        </div>
      </div>
      
      {/* Loading Overlay */}
      {isLoading && (
        <div className="flex items-center justify-center h-64">
          <CircularProgress size={48} />
        </div>
      )}

      {!isLoading && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-y border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left w-12">
                    <div className="flex flex-col gap-1">
                      <input
                        type="checkbox"
                        checked={selectAllMode}
                        ref={(el) => {
                          if (el) el.indeterminate = isSomeSelected;
                        }}
                        onChange={handleSelectAll}
                        className="w-4 h-4 text-secondary border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                      />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider truncate">PO Number</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider truncate">Supplier Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider truncate">Serial Number</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider truncate">Item Code</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider truncate">Item Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider truncate">GTIN</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider truncate">Width</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider truncate">Color</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider truncate">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider truncate">QR Code</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider truncate">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {serialsArray.length === 0 ? (
                  <tr>
                    <td colSpan="12" className="px-4 py-8 text-center text-gray-500">
                      No control serials found
                    </td>
                  </tr>
                ) : (
                  serialsArray.map((serial, idx) => (
                    <tr 
                      key={serial.id || idx} 
                      className={`hover:bg-gray-50 transition-colors ${
                        isRowSelected(serial) ? 'bg-blue-50' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={isRowSelected(serial)}
                          onChange={() => handleSelectRow(serial)}
                          className="w-4 h-4 text-secondary border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium truncate ${
                          serial.poNumber === 'Available' 
                            ? 'bg-gray-100 text-green-800' 
                            : 'bg-green-100 text-gray-800'
                        }`}>
                          {serial.poNumber || 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium truncate">{serial.supplierName || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium truncate">{serial.serialNumber || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 truncate">{serial.ItemCode || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 truncate">{serial.itemName || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 truncate">{serial.gtin || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 truncate">{serial.width || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 truncate">{serial.color || ''}</td>
                      <td className="px-4 py-3 truncate">
                        {serial.isSentToSupplier ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <FiLock className="w-3 h-3" />
                            Sent
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Draft
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 truncate">
                        {serial.serialNumber && (
                          <QRCodeSVG value={serial.serialNumber} size={32} />
                        )}
                      </td>
                      <td className="px-4 py-3 truncate">
                        <div className="flex items-center justify-center gap-2">
                          <Tooltip 
                            title={serial.isSentToSupplier ? "Cannot edit: Already sent to supplier" : "Edit"} 
                            arrow
                          >
                            <span>
                              <button
                                onClick={() => handleEdit(serial)}
                                disabled={serial.isSentToSupplier}
                                className={`p-1.5 rounded-md transition-colors ${
                                  serial.isSentToSupplier 
                                    ? 'text-gray-400 cursor-not-allowed opacity-50' 
                                    : 'text-secondary hover:bg-blue-50'
                                }`}
                                title={serial.isSentToSupplier ? "Cannot edit: Already sent to supplier" : "Edit"}
                              >
                                <FiEdit2 className="w-4 h-4" />
                              </button>
                            </span>
                          </Tooltip>
                          <Tooltip 
                            title={serial.isSentToSupplier ? "Cannot delete: Already sent to supplier" : "Delete"} 
                            arrow
                          >
                            <span>
                              <button
                                onClick={() => handleDelete(serial)}
                                disabled={serial.isSentToSupplier || deletingId === serial.id}
                                className={`p-1.5 rounded-md transition-colors ${
                                  serial.isSentToSupplier 
                                    ? 'text-gray-400 cursor-not-allowed opacity-50' 
                                    : 'text-red-600 hover:bg-red-50'
                                }`}
                                title={serial.isSentToSupplier ? "Cannot delete: Already sent to supplier" : "Delete"}
                              >
                                {deletingId === serial.id ? (
                                  <CircularProgress size={16} sx={{ color: '#dc2626' }} />
                                ) : (
                                  <FiTrash2 className="w-4 h-4" />
                                )}
                              </button>
                            </span>
                          </Tooltip>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-600">
              Showing {((currentPage - 1) * limit) + 1} to {Math.min(currentPage * limit, totalItems)} of {totalItems} entries
            </div>
            <div className="flex flex-wrap gap-1 justify-center">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Previous
              </button>
              {getPageNumbers().map((page, idx) => (
                page === '...' ? (
                  <span key={idx} className="px-3 py-1">...</span>
                ) : (
                  <button
                    key={idx}
                    onClick={() => handlePageChange(page)}
                    className={`px-3 py-1 border rounded text-sm ${
                      currentPage === page
                        ? 'bg-secondary text-white border-secondary'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                )
              ))}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      {/* Edit Popup */}
      <EditControlSerialPopup
        isVisible={isEditPopupVisible}
        setVisibility={setIsEditPopupVisible}
        refreshData={refetchSerials}
        serialData={selectedSerial}
      />

      {/* Print Component */}
      <ControlledSerialsPrint
        selectedRows={selectedRows.map(serial => ({
          serialNo: serial.serialNumber || 'N/A',
          ItemCode: serial.ItemCode || 'N/A',
          size: serial.product?.ProductSize || 'N/A',
          GTIN: serial.gtin || 'N/A',
        }))}
        onPrintComplete={handlePrintComplete}
      />
      <button 
        ref={printTriggerRef}
        onClick={() => document.getElementById('gtin-print-trigger')?.click()}
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default DigitalLinkTable;