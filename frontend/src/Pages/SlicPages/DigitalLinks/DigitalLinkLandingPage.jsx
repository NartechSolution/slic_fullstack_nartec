import { useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "react-query";
import newRequest from "../../../utils/userRequest";
import { CircularProgress } from "@mui/material";
import imageLiveUrl from "../../../utils/urlConverter/imageLiveUrl";
import { 
  MdQrCodeScanner, 
  MdInventory2, 
  MdDescription, 
  MdTimeline, 
  MdCategory, 
  MdShoppingCart,
  MdImage
} from "react-icons/md";

const DigitalLinkLandingPage = () => {
  const { id: pathId } = useParams();
  const [searchParams] = useSearchParams();
  const queryId = searchParams.get("id");
  const id = pathId || queryId;

  // DUMMY DATA FOR DEMO
  const dummyProduct = {
    EnglishName: "Sports Shoes Premium",
    ArabicName: "حذاء رياضي ممتاز",
    ItemCode: "49188EH",
    GTIN: "6287898100409",
    ProductSize: "49",
    BatchNo: "B-2024-889",
    Description: "Premium sports shoes engineered for high performance and durability. Features leather and fabric upper with a high-grip rubber sole, providing maximum comfort for athletic activities.",
    upper: "Leather & Fabric",
    sole: "Rubber Performance",
    updatedAt: new Date().toISOString(),
    image: null
  };

  // Temporarily Using Dummy Data
  const product = dummyProduct;
  const isLoading = false;
  const isError = false;

  /*
  // Fetch product data using ID (Commented out for now)
  const { data: product, isLoading, isError } = useQuery({
    queryKey: ["productInfo", id],
    queryFn: async () => {
      try {
        const response = await newRequest.get(`/itemCodes/v1/itemCode/${id}`);
        return response?.data?.data || null;
      } catch (err) {
        // Fallback or handle error
        console.error("Fetch error:", err);
        return null;
      }
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
  */

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white">
        <CircularProgress size={60} sx={{ color: '#0a192f' }} />
        <p className="mt-4 text-secondary font-medium animate-pulse text-lg">Loading Product Information...</p>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6 text-center">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
          <MdQrCodeScanner className="text-4xl text-red-600" />
        </div>
        <h1 className="text-3xl font-bold text-[#0a192f] mb-2">Product Not Found</h1>
        <p className="text-gray-600 max-w-md">We couldn't retrieve the information for the scanned link (ID: {id}). Please ensure the code is correct.</p>
        <button 
          onClick={() => window.history.back()}
          className="mt-8 px-6 py-2 bg-[#0a192f] text-white rounded-lg hover:bg-[#162a4a] transition-all"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans relative overflow-x-hidden selection:bg-blue-100">
      {/* Background Pattern */}
      <div className="fixed inset-0 pointer-events-none z-0" 
           style={{ 
             backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(10, 25, 47, 0.05) 1px, transparent 1px)', 
             backgroundSize: '20px 20px' 
           }}>
      </div>
      
      <div className="container mx-auto max-w-7xl px-4 py-8 relative z-10">
        {/* Header */}
        <header className="bg-primary text-secondary rounded-2xl p-6 md:p-8 mb-8 shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-4">
              <MdQrCodeScanner className="text-secondary" />
              SLIC Digital Link
            </h1>
            <p className="mt-2 text-sm md:text-base tracking-wide">
              Product Information & Supply Chain Tracking System
            </p>
          </div>
          <div className="bg-white/10 px-4 py-2 rounded-lg backdrop-blur-sm border border-white/10 hidden md:block">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-300">System Status:</span>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">Verified Product</span>
            </div>
          </div>
        </header>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Product Information Card */}
          <div className="bg-white border-2 border-blue-50 rounded-2xl p-6 md:p-8 shadow-lg hover:shadow-xl duration-300 group">
            <h2 className="text-2xl font-bold text-[#0a192f] mb-6 flex items-center gap-3 pb-4 border-b-2 border-blue-50">
              <MdInventory2 className="text-blue-600" />
              Product Information
            </h2>
            
            <div className="w-full aspect-video bg-gray-50 border-2 border-blue-50 rounded-xl flex items-center justify-center mb-8 relative overflow-hidden group-hover:border-blue-200 transition-colors">
              {product.image ? (
                <img 
                  src={imageLiveUrl(product.image)} 
                  alt={product.EnglishName} 
                  className="w-full h-full object-contain p-4 transition-transform duration-500 group-hover:scale-105" 
                />
              ) : (
                <MdImage className="text-7xl text-gray-300" />
              )}
            </div>
            
            <div className="space-y-4">
              <DetailRow label="Item Name" value={product.EnglishName} />
              <DetailRow label="Item Code" value={product.ItemCode} />
              <DetailRow label="Size" value={product.ProductSize} />
              <DetailRow label="Arabic Name" value={product.ArabicName} />
            </div>
            
            <div className="mt-8 space-y-4">
              <div className="bg-gray-50 border-2 border-blue-50 rounded-xl p-5 hover:border-blue-100 transition-colors">
                <div className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-1">GTIN (Global Trade Item Number)</div>
                <div className="text-xl font-mono font-bold text-[#0a192f] tracking-wider">{product.GTIN}</div>
              </div>
              
              {product.BatchNo && (
                <div className="bg-gray-50 border-2 border-blue-50 rounded-xl p-5 hover:border-blue-100 transition-colors">
                  <div className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-1">Batch Number</div>
                  <div className="text-xl font-mono font-bold text-[#0a192f] tracking-wider">{product.BatchNo}</div>
                </div>
              )}
            </div>
          </div>
          
          {/* Product Description & Timeline Card */}
          <div className="bg-white border-2 border-blue-50 rounded-2xl p-6 md:p-8 shadow-lg hover:shadow-xl duration-300">
            <h2 className="text-2xl font-bold text-[#0a192f] mb-6 flex items-center gap-3 pb-4 border-b-2 border-blue-50">
              <MdDescription className="text-blue-600" />
              Product Description
            </h2>
            
            <p className="text-gray-600 leading-relaxed mb-10 text-lg">
              {product.Description || `This ${product.EnglishName} is part of the premium SLIC product line, manufactured with high-quality materials and stringent quality control. Engineered for durability and comfort, it meets all international safety and quality standards.`}
            </p>
            
            <h3 className="text-xl font-bold text-[#0a192f] mb-8 flex items-center gap-3">
              <MdTimeline className="text-blue-600" />
              Supply Chain Timeline
            </h3>
            
            <div className="relative pl-8 space-y-8 before:content-[''] before:absolute before:left-[11px] before:top-0 before:bottom-0 before:w-0.5 before:bg-[#0a192f]">
              <TimelineItem 
                date={new Date(product.updatedAt || Date.now()).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                title="Finished Good"
                description="Product completed and quality checked"
                isLast
              />
              <TimelineItem 
                date={calculateOffsetDate(product.updatedAt, -2)}
                title="Production Started"
                description="Manufacturing process initiated"
              />
              <TimelineItem 
                date={calculateOffsetDate(product.updatedAt, -5)}
                title="Raw Materials Received"
                description="Components arrived at production facility"
              />
              <TimelineItem 
                date={calculateOffsetDate(product.updatedAt, -10)}
                title="PO Received"
                description="Purchase Order confirmed and processed"
              />
            </div>
          </div>
        </div>
        
        {/* Secondary Info Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Raw Materials Section */}
          <div className="bg-white border-2 border-blue-50 rounded-2xl p-6 md:p-8 shadow-lg hover:shadow-xl duration-300">
            <h2 className="text-2xl font-bold text-[#0a192f] mb-6 flex items-center gap-3 pb-4 border-b-2 border-blue-50">
              <MdCategory className="text-blue-600" />
              Raw Materials
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <MaterialCard name="Primary Material" value={product.upper || "Synthetic Fiber"} />
              <MaterialCard name="Sole Component" value={product.sole || "Rubber Performance"} />
            </div>
          </div>
          
          {/* Sales Information Card */}
          <div className="bg-white border-2 border-blue-50 rounded-2xl p-6 md:p-8 shadow-lg hover:shadow-xl duration-300">
            <h2 className="text-2xl font-bold text-[#0a192f] mb-6 flex items-center gap-3 pb-4 border-b-2 border-blue-50">
              <MdShoppingCart className="text-blue-600" />
              Sales Information
            </h2>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-blue-50">
                <span className="text-sm font-medium text-gray-500 uppercase tracking-widest">Sale Status</span>
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase tracking-widest border border-green-200">
                  Ready for Sale
                </span>
              </div>
              <DetailRow label="Country of Registry" value="KSA" />
              <DetailRow label="Distribution Channel" value="Direct Retail / Online" />
              <DetailRow label="Warranty Status" value="Standard 12 Months" />
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-16 text-center text-gray-400 text-sm">
          <p>© {new Date().getFullYear()} SLIC. All rights reserved.</p>
          <div className="mt-2 flex justify-center gap-4">
            <a href="#" className="hover:text-blue-600 transition-colors">Privacy Policy</a>
            <span className="text-gray-200">|</span>
            <a href="#" className="hover:text-blue-600 transition-colors">Terms of Service</a>
          </div>
        </footer>
      </div>
    </div>
  );
};

// Helper Components
const DetailRow = ({ label, value }) => (
  <div className="flex justify-between items-center py-3 border-b border-blue-50 last:border-0">
    <span className="text-sm font-medium text-gray-500 uppercase tracking-widest">{label}</span>
    <span className="text-base font-bold text-[#0a192f] text-right">{value || "---"}</span>
  </div>
);

const TimelineItem = ({ date, title, description, isLast }) => (
  <div className="relative group">
    <div className={`absolute -left-[24px] top-[7px] w-[14px] h-[14px] rounded-full bg-[#0a192f] border-2 border-white ring-4 ring-[#0a192f]/5 z-10 ${isLast ? '' : ''}`}></div>
    <div>
      <div className="text-xs font-bold text-blue-600 mb-1 uppercase tracking-widest">{date}</div>
      <div className="text-lg font-bold text-[#0a192f] mb-1 group-hover:text-blue-700 transition-colors">{title}</div>
      <p className="text-sm text-gray-500 max-w-sm">{description}</p>
    </div>
  </div>
);

const MaterialCard = ({ name, value }) => (
  <div className="bg-gray-50 border-2 border-blue-50 p-5 rounded-xl hover:bg-blue-50 hover:border-blue-100 transition-all">
    <div className="text-sm font-bold text-[#0a192f] mb-3">{name}</div>
    <div className="bg-white border border-blue-100 rounded-lg p-3 text-sm font-mono font-bold text-[#0a192f] shadow-sm">
      {value}
    </div>
  </div>
);

const calculateOffsetDate = (baseDate, days) => {
  const date = new Date(baseDate || Date.now());
  date.setDate(date.getDate() + days);
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

export default DigitalLinkLandingPage;
