import React, { useState } from 'react';
import { IoIosArrowBack } from "react-icons/io";
import { useQuery } from 'react-query';
import { toast } from 'react-toastify';
import ProductCard from './ProductCard';
import CodesSection from './CodesSection';
import DigitalLinkTable from './DigitalLinkTable';
import PurchaseOrderTable from './PurchaseOrderTable';
import AddControlSerialPopup from './AddControlSerialPopup';
import { useLocation, useNavigate } from 'react-router-dom';
import SideNav from '../../../components/Sidebar/SideNav';
import imageLiveUrl from '../../../utils/urlConverter/imageLiveUrl';
import newRequest from '../../../utils/userRequest';

const DigitalLinks = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAddPopupVisible, setIsAddPopupVisible] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const rowData = location.state?.rowData;

  const productDetails = [
    { label: "Item Code", value: rowData?.ItemCode || "N/A" },
    { label: "English Name", value: rowData?.EnglishName || "N/A" },
    { label: "Arabic Name", value: rowData?.ArabicName || "N/A" },
    { label: "GTIN", value: rowData?.GTIN || "N/A" },
    { label: "Unit", value: rowData?.ProductUnit || "N/A" },
    { label: "Size", value: rowData?.ProductSize || "N/A" },
  ];

  // Fetch Purchase Orders
  const fetchPurchaseOrders = async () => {
    const response = await newRequest.get(`/controlSerials/po-numbers?itemCode=${rowData?.ItemCode}`);
    return response?.data?.data || [];
  };

  const { 
    data: purchaseOrders = [], 
    isLoading: isLoadingOrders, 
    refetch: refetchOrders,
  } = useQuery({
    queryKey: ['purchaseOrders', rowData?.ItemCode, rowData?.ProductSize],
    queryFn: fetchPurchaseOrders,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    retry: false,
    onError: (err) => {
      toast.error(err?.response?.data?.error || err?.response?.data?.message || "Failed to load purchase orders");
    },
  });

  // Fetch ALL Control Serials ONCE - Frontend pagination
  const fetchAllControlSerials = async ({ queryKey }) => {
    const [_key, poNumber] = queryKey;
    
    const response = await newRequest.get(
      `/controlSerials?page=1&limit=999999&poNumber=${poNumber}&itemCode=${rowData?.ItemCode}&isArchived=false`
    );
    
    return response?.data?.data?.controlSerials || [];
  };

  const { 
    data: allSerials = [],
    isLoading, 
    refetch,
    isFetching 
  } = useQuery({
    queryKey: ['allControlSerials', selectedPO?.poNumber],
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

  // Transform purchase orders data
  const ordersData = purchaseOrders.map(order => ({
    id: order.supplier?.id || order.poNumber,
    poNumber: order.poNumber,
    ItemCode: order.product?.ItemCode || 'N/A',
    ProductSize: order.product?.ProductSize || 'N/A',
    size: order?.size || 'N/A',
    totalCount: order.totalCount || '',
    supplierStatus: order.supplier?.status || 'N/A',
    isSentToSupplier: order.isSentToSupplier || 'N/A',
    createdAt: order?.createdAt ? new Date(order?.createdAt).toLocaleString() : 'N/A',
    updatedAt: order?.updatedAt ? new Date(order?.updatedAt).toLocaleString() : 'N/A'
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Product Card */}
              <div>
                <ProductCard
                  imageUrl={imageLiveUrl(rowData?.image)}
                  productCode={rowData?.ProductSize || "N/A"}
                  GTIN={rowData?.GTIN || "N/A"}
                  label={rowData?.label || "Product Name"}
                  upper={rowData?.upper || "Product Subtitle"}
                  details={productDetails}
                />
              </div>

              {/* Right Column - QR Code and Barcode Stacked */}
              <div>
                <CodesSection gtin={rowData?.GTIN || ""} />
              </div>
            </div>

            {/* Purchase Orders Section */}
            <div className="bg-white rounded-lg shadow-sm">
              <PurchaseOrderTable 
                orders={ordersData}
                isLoading={isLoadingOrders}
                refetchOrders={refetchOrders}
                onViewOrder={handleViewOrder}
                selectedOrderId={selectedPO?.id}
                size={rowData?.ProductSize}
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
                itemCode={rowData?.ItemCode}
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
      </SideNav>
    </div>
  );
};

export default DigitalLinks;