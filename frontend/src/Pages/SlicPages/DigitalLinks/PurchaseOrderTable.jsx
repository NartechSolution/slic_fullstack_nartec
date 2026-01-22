import React, { useState } from "react";
import { Button, CircularProgress } from "@mui/material";
import { HiRefresh } from "react-icons/hi";

const PurchaseOrderTable = ({ 
  orders, 
  isLoading, 
  refetchOrders, 
  onViewOrder,
  onUpdateSerial,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedRowIndex, setSelectedRowIndex] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const itemsPerPage = 5;

  const ordersArray = Array.isArray(orders) ? orders : [];

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetchOrders();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleRowClick = (order, index) => {
    setSelectedRowIndex(index);
    setSelectedOrder(order);
    if (onViewOrder) {
      onViewOrder(order);
    }
  };

  const filteredOrders = ordersArray.filter(order => 
    order.poNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.ItemCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.size?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.supplierName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentOrders = filteredOrders.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      setSelectedRowIndex(null);
      setSelectedOrder(null);
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

  return (
    <div className="bg-white">
      {/* Header Section */}
      <div className="px-6 py-4 flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
        <div>
          <h3 className="font-bold text-gray-900 text-lg mb-1">Purchase Orders</h3>
          <p className="text-sm text-gray-500">
            Total {filteredOrders.length} Records
            {selectedOrder && (
              <span className="ml-2 text-secondary font-medium">
                • Selected: {selectedOrder.poNumber}
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <input
            type="text"
            placeholder="Search by PO, serial, supplier..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
              setSelectedRowIndex(null);
              setSelectedOrder(null);
            }}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm flex-1 sm:w-80 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />

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
        </div>
      </div>

      <div className="text-sm text-gray-500 px-6 pb-3">
        Click on any row to select
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="flex items-center justify-center h-64">
          <CircularProgress className="w-12 h-12 animate-spin text-blue-600" />
        </div>
      )}

      {!isLoading && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-y border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">PO Number</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Size</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Qty</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">ItemCode</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Supplier</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {currentOrders.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-4 py-8 text-center text-gray-500">
                      No Records found
                    </td>
                  </tr>
                ) : (
                  currentOrders.map((order, idx) => (
                    <tr 
                      key={idx} 
                      onClick={() => handleRowClick(order, idx)}
                      className={`hover:bg-blue-50 transition-colors cursor-pointer ${
                        selectedRowIndex === idx ? 'bg-blue-100 border-l-4 border-l-blue-600' : ''
                      }`}
                    >
                      <td className="px-4 py-3 text-sm text-gray-600">{order.poNumber || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{order.size || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">{order.qty || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{order.ItemCode || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{order.supplierName || 'N/A'}</td>
                      <td className="px-4 py-3">
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            if(onUpdateSerial) onUpdateSerial(order);
                          }}
                          sx={{
                            color: '#1D2F90',
                            borderColor: '#1D2F90',
                            '&:hover': {
                              borderColor: '#162561',
                              backgroundColor: 'rgba(29, 47, 144, 0.04)',
                            }
                          }}
                        >
                          Update
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-600">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredOrders.length)} of {filteredOrders.length} entries
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
    </div>
  );
};

export default PurchaseOrderTable;