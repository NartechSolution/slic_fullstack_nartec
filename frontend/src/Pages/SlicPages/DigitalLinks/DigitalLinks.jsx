import React, { useState } from 'react';
import { IoIosArrowBack } from "react-icons/io";
import { useQuery } from 'react-query';
import { toast } from 'react-toastify';
import DigitalLinkTable from './DigitalLinkTable';
import PurchaseOrderTable from './PurchaseOrderTable';
import AddControlSerialPopup from './AddControlSerialPopup';
import UpdateControlSerialPopup from './UpdateControlSerialPopup';
import { useLocation, useNavigate } from 'react-router-dom';
import SideNav from '../../../components/Sidebar/SideNav';
import newRequest from '../../../utils/userRequest';

const DigitalLinks = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAddPopupVisible, setIsAddPopupVisible] = useState(false);
  const [isUpdatePopupVisible, setIsUpdatePopupVisible] = useState(false);
  const [selectedSerialForUpdate, setSelectedSerialForUpdate] = useState(null);
  const [selectedPO, setSelectedPO] = useState(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const rowData = location.state?.rowData;
  const poData = location.state.poData;

  const fetchPurchaseOrders = async () => {
    const response = await newRequest.get(`/controlSerials/po-details?poNumber=${poData?.poNumber}`);
    return response?.data?.data?.sizeSummary || [];
  };

  const { 
    data: purchaseOrders = [], 
    isLoading: isLoadingOrders, 
    refetch: refetchOrders,
  } = useQuery({
    queryKey: ['purchaseOrders', poData?.poNumber],
    queryFn: fetchPurchaseOrders,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    retry: false,
    onError: (err) => {
      toast.error(err?.response?.data?.message || err?.response?.data?.error || "Failed to load purchase orders");
    },
  });

  const fetchAllControlSerials = async ({ queryKey }) => {
    const [_key, poNumber, size, ItemCode] = queryKey;
    
    const response = await newRequest.get(
      `/controlSerials?page=1&limit=999999&poNumber=${poNumber}&size=${size}&itemCode=${ItemCode}&isArchived=false`
    );
    
    return response?.data?.data?.controlSerials || [];
  };

  const { 
    data: allSerials = [],
    isLoading, 
    refetch,
    isFetching 
  } = useQuery({
    queryKey: ['allControlSerials', selectedPO?.poNumber, selectedPO?.size, selectedPO?.ItemCode],
    queryFn: fetchAllControlSerials,
    enabled: !!selectedPO?.poNumber,
    staleTime: 2 * 60 * 1000,
    cacheTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
    onError: (err) => {
      toast.error(err?.response?.data?.error || err?.response?.data?.message || "Failed to load control serials");
    },
  });

  // Handle PO row click
  const handleViewOrder = (order) => {
    setSelectedPO(order);
    setPage(1);
  };

  const handleUpdateSerial = (serialData) => {
    setSelectedSerialForUpdate(serialData);
    setIsUpdatePopupVisible(true);
  };

  const allSerialsData = allSerials.map(serial => ({
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
    status: 'Available',
    product: serial.product,
    supplierName: serial.supplier?.name || 'N/A',
    supplierEmail: serial.supplier?.email || 'N/A',
  }));

  // Calculate pagination on frontend
  const totalItems = allSerialsData.length;
  const totalPages = Math.ceil(totalItems / limit);
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const currentPageSerials = allSerialsData.slice(startIndex, endIndex);

  const paginationData = {
    page: page,
    limit: limit,
    total: totalItems,
    totalPages: totalPages
  };

  // Transform purchase orders data (now records)
  const ordersData = purchaseOrders.map(record => ({
    id: record.id,
    poNumber: record.poNumber,
    qty: record.qty,
    ItemCode: record.product?.ItemCode || 'N/A',
    ProductSize: record.product?.ProductSize || 'N/A',
    size: record.size || 'N/A',
    isSentToSupplier: record.isSentToSupplier,
    supplierName: record.supplier?.name || 'N/A', // Added
    createdAt: record.createdAt ? new Date(record.createdAt).toLocaleString() : 'N/A',
    updatedAt: record.updatedAt ? new Date(record.updatedAt).toLocaleString() : 'N/A'
  }));

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
                Digital Product Link
              </h1>
            </div>
          </div>
        </div>

        <div className="p-6 bg-gray-50 min-h-screen">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Purchase Orders Section */}
            <div className="bg-white rounded-lg shadow-sm">
              <PurchaseOrderTable 
                orders={ordersData}
                isLoading={isLoadingOrders}
                refetchOrders={refetchOrders}
                onViewOrder={handleViewOrder}
                onUpdateSerial={handleUpdateSerial}
                selectedOrderId={selectedPO?.id}
              />
            </div>

            {/* Controlled Serials Section */}
            <div className="bg-white rounded-lg shadow-sm">
              {selectedPO && (
                <div className="px-6 py-3 bg-blue-50 border-b border-blue-100">
                  <p className="text-sm text-blue-800">
                    <span className="font-semibold">Selected PO:</span> {selectedPO.poNumber}
                    {selectedPO.supplierName && <span className="ml-3"><span className="font-semibold">Supplier:</span> {selectedPO.supplierName}</span>}
                  </p>
                </div>
              )}
              <DigitalLinkTable 
                serials={selectedPO ? currentPageSerials : []}
                allSerials={allSerialsData}
                isLoading={isLoading || isFetching}
                refetchSerials={refetch}
                itemCode={selectedPO?.ItemCode}
                onAddSerial={() => setIsAddPopupVisible(true)}
                pagination={paginationData}
                onPageChange={setPage}
                onLimitChange={setLimit}
              />
            </div>
          </div>
        </div>

        {/* Add Control Serial Popup */}
        <AddControlSerialPopup
          isVisible={isAddPopupVisible}
          setVisibility={setIsAddPopupVisible}
          // refreshData={refetch}
          itemCode={rowData?.ItemCode}
          size={rowData?.ProductSize}
        />

        {/* Update Control Serial Popup */}
        <UpdateControlSerialPopup
          isVisible={isUpdatePopupVisible}
          setVisibility={setIsUpdatePopupVisible}
          refreshData={refetchOrders}
          data={selectedSerialForUpdate}
        />
      </SideNav>
    </div>
  );
};

export default DigitalLinks;