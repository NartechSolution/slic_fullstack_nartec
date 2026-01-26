import React, { useState } from 'react';
import { IoIosArrowBack } from "react-icons/io";
import { useQuery } from 'react-query';
import { toast } from 'react-toastify';
// import AddControlSerialPopup from './AddControlSerialPopup';
import { useLocation, useNavigate } from 'react-router-dom';
import SideNav from '../../../components/Sidebar/SideNav';
import newRequest from '../../../utils/userRequest';
import { Button, CircularProgress } from '@mui/material';
import { HiRefresh } from 'react-icons/hi';
import { IoSend } from "react-icons/io5";
import { FaCheckCircle, FaTimesCircle, FaEye } from "react-icons/fa";
import Swal from "sweetalert2";

const PoNumberTable = () => {
    const navigate = useNavigate();
    const location = useLocation();
    // const [isAddPopupVisible, setIsAddPopupVisible] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedPO, setSelectedPO] = useState(null);
    const [sendingPO, setSendingPO] = useState(false);
    const itemsPerPage = 10;

    const rowData = location.state?.rowData;

    // Fetch PO Numbers
    const fetchPoNumbers = async () => {
        const response = await newRequest.get(`/controlSerials/po-numbers-with-total-qty`);
        return response?.data?.data || [];
    };

    const {
        data: poList = [],
        isLoading,
        refetch,
    } = useQuery({
        queryKey: ['poNumbersWithQty'],
        queryFn: fetchPoNumbers,
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
        retry: false,
        onError: (err) => {
            toast.error(err?.response?.data?.message || err?.response?.data?.error || "NO PO available yet");
        },
    });

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await refetch();
        setTimeout(() => setIsRefreshing(false), 500);
    };

    const handleNavigateToDigitalLinks = (poData) => {
        navigate(`/controlled-serials/${poData.poNumber}`, {
            state: {
                rowData: rowData,
                poData: poData
            }
        });
    };

    const handleSendByPO = async () => {
        if (!selectedPO) {
            toast.error("Please select a PO first");
            return;
        }

        const poNumber = selectedPO.poNumber;
        // const size = rowData?.ProductSize;

        if (!poNumber) {
            toast.error("PO Number is required");
            return;
        }

        // Show confirmation dialog
        const result = await Swal.fire({
            title: 'Confirm Action',
            text: `Are you sure you want to send control serials for PO: ${poNumber}?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#1D2F90',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, send it!',
            cancelButtonText: 'Cancel'
        });

        if (!result.isConfirmed) {
            return;
        }

        setSendingPO(true);

        try {
            const response = await newRequest.post("/controlSerials/send-by-po", {
                poNumber: poNumber,
                // size: size,
            });

            // Success notification
            toast.success(response?.data?.message || "Control serials sent successfully");
            
            // Show success Swal
            await Swal.fire({
                title: 'Success!',
                text: response?.data?.message || 'Control serials have been sent successfully.',
                icon: 'success',
                confirmButtonColor: '#1D2F90'
            });

            // Refresh the orders list
            await refetch();
            setSelectedPO(null);
            
        } catch (err) {
            const errorMessage = err?.response?.data?.message || "Error sending control serials";
            
            // Show error Swal
            await Swal.fire({
                title: 'Error!',
                text: errorMessage,
                icon: 'error',
                confirmButtonColor: '#1D2F90'
            });
        } finally {
            setSendingPO(false);
        }
    };
    
    const filteredPOs = poList.filter(po =>
        po.poNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        po.supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        po.product.ItemCode?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Pagination
    const totalPages = Math.ceil(filteredPOs.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentPOs = filteredPOs.slice(startIndex, endIndex);

    const handlePageChange = (page) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
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

    // Get sent to supplier badge
    const getSentToSupplierBadge = (isSent) => {
        if (isSent === true) {
        return (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <FaCheckCircle className="text-green-600" />
            Sent
            </span>
        );
        } else {
        return (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <FaTimesCircle className="text-red-600" />
            Not Sent
            </span>
        );
        }
    };

    return (
        <div>
            <SideNav>
                <div className="bg-white border-b">
                    <div className="flex items-center gap-3 px-6 py-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 transition-colors"
                            aria-label="Go back"
                        >
                            <IoIosArrowBack className="w-5 h-5 text-gray-700" />
                        </button>
                         <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-orange-500 rounded flex items-center justify-center">
                                <div className="grid grid-cols-2 gap-0.5">
                                <div className="w-1.5 h-1.5 bg-white rounded-sm"></div>
                                <div className="w-1.5 h-1.5 bg-white rounded-sm"></div>
                                <div className="w-1.5 h-1.5 bg-white rounded-sm"></div>
                                <div className="w-1.5 h-1.5 bg-white rounded-sm"></div>
                                </div>
                            </div>
                            <h1 className="text-lg font-medium text-gray-800">
                                PO Numbers
                            </h1>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-gray-50 min-h-screen">
                    <div className="max-w-7xl mx-auto space-y-6">
                        {/* PO Table Section */}
                        <div className="bg-white rounded-lg shadow-sm">
                            <div className="px-6 py-4 flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 border-b border-gray-200">
                                <div>
                                    <h3 className="font-bold text-gray-900 text-lg mb-1">PO Numbers List</h3>
                                    <p className="text-sm text-gray-500">
                                        Total {filteredPOs.length} PO Numbers
                                    </p>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                                    <input
                                        type="text"
                                        placeholder="Search PO or Supplier..."
                                        value={searchTerm}
                                        onChange={(e) => {
                                            setSearchTerm(e.target.value);
                                            setCurrentPage(1);
                                        }}
                                        className="px-4 py-2 border border-gray-300 rounded-md text-sm flex-1 sm:w-80 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <Button 
                                        onClick={handleSendByPO}
                                        variant="contained"
                                        disabled={!selectedPO || sendingPO}
                                        sx={{
                                            backgroundColor: '#1D2F90',
                                            '&:hover': {
                                                backgroundColor: '#162561',
                                            },
                                            '&:disabled': {
                                                backgroundColor: '#ccc',
                                            },
                                        }}
                                        startIcon={
                                            sendingPO ? (
                                                <CircularProgress size={20} color="inherit" />
                                            ) : (
                                                <IoSend className="text-lg" />
                                            )
                                        }
                                    >
                                        {sendingPO ? "Sending..." : "Send Supplier"}
                                    </Button>
                                    {/* <Button 
                                        onClick={() => setIsAddPopupVisible(true)}
                                        variant="contained"
                                        sx={{
                                            backgroundColor: '#008000',
                                            '&:hover': {
                                            backgroundColor: '#006600',
                                          },
                                          '&:disabled': {
                                            backgroundColor: '#ccc',
                                          },
                                        }}
                                        endIcon={<FiPlus className="w-4 h-4" />}
                                      >
                                        Add Serial
                                    </Button> */}
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
                            
                            {/* Loading Overlay */}
                            {isLoading && (
                                <div className="flex items-center justify-center h-64">
                                <CircularProgress className="w-12 h-12 animate-spin text-blue-600" />
                                </div>
                            )}

                            {/* Table */}
                            {!isLoading && (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PO Number</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Qty</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Code</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sent To Supplier</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {currentPOs.length === 0 ? (
                                            <tr>
                                                <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                                                    No POs found.
                                                </td>
                                            </tr>
                                        ) : (
                                            currentPOs.map((po) => (
                                                <tr
                                                    key={po.id}
                                                    onClick={() => setSelectedPO(po)}
                                                    className={`cursor-pointer transition-colors ${
                                                        selectedPO?.id === po.id 
                                                            ? 'bg-blue-100 border-l-4 border-l-blue-600' 
                                                            : 'hover:bg-blue-50'
                                                    }`}
                                                >
                                                    <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                                        {po.poNumber}
                                                    </td>
                                                    <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                                                        {po.totalQty}
                                                    </td>
                                                    <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                                                        {po.product?.ItemCode || "N/A"}
                                                    </td>
                                                    <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                                                        {po.supplier?.name || "N/A"}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {getSentToSupplierBadge(po.isSentToSupplier)}
                                                    </td>
                                                    <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                                                        {new Date(po.createdAt).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleNavigateToDigitalLinks(po);
                                                            }}
                                                            className="text-blue-600 hover:text-blue-800 p-2 rounded-full hover:bg-blue-50 transition-colors"
                                                            title="View"
                                                        >
                                                            <FaEye className="w-5 h-5" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            )}

                            {/* Enhanced Pagination */}
                            <div className="px-4 py-3 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="text-sm text-gray-600">
                                    Showing {startIndex + 1} to {Math.min(endIndex, filteredPOs.length)} of {filteredPOs.length} entries
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
                        </div>
                    </div>
                </div>

                {/* Add Control Serial Popup */}
                {/* <AddControlSerialPopup
                    isVisible={isAddPopupVisible}
                    setVisibility={setIsAddPopupVisible}
                    itemCode={rowData?.ItemCode}
                    size={rowData?.ProductSize}
                    refreshData={refetch}
                /> */}
            </SideNav>
        </div>
    );
};

export default PoNumberTable;