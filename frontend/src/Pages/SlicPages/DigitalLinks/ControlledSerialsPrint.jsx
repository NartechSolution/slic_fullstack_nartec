import React from "react";
import { QRCodeSVG } from "qrcode.react";
import logo from "../../../Images/labelLogo.jpeg";

const ControlledSerialsPrint = ({ selectedRows, onPrintComplete }) => {
  // console.log(selectedRows)
  const handlePrint = () => {
    if (selectedRows.length === 0) {
      return;
    }

    const printWindow = window.open("", "Print Window", "height=400,width=800");
    const html =
      "<html><head><title>Controlled Serials</title>" +
      "<style>" +
      "@page { size: 2in 1in; margin: 0; }" +
      "body { font-family: Arial, sans-serif; margin: 0; padding: 0; }" +

      "/* Label Container - Each label on separate page */" +
      ".label-container { width: 2in; height: 1in; position: relative; background: white; box-sizing: border-box; overflow: hidden; page-break-after: always; }" +
      ".label-container:last-child { page-break-after: auto; }" +

      "/* QR Code and Content Wrapper */" +
      "#Qrcodeserails { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; padding: 3px; box-sizing: border-box; }" +
      "#itemcode { display: flex; align-items: center; gap: 6px; width: 100%; height: 100%; }" +
      "#inside-BRCode { flex-shrink: 0; width: 58px; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 2px; }" +
      "#slic-logo { width: 54px; max-height: 32px; object-fit: contain; display: block; }" +
      "#description { flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 2px; min-width: 0; }" +
      "#gtin { font-size: 8px; font-weight: 600; margin: 0; color: #333; line-height: 1.2; white-space: nowrap; }" +
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
                  {/* Left side - SLIC Logo + QR Code */}
                  <div id="inside-BRCode">
                    <img id="slic-logo" src={logo} alt="SLIC" />
                    <QRCodeSVG
                      value={`${barcode?.serialNo}`}
                      size={52}
                      level="M"
                      includeMargin={false}
                    />
                  </div>

                  {/* Right side - Data */}
                  <div id="description">
                    <div id="gtin">STYLE : {barcode?.ItemCode}</div>
                    <div id="expiry">Size : {barcode?.size}</div>
                    <div id="batch">GTIN : {barcode?.GTIN}</div>
                    {/* <div id="batch">EN ISO-20347:2022</div> */}
                    <div id="gtin">SerialNo. : {barcode?.serialNo}</div>
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

export default ControlledSerialsPrint;