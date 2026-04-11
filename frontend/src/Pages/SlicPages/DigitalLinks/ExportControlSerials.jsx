import React from "react";
import { Button, Menu, MenuItem } from "@mui/material";
import { FiDownload } from "react-icons/fi";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";
import sliclogo from "../../../Images/sliclogo.png";

const ExportControlSerials = ({ serials }) => {
  const [anchorEl, setAnchorEl] = React.useState(null);
  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  // Prepare data for export
  const prepareExportData = () => {
    return serials.map((serial, index) => ({
      "S.No": index + 1,
      "Status": serial.status || "N/A",
      "Serial Number": serial.serialNumber || "N/A",
      "Side": serial.side === "R" ? "Right" : serial.side === "L" ? "Left" : "N/A",
      "Side Qty": serial.sideQty ?? "N/A",
      "Item Code": serial.ItemCode || "N/A",
      "Item Name": serial.itemName || serial.product?.EnglishName || "N/A",
      "GTIN": serial.gtin || serial.product?.GTIN || "N/A",
      "Upper": serial.upper || serial.product?.upper || "N/A",
      "Sole": serial.sole || serial.product?.sole || "N/A",
      "Width": serial.width || serial.product?.width || "N/A",
      "Color": serial.color || serial.product?.color || "N/A",
      "Size": serial.product?.ProductSize || "N/A",
      "Created At": serial.product?.Created_at ? new Date(serial.product?.Created_at).toLocaleDateString() : "N/A"
    }));
  };

  // Export to Excel
  const handleExportExcel = () => {
    const exportData = prepareExportData();
    
    // Create a new workbook
    const wb = XLSX.utils.book_new();
    
    // Convert data to worksheet
    const ws = XLSX.utils.json_to_sheet(exportData);
    
    // Set column widths
    const columnWidths = [
      { wch: 8 },  // S.No
      { wch: 12 }, // Status
      { wch: 18 }, // Serial Number
      { wch: 8 },  // Side
      { wch: 10 }, // Side Qty
      { wch: 15 }, // Item Code
      { wch: 20 }, // Item Name
      { wch: 18 }, // GTIN
      { wch: 15 }, // Upper
      { wch: 12 }, // Sole
      { wch: 12 }, // Width
      { wch: 15 }, // Color
      { wch: 10 }, // Size
      { wch: 15 }  // Created At
    ];
    ws['!cols'] = columnWidths;
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, "Control Serials");
    
    // Generate filename with current date
    const filename = `Control_Serials_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    // Save file
    XLSX.writeFile(wb, filename);
    
    handleClose();
  };

  // Export to PDF
  const handleExportPDF = () => {
    const exportData = prepareExportData();
    
    // Create new PDF document
    const doc = new jsPDF('landscape');
    
    // Add logo (left side)
    const logoWidth = 30;
    const logoHeight = 15;
    doc.addImage(sliclogo, 'PNG', 14, 10, logoWidth, logoHeight);
    
    // Add company name (right side)
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    const pageWidth = doc.internal.pageSize.width;
    doc.text("Saudi Leather Industries", pageWidth - 14, 15, { align: 'right' });
    
    // Add title (center, below logo)
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text("Control Serials Report", pageWidth / 2, 32, { align: 'center' });
    
    // Add date
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 38);
    
    // Prepare table data
    const headers = [
      "S.No",
      "Status",
      "Serial Number",
      "Item Code",
      "Item Name",
      "GTIN",
      "Upper",
      "Sole",
      "Width",
      "Color",
      "Size",
      "Created At"
    ];
    
    const rows = exportData.map(item => [
      item["S.No"],
      item["Status"],
      item["Serial Number"],
      item["Item Code"],
      item["Item Name"],
      item["GTIN"],
      item["Upper"],
      item["Sole"],
      item["Width"],
      item["Color"],
      item["Size"],
      item["Created At"]
    ]);
    
    // Add table with custom column widths
    doc.autoTable({
      head: [headers],
      body: rows,
      startY: 42,
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [29, 47, 144],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        0: { cellWidth: 15 },  // S.No
        1: { cellWidth: 20 },  // Status
        2: { cellWidth: 30 },  // Serial Number
        3: { cellWidth: 25 },  // Item Code
        4: { cellWidth: 30 },  // Item Name
        5: { cellWidth: 28 },  // GTIN
        6: { cellWidth: 20 },  // Upper
        7: { cellWidth: 18 },  // Sole
        8: { cellWidth: 18 },  // Width
        9: { cellWidth: 20 },  // Color
        10: { cellWidth: 15 }, // Size
        11: { cellWidth: 22 }  // Created At
      },
      margin: { top: 10, left: 10, right: 10 },
      theme: 'grid',
      didDrawPage: function(data) {
        // Only add header on first page
        if (data.pageNumber === 1) {
          // Header is already added before the table
        } else {
          // For subsequent pages, add minimal header or none
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          doc.text(`Control Serials Report - Continued`, 14, 8);
        }
      }
    });
    
    // Add page numbers
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(
        `Page ${i} of ${pageCount}`,
        doc.internal.pageSize.width / 2,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      );
    }
    
    // Generate filename with current date
    const filename = `Control_Serials_${new Date().toISOString().split('T')[0]}.pdf`;
    
    // Save PDF
    doc.save(filename);
    
    handleClose();
  };

  return (
    <>
      <Button
        variant="contained"
        onClick={handleClick}
        sx={{
          backgroundColor: '#1D2F90',
          '&:hover': {
            backgroundColor: '#162561',
          },
        }}
        endIcon={<FiDownload className="w-4 h-4" />}
      >
        Export
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          'aria-labelledby': 'export-button',
        }}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={handleExportExcel}>
          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM8 13h8v2H8v-2zm0 4h5v2H8v-2z"/>
          </svg>
          Export as Excel
        </MenuItem>
        <MenuItem onClick={handleExportPDF}>
          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zm-2 6h3v2h-3v3H9v-3H6v-2h3V9h2v3z"/>
          </svg>
          Export as PDF
        </MenuItem>
      </Menu>
    </>
  );
};

export default ExportControlSerials;