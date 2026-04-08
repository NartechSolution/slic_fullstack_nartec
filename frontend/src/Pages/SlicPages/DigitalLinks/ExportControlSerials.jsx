import React, { useState, useRef, useEffect } from "react";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import sliclogo from "../../../Images/sliclogo.png";
import QRCode from "qrcode";
import ExcelJS from "exceljs";

// Native blob download helper (no file-saver needed)
const saveBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const ExportControlSerials = ({ serials }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const buttonRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = () => setIsOpen(!isOpen);
  const handleClose = () => setIsOpen(false);

  // Generate QR code as data URL
  const generateQRDataURL = async (text) => {
    try {
      return await QRCode.toDataURL(text || " ", {
        width: 80,
        margin: 1,
        errorCorrectionLevel: "M",
      });
    } catch {
      return null;
    }
  };

  // Prepare base data for export
  const prepareExportData = () => {
    return serials.map((serial, index) => ({
      "S.No": index + 1,
      "Status": serial.status || "N/A",
      "Serial Number": serial.serialNumber || "N/A",
      "QR Code": "", // Placeholder for QR cell
      "Item Code": serial.ItemCode || "N/A",
      "Item Name": serial.itemName || serial.product?.EnglishName || "N/A",
      "GTIN": serial.gtin || serial.product?.GTIN || "N/A",
      "Upper": serial.upper || serial.product?.upper || "N/A",
      "Sole": serial.sole || serial.product?.sole || "N/A",
      "Width": serial.width || serial.product?.width || "N/A",
      "Color": serial.color || serial.product?.color || "N/A",
      "Size": serial.product?.ProductSize || "N/A",
      "Created At": serial.product?.Created_at
        ? new Date(serial.product?.Created_at).toLocaleDateString()
        : "N/A",
      _serialNumber: serial.serialNumber || "",
    }));
  };

  // Export to Excel with embedded QR images
  const handleExportExcel = async () => {
    handleClose();
    const exportData = prepareExportData();
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet("Control Serials");

    // Define columns
    ws.columns = [
      { header: "S.No",          key: "sno",          width: 8 },
      { header: "Status",        key: "status",       width: 14 },
      { header: "Serial Number", key: "serialNumber", width: 20 },
      { header: "QR Code",       key: "qr",           width: 11 },
      { header: "Item Code",     key: "itemCode",     width: 16 },
      { header: "Item Name",     key: "itemName",     width: 22 },
      { header: "GTIN",          key: "gtin",         width: 20 },
      { header: "Upper",         key: "upper",        width: 14 },
      { header: "Sole",          key: "sole",         width: 14 },
      { header: "Width",         key: "width",        width: 12 },
      { header: "Color",         key: "color",        width: 14 },
      { header: "Size",          key: "size",         width: 10 },
      { header: "Created At",    key: "createdAt",    width: 16 },
    ];

    // Style header row
    const headerRow = ws.getRow(1);
    headerRow.height = 35;
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1D2F90" } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    // Set row height to easily fit the QR Code
    const QR_ROW_HEIGHT = 55; // pts

    for (let i = 0; i < exportData.length; i++) {
      const item = exportData[i];
      const rowIndex = i + 2; // data starts at row 2

      const row = ws.addRow({
        sno:          item["S.No"],
        status:       item["Status"],
        serialNumber: item["Serial Number"],
        qr:           "",
        itemCode:     item["Item Code"],
        itemName:     item["Item Name"],
        gtin:         item["GTIN"],
        upper:        item["Upper"],
        sole:         item["Sole"],
        width:        item["Width"],
        color:        item["Color"],
        size:         item["Size"],
        createdAt:    item["Created At"],
      });

      row.height = QR_ROW_HEIGHT;
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });

      // Generate and embed QR image
      const qrDataUrl = await generateQRDataURL(item._serialNumber);
      if (qrDataUrl) {
        const base64 = qrDataUrl.split(",")[1];
        const imageId = workbook.addImage({
          base64,
          extension: "png",
        });

        // Column 4 is QR Code (0-indexed: 3)
        // Draw exact 45x45 square to prevent Excel stretching/warping
        ws.addImage(imageId, {
          tl: { col: 3.1, row: rowIndex - 0.8 },
          ext: { width: 45, height: 45 },
          editAs: "oneCell",
        });
      }
    }

    // Save
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveBlob(blob, `Control_Serials_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  // Export to PDF with QR images
  const handleExportPDF = async () => {
    handleClose();
    const exportData = prepareExportData();

    // Pre-generate all QR data URLs
    const qrDataUrls = await Promise.all(
      exportData.map((item) => generateQRDataURL(item._serialNumber))
    );

    const doc = new jsPDF("landscape");
    const pageWidth = doc.internal.pageSize.width;

    // Add logo
    if (sliclogo) {
      doc.addImage(sliclogo, "PNG", 14, 10, 30, 15);
    }

    // Title
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Saudi Leather Industries", pageWidth - 14, 15, { align: "right" });

    doc.setFontSize(16);
    doc.text("Control Serials Report", pageWidth / 2, 32, { align: "center" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 38);

    const QR_CELL_SIZE = 12; // smaller size for PDF cell
    const ROW_HEIGHT = QR_CELL_SIZE + 2;

    const headers = [
      "S.No", "Status", "Serial Number", "QR Code", "Item Code", "Item Name",
      "GTIN", "Upper", "Sole", "Width", "Color", "Size", "Created At"
    ];

    const rows = exportData.map((item) => [
      item["S.No"],
      item["Status"],
      item["Serial Number"],
      "",  // QR cell
      item["Item Code"],
      item["Item Name"],
      item["GTIN"],
      item["Upper"],
      item["Sole"],
      item["Width"],
      item["Color"],
      item["Size"],
      item["Created At"],
    ]);

    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 42,
      styles: {
        fontSize: 7,
        cellPadding: 2,
        minCellHeight: ROW_HEIGHT,
      },
      headStyles: {
        fillColor: [29, 47, 144],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        halign: "center",
        minCellHeight: 8,
      },
      columnStyles: {
        0:  { cellWidth: 10 },  // S.No
        1:  { cellWidth: 'auto' },  // Status
        2:  { cellWidth: 35 },  // Serial Number
        3:  { cellWidth: QR_CELL_SIZE + 4, halign: "center" }, // QR Code
        4:  { cellWidth: 20 },  // Item Code
        5:  { cellWidth: 'auto' },  // Item Name
        6:  { cellWidth: 26 },  // GTIN
        7:  { cellWidth: 'auto' },  // Upper
        8:  { cellWidth: 'auto' },  // Sole
        9:  { cellWidth: 14 },  // Width
        10: { cellWidth: 16 },  // Color
        11: { cellWidth: 12 },  // Size
        12: { cellWidth: 20 },  // Created At
      },
      margin: { top: 10, left: 10, right: 10 },
      theme: "grid",
      tableWidth: "auto",
      didDrawCell: (data) => {
        // Draw QR in column index 3 (QR Code)
        if (data.section === "body" && data.column.index === 3) {
          const rowIndex = data.row.index;
          const qrUrl = qrDataUrls[rowIndex];
          if (qrUrl) {
            const size = QR_CELL_SIZE;
            doc.addImage(
              qrUrl,
              "PNG",
              data.cell.x + (data.cell.width - size) / 2,
              data.cell.y + (data.cell.height - size) / 2,
              size,
              size
            );
          }
        }
      },
      didDrawPage: (data) => {
        if (data.pageNumber > 1) {
          doc.setFontSize(8);
          doc.setFont("helvetica", "normal");
          doc.text("Control Serials Report - Continued", 14, 8);
        }
      },
    });

    // Page numbers
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(
        `Page ${i} of ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.height - 10,
        { align: "center" }
      );
    }

    doc.save(`Control_Serials_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  return (
    <div className="relative inline-block">
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className="flex items-center gap-2 px-4 py-2 bg-[#1D2F90] hover:bg-[#162561] text-white font-medium rounded-md transition-colors duration-200"
      >
        Export
        <Download className="w-4 h-4" />
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200"
        >
          <div className="py-1">
            <button
              onClick={handleExportExcel}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150"
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Export as Excel
            </button>
            <button
              onClick={handleExportPDF}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150"
            >
              <FileText className="w-4 h-4 mr-2" />
              Export as PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportControlSerials;