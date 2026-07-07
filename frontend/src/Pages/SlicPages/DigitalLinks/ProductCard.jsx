import React from 'react';
import sliclogo from "../../../Images/sliclogo.png"

// Product Card Component
const ProductCard = ({ imageUrl, productCode, GTIN, label, upper, details }) => (
  <div className="bg-white rounded-xl shadow-md overflow-hidden">
    {/* Product Image */}
    <div className="relative">
      <img 
        src={imageUrl || sliclogo} 
        alt="Product" 
        className="w-full sm:h-72 h-40 object-contain"
      />
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent text-white text-xs px-4 py-2">
        <span className="text-gray-300 font-medium">PRODUCT SIZE: </span>
        <span className="font-semibold">{productCode}</span>
      </div>
    </div>

    {/* Product Info */}
    <div className="px-5 py-4">
      <h2 className="text-2xl font-bold text-gray-900 mb-0.5">GTIN: {GTIN}</h2>
      <p className="text-base text-gray-500 mb-5 pb-3 border-b border-gray-200">label: {label} - Upper {upper}</p>
      
      {/* Dynamic Details Grid */}
      <div className="space-y-0">
        <div className="grid grid-cols-2 gap-4">
          {details && details.map((detail, index) => (
            <div key={index}>
              <span className="text-sm text-gray-500 uppercase tracking-wide">
                {detail.label}
              </span>
              <p className="text-base font-bold text-gray-900 mt-0.5">
                {detail.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

export default ProductCard;