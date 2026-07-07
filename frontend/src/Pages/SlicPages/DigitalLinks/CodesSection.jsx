import React from "react";
import Barcode from "react-barcode";
import { QRCodeSVG } from "qrcode.react";

// QR Code and Barcode Combined Component
const CodesSection = ({ gtin }) => (
  <div className="space-y-6">
    {/* QR Code */}
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-3 h-3 bg-blue-600"></div>
        <h3 className="font-bold text-gray-900 text-base">QR Code</h3>
      </div>
      <div className="flex justify-center mb-4 bg-white">
        <QRCodeSVG value={gtin} size={200} level="H" />
      </div>
      <p className="text-sm text-gray-600 text-center mb-1">Scan to access product information</p>
      <p className="text-xs text-gray-500 text-center font-medium">GTIN: {gtin}</p>
    </div>

    {/* Barcode */}
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-3 h-3 bg-emerald-500"></div>
        <h3 className="font-bold text-gray-900 text-base">Barcode</h3>
      </div>
      <div className="flex justify-center mb-3 bg-white">
        <Barcode value={gtin} height={80} width={2.2} fontSize={18} margin={0} />
      </div>
      <p className="text-sm text-gray-600 text-center">Standard barcode for inventory</p>
    </div>
  </div>
);

export default CodesSection;