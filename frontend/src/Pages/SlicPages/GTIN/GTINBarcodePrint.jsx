import React from "react";
import { QRCodeSVG } from "qrcode.react";
import logo from "../../../Images/sliclogo.png";

const GTINBarcodePrint = ({ selectedRows, onPrintComplete }) => {
  const handlePrint = () => {
    if (selectedRows.length === 0) {
      return;
    }

    const printWindow = window.open("", "Print Window", "height=400,width=800");
    const html =
      "<html><head><title>GTIN Number</title>" +
      "<style>" +
      "@page { size: 2in 1in; margin: 0; }" +
      "body { font-family: Arial, sans-serif; margin: 0; padding: 0; }" +
      
      "/* Label Container - Each label on separate page */" +
      ".label-container { width: 2in; height: 1in; position: relative; background: white; box-sizing: border-box; page-break-after: always; }" +
      ".label-container:last-child { page-break-after: auto; }" +
      
      "/* QR Code and Content Wrapper */" +
      "#Qrcodeserails { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }" +
      "#itemcode { display: flex; align-items: center; gap: 8px; width: 100%; max-width: 180px; }" +
      "#inside-BRCode { flex-shrink: 0; display: flex; justify-content: center; align-items: center; }" +
      "#description { flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 3px; min-width: 0; }" +
      "#gtin { font-size: 9px; font-weight: 600; margin: 0; color: #333; line-height: 1.2; }" +
      "#expiry { font-size: 9px; font-weight: 600; margin: 0; color: #333; line-height: 1.2; }" +
      "#batch { font-size: 9px; font-weight: 600; margin: 0; color: #333; line-height: 1.2; word-break: break-all; }" +
      "</style>" +
      "</head><body>" +
      '<div id="printBarcode12"></div>' +
      "</body></html>";

    printWindow.document.write(html);
    printWindow.document.close();
    const barcodeContainer = printWindow.document.getElementById("printBarcode12");
    const barcode = document.getElementById("gtin-products-container").cloneNode(true);
    barcodeContainer.appendChild(barcode);

    const logoImg = new Image();
    logoImg.src = logo;

    logoImg.onload = function () {
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
        
        if (onPrintComplete) {
          setTimeout(() => {
            onPrintComplete();
          }, 500);
        }
      }, 300);
    };

    logoImg.onerror = function () {
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
        
        if (onPrintComplete) {
          setTimeout(() => {
            onPrintComplete();
          }, 500);
        }
      }, 300);
    };
  };

  return (
    <>
      {/* Hidden container for print */}
      <div id="gtin-products-container">
        {selectedRows.map((barcode, index) => {
          return (
            <div className="label-container hidden" key={index}>
              <div id="Qrcodeserails">
                <div id="itemcode">
                  {/* Left side - QR Code */}
                  <div id="inside-BRCode">
                    <QRCodeSVG
                      value={`${barcode?.ItemCode} - ${barcode?.ProductSize} - ${barcode?.GTIN}`}
                      width="60"
                      height="45"
                      level="M"
                      includeMargin={false}
                    />
                  </div>

                  {/* Right side - Data */}
                  <div id="description">
                    <div id="gtin">Style# : {barcode?.ItemCode}</div>
                    <div id="expiry">Size# : {barcode?.ProductSize}</div>
                    <div id="batch">GTIN# : {barcode?.GTIN}</div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Expose print function via ref if needed */}
      <button onClick={handlePrint} style={{ display: 'none' }} id="gtin-print-trigger" />
    </>
  );
};

export default GTINBarcodePrint;