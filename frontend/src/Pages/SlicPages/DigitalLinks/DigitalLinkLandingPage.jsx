import React from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "react-query";
import newRequest from "../../../utils/userRequest";
import { CircularProgress } from "@mui/material";
import imageLiveUrl from "../../../utils/urlConverter/imageLiveUrl";
import { 
  MdQrCodeScanner, 
  MdInventory2, 
  MdTimeline, 
  MdCategory, 
  MdShoppingCart,
  MdImage,
  MdInfoOutline
} from "react-icons/md";
import { useTranslation } from "react-i18next";
import SideNav from "../../../components/Sidebar/SideNav";
import { toast } from "react-toastify";

const DigitalLinkLandingPage = () => {
  // Always call useTranslation at the very top
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const gtin = searchParams.get("gtin");
  const id = gtin;

  // Fetch product data using react-query for stable data management
  const { data: pageData, isLoading, isError } = useQuery({
    queryKey: ["digitalLinkData", id],
    queryFn: async () => {
      if (!id) return null;
      try {
        const response = await newRequest.get(`/digital-link/${id}`);
        return response?.data?.data || null;
      } catch (err) {
        toast.error(err?.response?.data?.error || "Something Went Wrong!")
        console.error("Fetch error:", err);
        throw err;
      }
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white">
        <CircularProgress size={60} sx={{ color: '#0a192f' }} />
        <p className="mt-4 text-[#0a192f] font-medium animate-pulse text-lg">{t("Loading Supply Chain Data...")}</p>
      </div>
    );
  }

  if (isError || !pageData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6 text-center">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
          <MdQrCodeScanner className="text-4xl text-red-600" />
        </div>
        <h1 className="text-3xl font-bold text-[#0a192f] mb-2">{t("Product Not Found")}</h1>
        <p className="text-gray-600 max-w-md">{t("We couldn't retrieve the information for the scanned link")} (ID: {id}). {t("Please ensure the code is correct.")}</p>
        <button 
          onClick={() => window.history.back()}
          className="mt-8 px-6 py-2 bg-[#0a192f] text-white rounded-lg hover:bg-[#162a4a] transition-all"
        >
          {t("Go Back")}
        </button>
      </div>
    );
  }

  const { product, stats, timeline, po, isProductLevel, suppliers, salesHistory } = pageData;

  const isInternal = !!localStorage.getItem("token");

  const DashboardContent = (
    <div className={`min-h-screen bg-white font-sans relative overflow-x-hidden selection:bg-blue-100 ${isInternal ? 'pb-20' : ''}`}>
      {/* Background Pattern */}
      <div className="fixed inset-0 pointer-events-none z-0" 
           style={{ 
             backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(10, 25, 47, 0.05) 1px, transparent 1px)', 
             backgroundSize: '20px 20px' 
           }}>
      </div>
      
      <div className={`container mx-auto px-4 py-8 relative z-10 ${isInternal ? 'max-w-6xl' : 'max-w-5xl'}`}>
        {/* Header */}
        <header className="bg-primary text-secondary rounded-2xl p-6 md:p-8 mb-8 shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-4">
              <MdQrCodeScanner className="text-secondary" />
              {t("SLIC Digital Link")}
            </h1>
            <p className="mt-2 text-sm md:text-base tracking-wide text-secondary">
              {t("Product Information & Supply Chain Tracking System")}
            </p>
          </div>
          <div className="bg-white/10 px-4 py-2 rounded-lg backdrop-blur-sm border border-white/10 hidden md:block">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-300">{t("System Status")}:</span>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">{isProductLevel ? t("Verified Product Line") : t("Verified Unique Serial")}</span>
            </div>
          </div>
        </header>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Product Information Card */}
          <div className="bg-white border-2 border-blue-50 rounded-2xl p-6 md:p-8 shadow-lg hover:shadow-xl duration-300 group">
            <h2 className="text-2xl font-bold text-[#0a192f] mb-6 flex items-center gap-3 pb-4 border-b-2 border-blue-50">
              <MdInventory2 className="text-secondary" />
              {t("Product Identity")}
            </h2>
            
            <div className="w-full aspect-video bg-gray-50 border-2 border-blue-50 rounded-xl flex items-center justify-center mb-8 relative overflow-hidden group-hover:border-blue-200 transition-colors">
              {product?.image ? (
                <img 
                  src={imageLiveUrl(product.image)} 
                  alt={product.englishName} 
                  className="w-full h-full object-contain p-4 transition-transform duration-500 group-hover:scale-105" 
                />
              ) : (
                <div className="flex flex-col items-center text-gray-400 gap-2">
                  <MdImage className="text-7xl" />
                  <span className="text-sm uppercase font-bold">{t("No Image Available")}</span>
                </div>
              )}
            </div>
            
            <div className="space-y-4">
              <DetailRow label={t("Item Name")} value={product?.englishName} />
              <DetailRow label={t("Item Code")} value={product?.itemCode} />
              <DetailRow label={t("Size")} value={product?.size} />
              <DetailRow label={t("Arabic Name")} value={product?.arabicName || product?.ArabicName} />
            </div>
            
            <div className="mt-8 space-y-4">
              <div className="bg-gray-50 border-2 border-blue-50 rounded-xl p-5 hover:border-blue-100 transition-colors shadow-inner">
                <div className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-1">{t("GTIN (Global Trade Item Number)")}</div>
                <div className="text-xl font-mono font-bold text-[#0a192f] tracking-wider">{product?.gtin || "---"}</div>
              </div>
              
              {!isProductLevel && pageData.serialNumber && (
                <div className="bg-blue-50 border-2 border-blue-100 rounded-xl p-5 shadow-inner">
                  <div className="text-xs text-secondary font-bold uppercase tracking-widest mb-1 flex items-center gap-2">
                    <MdInfoOutline /> {t("Unique Serial Number")}
                  </div>
                  <div className="text-xl font-mono font-bold text-blue-900 tracking-wider">
                    {pageData.serialNumber}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Timeline & Stats Card */}
          <div className="bg-white border-2 border-blue-50 rounded-2xl p-6 md:p-8 shadow-lg hover:shadow-xl duration-300">
            <h2 className="text-2xl font-bold text-[#0a192f] mb-6 flex items-center gap-3 pb-4 border-b-2 border-blue-50">
              <MdTimeline className="text-secondary" />
              {t("Supply Chain History")}
            </h2>
            
            {/* Quick Stats Banner */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
              <StatBox label={t("Total Produced")} value={stats?.totalSerials || 0} />
              <StatBox label={t("Merged to FG")} value={stats?.totalMerged || 0} />
              <StatBox label={t("Total Sold")} value={stats?.totalSoldQty || 0} />
              <StatBox label={t("POs Linked")} value={po?.masterCount || po?.poNumbers?.length || 1} />
            </div>

            <h3 className="text-lg font-bold text-[#0a192f] mb-6">{t("Traceability Timeline")}</h3>
            
            {Array.isArray(timeline) && timeline.length > 0 ? (
              <div className="relative pl-8 space-y-8 before:content-[''] before:absolute before:left-[11px] before:top-0 before:bottom-0 before:w-0.5 before:bg-[#0a192f]/20">
                {timeline.map((event, index) => (
                  <TimelineItem 
                    key={index}
                    date={new Date(event.occurredAt).toLocaleDateString()}
                    time={new Date(event.occurredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    title={event.title}
                    description={event.description}
                    isLast={index === timeline.length - 1} // visual marker for most recent
                  />
                )).reverse()} {/* Show most recent at top */}
              </div>
            ) : (
              <div className="text-center py-10 text-gray-500 border-2 border-dashed border-gray-200 rounded-xl">
                {t("Primary data recording in progress...")}
              </div>
            )}
          </div>
        </div>
        
        {/* Secondary Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Raw Materials Section */}
          <div className="bg-white border-2 border-blue-50 rounded-2xl p-6 md:p-8 shadow-lg hover:shadow-xl duration-300">
            <h2 className="text-2xl font-bold text-[#0a192f] mb-6 flex items-center gap-3 pb-4 border-b-2 border-blue-50">
              <MdCategory className="text-secondary" />
              {t("Material Composition")}
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <MaterialCard name={t("Upper Component")} value={product?.upper || "N/A"} />
              <MaterialCard name={t("Sole Component")} value={product?.sole || "N/A"} />
              <MaterialCard name={t("Color Attribute")} value={product?.color || "N/A"} />
              <MaterialCard name={t("Packaging Type")} value={product?.packagingType || "N/A"} />
            </div>
          </div>
          
          {/* Vendor & Sales Info */}
          <div className="bg-white border-2 border-blue-50 rounded-2xl p-6 md:p-8 shadow-lg hover:shadow-xl duration-300">
            <h2 className="text-2xl font-bold text-[#0a192f] mb-6 flex items-center gap-3 pb-4 border-b-2 border-blue-50">
              <MdShoppingCart className="text-secondary" />
              {t("Sourcing & Distribution")}
            </h2>
            
            <div className="space-y-4">
              {suppliers && suppliers.length > 0 && (
                <DetailRow 
                  label={t("Primary Supplier")} 
                  value={suppliers[0].name || suppliers[0].email} 
                />
              )}
              {po?.mostRecentPO && (
                 <DetailRow label={t("Latest Purchase Order")} value={po.mostRecentPO} />
              )}
              {salesHistory && salesHistory.length > 0 && (
                <>
                  <div className="mt-6 pt-4 border-t-2 border-dashed border-gray-200">
                    <h4 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">{t("Latest Retail Sale")}</h4>
                    <div className="bg-green-50 rounded-lg p-4 border border-green-100 flex justify-between items-center">
                      <div>
                        <div className="text-sm font-mono text-green-800">INV: {salesHistory[0].invoiceNo}</div>
                        <div className="text-xs text-green-600 mt-1">{t("Store Location")}: {salesHistory[0].location}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-700">SAR {salesHistory[0].unitPrice}</div>
                        <div className="text-[10px] text-green-600 mt-1 uppercase font-bold tracking-wider">{t("Verified Unit")}</div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {!isInternal && (
          <footer className="mt-16 text-center text-gray-400 text-sm border-t border-gray-200 pt-8 pb-4">
            <p>© {new Date().getFullYear()} SLIC. {t("All rights reserved.")}</p>
            <div className="mt-2 text-[10px] font-black uppercase tracking-[0.2em]">{t("Authenticity Guaranteed By SLIC Traceability")}</div>
          </footer>
        )}
      </div>
    </div>
  );

  return isInternal ? (
    <SideNav>{DashboardContent}</SideNav>
  ) : (
    DashboardContent
  );
};

// --- Helper Components ---

const DetailRow = ({ label, value }) => (
  <div className="flex justify-between items-center py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 px-2 rounded-lg transition-colors">
    <span className="text-xs font-black text-gray-400 uppercase tracking-widest leading-none">{label}</span>
    <span className="text-sm font-bold text-[#0a192f] text-right truncate max-w-[60%] leading-none">{value || "---"}</span>
  </div>
);

const TimelineItem = ({ date, time, title, description, isLast }) => (
  <div className="relative group">
    <div className={`absolute -left-[27px] top-[4px] w-[18px] h-[18px] rounded-full border-4 border-white z-10 transition-all duration-300
      ${isLast ? 'bg-secondary ring-4 ring-blue-50 shadow-md' : 'bg-gray-300'}`}>
    </div>
    <div className="bg-gray-50 hover:bg-white hover:shadow-xl p-4 rounded-2xl border border-transparent hover:border-blue-100 transition-all duration-300 shadow-sm">
      <div className="flex justify-between items-start mb-1">
        <div className={`text-md font-bold ${isLast ? 'text-blue-700' : 'text-[#0a192f]'}`}>{title}</div>
        <div className="text-right">
          <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{date}</div>
          <div className="text-[10px] text-gray-400 font-bold">{time}</div>
        </div>
      </div>
      <p className="text-xs text-gray-600 leading-relaxed">{description}</p>
    </div>
  </div>
);

const MaterialCard = ({ name, value }) => (
  <div className="bg-gray-50 border-2 border-transparent p-4 rounded-2xl hover:bg-white hover:border-blue-100 hover:shadow-xl transition-all duration-300">
    <div className="text-[10px] text-gray-400 uppercase tracking-widest mb-2 font-black">{name}</div>
    <div className="text-xs font-bold text-[#0a192f]">
      {value}
    </div>
  </div>
);

const StatBox = ({ label, value }) => (
  <div className="bg-white rounded-2xl p-4 text-center border border-gray-50 shadow-sm flex flex-col items-center">
    <div className="w-6 h-1 bg-blue-100 rounded-full mb-3"></div>
    <div className="text-xl font-black text-[#0a192f] leading-none mb-1">{value}</div>
    <div className="text-[8px] font-black text-gray-400 uppercase tracking-[0.1em]">{label}</div>
  </div>
);

export default DigitalLinkLandingPage;
