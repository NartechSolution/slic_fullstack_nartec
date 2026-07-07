import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { toast } from 'react-toastify';
import { QRCodeSVG } from 'qrcode.react';
import { HiRefresh } from 'react-icons/hi';
import SideNav from '../../../../components/Sidebar/SideNav';
import newRequest from '../../../../utils/userRequest';
import { Button, CircularProgress } from '@mui/material';

const ArchivedPO = () => {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch Archived Control Serials with dynamic pagination
  const fetchArchivedSerials = async ({ queryKey }) => {
    const [_key, currentPage, currentLimit] = queryKey;
    
    const response = await newRequest.get(
      `/controlSerials?page=${currentPage}&limit=${currentLimit}&isArchived=true`
    );
    
    return {
      data: response?.data?.data?.controlSerials || [],
      pagination: response?.data?.data?.pagination || null,
      totalPages: response?.data?.data?.pagination?.totalPages || 0,
      currentPage: response?.data?.data?.pagination?.page || 1,
      totalItems: response?.data?.data?.pagination?.total || 0
    };
  };

  const { 
    data: serialsResponse, 
    isLoading, 
    refetch,
    isFetching 
  } = useQuery({
    queryKey: ['archivedControlSerials', page, limit],
    queryFn: fetchArchivedSerials,
    staleTime: 2 * 60 * 1000,
    cacheTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    keepPreviousData: true,
    retry: false,
    onError: (err) => {
      toast.error(err?.response?.data?.error || err?.response?.data?.message || "Failed to load archived serials");
    },
  });

  // Transform data
  const serialsData = (serialsResponse?.data || []).map(serial => ({
    id: serial.id,
    poNumber: serial.poNumber || 'N/A',
    serialNumber: serial.serialNumber,
    ItemCode: serial.product?.ItemCode || 'N/A',
    itemName: serial.product?.EnglishName || 'N/A',
    gtin: serial.product?.GTIN || 'N/A',
    upper: serial.product?.upper || 'N/A',
    sole: serial.product?.sole || 'N/A',
    width: serial.product?.width || 'N/A',
    color: serial.product?.color || 'N/A',
    product: serial.product,
    supplierName: serial.supplier?.name || 'N/A',
    supplierEmail: serial.supplier?.email || 'N/A',
  }));

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Filter serials (client-side search)
  const filteredSerials = serialsData.filter(serial => 
    serial.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    serial.itemName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    serial.ItemCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    serial.poNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    serial.supplierName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination info from API
  const pagination = serialsResponse?.pagination;
  const totalPages = pagination?.totalPages || 0;
  const currentPage = pagination?.page || 1;
  const totalItems = pagination?.total || 0;
  const hasNextPage = pagination?.hasNextPage || false;
  const hasPrevPage = pagination?.hasPrevPage || false;

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
      setSearchTerm('');
    }
  };

  const handleLimitChange = (newLimit) => {
    setLimit(newLimit);
    setPage(1);
    setSearchTerm('');
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

  // Calculate display range
  const startIndex = (currentPage - 1) * limit + 1;
  const endIndex = Math.min(currentPage * limit, totalItems);

  return (
    <SideNav>
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="mx-auto">
          <div className="bg-white rounded-lg shadow-sm">
            {/* Header Section */}
            <div className="px-6 py-4 flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
              <div>
                <h3 className="font-bold text-gray-900 text-lg mb-1">Archived Controlled Serials</h3>
                <p className="text-sm text-gray-500">
                  Total {totalItems} archived serials
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                <input
                  type="text"
                  placeholder="Search by serial number, item name, PO..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm flex-1 sm:w-96 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
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
              Archived records
            </div>

            {/* Loading Overlay */}
            {isLoading && (
              <div className="flex items-center justify-center h-64">
                <CircularProgress />
              </div>
            )}

            {!isLoading && (
              <>
                {/* Fixed height table container with scroll */}
                <div className="overflow-x-auto" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                  <table className="w-full">
                    <thead className="bg-gray-50 border-y border-gray-200 sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider bg-gray-50">PO Number</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider bg-gray-50">Supplier Name</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider bg-gray-50">Serial Number</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider bg-gray-50">Item Code</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider bg-gray-50">Item Name</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider bg-gray-50">GTIN</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider bg-gray-50">Width</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider bg-gray-50">Color</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider bg-gray-50">QR Code</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {filteredSerials.length === 0 ? (
                        <tr>
                          <td colSpan="9" className="px-4 py-8 text-center text-gray-500">
                            {searchTerm ? 'No archived serials found matching your search' : 'No archived serials found'}
                          </td>
                        </tr>
                      ) : (
                        filteredSerials.map((serial, idx) => (
                          <tr 
                            key={serial.id || idx} 
                            className="hover:bg-gray-50 transition-colors"
                          >
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                {serial.poNumber || 'N/A'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 font-medium">{serial.supplierName || 'N/A'}</td>
                            <td className="px-4 py-3 text-sm text-gray-900 font-medium">{serial.serialNumber || 'N/A'}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{serial.ItemCode || 'N/A'}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{serial.itemName || 'N/A'}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{serial.gtin || 'N/A'}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{serial.width || 'N/A'}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{serial.color || ''}</td>
                            <td className="px-4 py-3">
                              {serial.serialNumber && (
                                <QRCodeSVG value={serial.serialNumber} size={32} />
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {totalItems > 0 && (
                  <div className="px-4 py-3 border-t border-gray-200">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="text-sm text-gray-600">
                          Showing {startIndex} to {endIndex} of {totalItems} entries
                        </div>
                        <div className="flex items-center gap-2">
                          <label htmlFor="limit" className="text-sm text-gray-600">Show:</label>
                          <select
                            id="limit"
                            value={limit}
                            onChange={(e) => handleLimitChange(Number(e.target.value))}
                            className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-gray-500"
                          >
                            <option value={10}>10</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 justify-center">
                        <button
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={!hasPrevPage || isLoading || isFetching}
                          className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                          Previous
                        </button>
                        {getPageNumbers().map((pageNum, idx) => (
                          pageNum === '...' ? (
                            <span key={idx} className="px-3 py-1">...</span>
                          ) : (
                            <button
                              key={idx}
                              onClick={() => handlePageChange(pageNum)}
                              disabled={isLoading || isFetching}
                              className={`px-3 py-1 border rounded text-sm ${
                                currentPage === pageNum
                                  ? 'bg-secondary text-white border-secondary hover:bg-secondary'
                                  : 'border-gray-300 hover:bg-gray-50'
                              } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                              {pageNum}
                            </button>
                          )
                        ))}
                        <button
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={!hasNextPage || isLoading || isFetching}
                          className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </SideNav>
  );
};

export default ArchivedPO;