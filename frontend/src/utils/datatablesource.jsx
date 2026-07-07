import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import imageLiveUrl from "../utils/urlConverter/imageLiveUrl";
import QRCode from "qrcode.react";
import { backendUrl, baseUrl } from "./config";
import { useGridApiContext } from "@mui/x-data-grid";
import { Box } from "@mui/material";

const QRCodeCell = (props) => {
  const url = `${props.value}`;
  return <QRCode value={url} size={40} />;
};

function ImageEditInputCell(props) {
  const { id, field, fieldUpdated, value, mode } = props;
  const apiRef = useGridApiContext();

  const handleFileChange = (event) => {
    const file = event.target?.files?.[0];

    if (!file) {
      apiRef.current.setEditCellValue({
        id,
        field: fieldUpdated,
        value: false,
      });
      return;
    }

    if (file) {
      const reader = new FileReader();

      reader.onload = () => {
        const imageValue = reader.result;
        apiRef.current.setEditCellValue({
          id,
          field: fieldUpdated,
          value: true,
        });
        apiRef.current.setEditCellValue({
          id,
          field,
          value: { file, dataURL: imageValue, isUpdate: true },
        });
      };

      reader.readAsDataURL(file);
    }
  };

  const handleRef = (element) => {
    if (element) {
      const input = element.querySelector('input[type="file"]');
      input?.focus();
    }
  };

  if (mode === "edit") {
    return (
      <Box sx={{ display: "flex", alignItems: "center", pr: 2 }}>
        <input
          ref={handleRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
        />
      </Box>
    );
  }

  console.log("Value");
  console.log(value);
}

const renderImageEditInputCell = (params) => {
  const { field, fieldUpdated } = params;
  return (
    <ImageEditInputCell {...params} mode="edit" fieldUpdated={fieldUpdated} />
  );
};

const GTINCell = (params) => {
  const style = {
    backgroundColor: "rgb(21 128 61)",
    color: "white",
    borderRadius: "30px",
    padding: "2px 10px",
  };
  return <div style={style}>{params.value}</div>;
};

export const GtinColumn = (t)=> [
  {
    field: "EnglishName",
    headerName: t("English Name"),
    width: 200,
  },
  {
    field: "ArabicName",
    headerName: t("Arabic Name"),
    width: 200,
  },
  {
    field: "ItemCode",
    headerName: t("Item Code"),
    width: 180,
  },
  {
    field: "ProductSize",
    headerName: t("Product Size"),
    width: 180,
  },
  {
    field: "sERIALnUMBER",
    headerName: t("Serial Number"),
    renderCell: (params) => <QRCodeCell value={params.row.EnglishName} />,
    // width: 50, // Adjust this width as needed
  },
  {
    field: "LotNo",
    headerName: t("Lot No"),
    width: 180,
  },
  {
    field: "GTIN",
    headerName: t("Barcode"),
    renderCell: GTINCell,
    width: 150,
  },
  {
    field: "ItemQty",
    headerName: t("Item Qty"),
    width: 180,
  },
  {
    field: "WHLocation",
    headerName: t("WH Location"),
    width: 180,
  },
  {
    field: "BinLocation",
    headerName: t("Bin Location"),
    width: 180,
  },
  // {
  //   field: "QRCodeInternational",
  //   headerName: "QR Code International",
  //   width: 180,
  // },
  // {
  //   field: "ModelName",
  //   headerName: "Model Name",
  //   width: 180,
  // },
  // {
  //   field: "ProductionDate",
  //   headerName: "Production Date",
  //   width: 180,
  // },
  // {
  //   field: "ProductType",
  //   headerName: "Product Type",
  //   width: 180,
  // },
  // {
  //   field: "BrandName",
  //   headerName: "Brand Name",
  //   width: 180,
  // },
  // {
  //   field: "PackagingType",
  //   headerName: "Packaging Type",
  //   width: 180,
  // },
  // {
  //   field: "ProductUnit",
  //   headerName: "Product Unit",
  //   width: 180,
  // },
];

export const listOfEmployeeColumn = [
  {
    field: "employeeCode",
    headerName: "Employee Code",
    width: 150,
  },
  {
    field: "companyName",
    headerName: "Company Name",
    width: 180,
  },
  {
    field: "passportNumber",
    headerName: "Passport Number",
    width: 150,
  },
  {
    field: "name",
    headerName: "Employee Name",
    width: 180,
  },
  {
    field: "nationality",
    headerName: "Nationality",
    width: 180,
  },
  {
    field: "employmentType",
    headerName: "Employment Type",
    width: 180,
  },
  {
    field: "jobTitle",
    headerName: "Job Title",
    width: 180,
  },
  {
    field: "roomNumber",
    headerName: "Room Number",
    width: 150,
  },
  {
    field: "profilePicture",
    headerName: "Profile Picture",
    width: 180,
    editable: true,
    renderCell: (params) => (
      <img
        src={imageLiveUrl(params.row.profilePicture)}
        // src={backendUrl + "/" + params.row.address_image}
        alt="address_image"
        style={{
          width: "90%",
          height: "90%",
          objectFit: "contain",
          cursor: "pointer",
        }}
        onClick={() => {
          window.open(
            imageLiveUrl(params.row.profilePicture),
            "_blank",
            "width=400,height=300,top=0,left=0"
          );
        }}
      />
    ),
  },
  {
    field: "expiryDate",
    headerName: 'Expiry Date',
    width: 180,

    type: "dateTime",
    valueGetter: (params) => {
      // Convert the string date to a Date object
      return params.value ? new Date(params.value) : null;
    },
  },
  {
    field: "logoColor",
    headerName: 'Logo Color',
    width: 180,
    renderCell: GTINCell,
  },
  // {
  //   field: "location",
  //   headerName: 'Location',
  //   width: 180,
  // },
  // {
  //   field: "locationCode",
  //   headerName: 'Location Code',
  //   width: 180,
  // },

  // {
  //   field: "qrcode",
  //   headerName: 'QRCode',
  //   renderCell: (params) => <QRCodeCell value={params.row.barcode} />,
  //   // width: 50, // Adjust this width as needed
  // },
  // {
  //   field: "createdAt",
  //   headerName: "Created At",
  //   width: 180,

  //   type: "dateTime",
  //   valueGetter: (params) => {
  //     // Convert the string date to a Date object
  //     return params.value ? new Date(params.value) : null;
  //   },
  // },
  // {
  //   field: "updatedAt",
  //   headerName: "Updated At",
  //   width: 180,
  //   type: "dateTime",
  //   valueGetter: (params) => {
  //     // Convert the string date to a Date object
  //     return params.value ? new Date(params.value) : null;
  //   },
  // },
];


export const archivedUserColumn = (t) => [
  {
    field: "id",
    headerName: t("Employee ID"),
    width: 120,
  },
  {
    field: "name",
    headerName: t("Employee Name"),
    width: 180,
  },
  {
    field: "companyName",
    headerName: t("Company Name"),
    width: 180,
  },
  {
    field: "employmentType",
    headerName: t("Employment Type"),
    width: 150,
  },
  {
    field: "jobTitle",
    headerName: t("Job Title"),
    width: 180,
  },
  {
    field: "nationality",
    headerName: t("Nationality"),
    width: 180,
  },
  {
    field: "passportNumber",
    headerName: t("Passport Number"),
    width: 180,
  },
  {
    field: "roomNumber",
    headerName: t("Room Number"),
    width: 150,
  },
  {
    field: "username",
    headerName: t("Username"),
    width: 180,
  },
  {
    field: "profilePicture",
    headerName: t("Profile Picture"),
    width: 180,
    editable: true,
    renderCell: (params) => (
      <img
        src={imageLiveUrl(params.row.profilePicture)}
        // src={backendUrl + "/" + params.row.address_image}
        alt="address_image"
        style={{
          width: "90%",
          height: "90%",
          objectFit: "contain",
          cursor: "pointer",
        }}
        onClick={() => {
          window.open(
            imageLiveUrl(params.row.profilePicture),
            "_blank",
            "width=400,height=300,top=0,left=0"
          );
        }}
      />
    ),
  },
  {
    field: "createdAt",
    headerName: t("Created At"),
    width: 180,

    type: "dateTime",
    valueGetter: (params) => {
      // Convert the string date to a Date object
      return params.value ? new Date(params.value) : null;
    },
  },
  {
    field: "updatedAt",
    headerName: t("Updated At"),
    width: 180,
    type: "dateTime",
    valueGetter: (params) => {
      // Convert the string date to a Date object
      return params.value ? new Date(params.value) : null;
    },
  },
];



export const purchaseOrderColumn =(t)=> [
  {
    field: "Head_SYS_ID",
    headerName: t("Head System ID"),
    width: 180,
  },
  {
    field: "SupplierName",
    headerName: t("Supplier Name"),
    renderCell: GTINCell,
    width: 280,
  },
  {
    field: "Document_No",
    headerName: t("Document No"),
    width: 180,
  },
  {
    field: "POStatus",
    headerName: t("PO Status"),
    width: 180,
  },
  {
    field: "PODate",
    headerName: t("PO Date"),
    width: 180,
  },
  


]



export const purchaseOrderDetailsColumn =(t)=> [
  {
    field: "ITEM_SYS_ID",
    headerName: t("Item System ID"),
    width: 180,
  },
  {
    field: "ITEM_CODE",
    headerName: t("Item Code"),
    width: 180,
  },
  {
    field: "ITEM_NAME",
    headerName: t("Item Name"),
    renderCell: GTINCell,
    width: 280,
  },
  {
    field: "PO_QTY",
    headerName: t("PO Quantity"),
    width: 180,
  },
  {
    field: "RECEIVED_QTY",
    headerName: t("Received Quantity"),
    width: 180,
  },
  {
    field: "UOM",
    headerName: t("UOM"),
    width: 180,
  },
  {
    field: "GRADE",
    headerName: t("GRADE"),
    width: 180,
  },
  
  

]



export const salesOrderColumn =  (t)=>[
  {
    field: "HEAD_SYS_ID",
    headerName: t("Head System ID"),
    width: 180,
  },
  {
    field: "SO_CUST_NAME",
    headerName: t("SO Customar Name"),
    renderCell: GTINCell,
    width: 280,
  },
  {
    field: "SO_NUMBER",
    headerName: t("So Number"),
    width: 180,
  },
  {
    field: "DEL_LOCN",
    headerName: t("Del Location"),
    width: 180,
  },
  {
    field: "SO_LOCN_CODE",
    headerName: t("SO Location Code"),
    width: 180,
  },
  {
    field: "STATUS",
    headerName: t("Status"),
    width: 180,
    renderCell: (params) => {
      const style = {
        backgroundColor: params.value === "Approved" ? "green" : "red",
        color: params.value === "Approved" ? "white" : "black",
        borderRadius: "30px",
        padding: "2px 10px",
        border: params.value === "Approved" ? "1px solid white" : "none",
      };
      return <div style={style}>{params.value}</div>;
    },
  },
];



export const salesOrderDetailsColumn = (t)=> [
  {
    field: "ITEM_SYS_ID",
    headerName: t("Item System ID"),
    width: 180,
  },
  {
    field: "ITEM_CODE",
    headerName: t("Item Code"),
    width: 180,
  },
  {
    field: "ITEM_NAME",
    headerName: t("Item Name"),
    renderCell: GTINCell,
    width: 280,
  },
  {
    field: "PO_QTY",
    headerName: t("PO Quantity"),
    width: 180,
  },
  {
    field: "INV_QTY",
    headerName: t("Received Quantity"),
    width: 180,
  },
  {
    field: "UOM",
    headerName: t("UOM"),
    width: 180,
  },
  {
    field: "GRADE",
    headerName: t("GRADE"),
    width: 180,
  },
  
  

]


export const usersColumn = (t)=> [
  {
    field: "UserLoginID",
    headerName: t("User Login ID"),
    width: 280,
  },
  {
    field: "UserLoginStatus",
    headerName: t("User Login Status"),
    renderCell: (params) => {
      const style = {
        backgroundColor: params.value === 1 ? "green" : "red",
        color: params.value === 1 ? "white" : "white",
        borderRadius: "30px",
        padding: "2px 10px",
        border: params.value === 1 ? "1px solid white" : "none",
      };
      return <div style={style}>{params.value === 1 ? "Active" : "Inactive"}</div>;
    },
    width: 180,
  },
  {
    field: "UserPassword",
    headerName: t("User Password"),
    width: 180,
  },
];



export const posColumn = [
  {
    field: "ItemCode",
    headerName: "SKU",
    width: 180,
  },
  {
    field: "GTIN",
    headerName: "Barcode",
    renderCell: GTINCell,
    width: 180,
  },
  {
    field: "EnglishName",
    headerName: "Description",
    width: 180,
  },
  {
    field: "ItemQty",
    headerName: "Qty",
    width: 180,
  },
  {
    field: "ItemPrice",
    headerName: "Item Price",
    width: 180,
  },
  {
    field: "ProductSize",
    headerName: "Item Size",
    width: 180,
  },
  {
    field: "Discount",
    headerName: "VAT",
    width: 180,
  },
  {
    field: "VAT(15%)",
    headerName: "VAT",
    width: 180,
  },
  {
    field: "Total",
    headerName: "Total Price",
    width: 180,
  },
  
  

]



export const transactionCodesColumn = (t)=> [
  {
    field: "TXN_CODE",
    headerName: t("Transaction Code"),
    width: 220,
  },
  {
    field: "TXN_NAME",
    headerName: t("Transaction Name"),
    renderCell: GTINCell,
    width: 280,
  },
  {
    field: "TXN_TYPE",
    headerName: t("Transaction Type"),
    width: 280,
  },
]



export const customerCodesColumn = (t)=> [
  {
    field: "CUST_CODE",
    headerName: t("Customer Code"),
    width: 220,
  },
  {
    field: "CUST_NAME",
    headerName: t("Customer Name"),
    renderCell: GTINCell,
    width: 320,
  },
]



export const posHistoryInvoiceColumns = (t)=> [
  {
    field: "CustomerName",
    headerName: t("Customer Name"),
    width: 150,
  },
  {
    field: "DeliveryLocationCode",
    headerName: t("Delivery Location Code"),
    width: 180,
  },
  {
    field: "ItemSysID",
    headerName: t("Item System ID"),
    width: 150,
  },
  {
    field: "InvoiceNo",
    headerName: t("Invoice No"),
    width: 180,
  },
  {
    field: "DocNo",
    headerName: t("Document No"),
    width: 180,
  },
  {
    field: "AdjAmount",
    headerName: t("Adjustment Amount"),
    width: 180,
  },
  {
    field: "PendingAmount",
    headerName: t("Pending Amount"),
    width: 180,
  },
  {
    field: "VatNumber",
    headerName: t("Vat Number (%)"),
    width: 180,
  },
  {
    field: "Head_SYS_ID",
    headerName: t("Head System ID"),
    width: 180,
  },
  {
    field: "TransactionCode",
    headerName: t("Transaction Code"),
    width: 150,
  },
  {
    field: "CustomerCode",
    headerName: t("Customer Code"),
    width: 180,
  },
  {
    field: "SalesLocationCode",
    headerName: t("Sales Location Code"),
    width: 180,
  },
  {
    field: "Remarks",
    headerName: t("Remarks"),
    width: 250,
  },
  {
    field: "TransactionType",
    headerName: t("Transaction Type"),
    width: 150,
  },
  {
    field: "UserID",
    headerName: t("User ID"),
    width: 150,
  },
  {
    field: "MobileNo",
    headerName: t("Mobile No"),
    width: 150,
  },
  {
    field: "zatcaPayment_mode_id",
    headerName: t("ZATCA Payment Mode ID"),
    width: 120,
  },
  {
    field: "zatcaPayment_mode_name",
    headerName: t("ZATCA Payment Mode Name"),
    width: 180,
  },
  {
    field: "BRV_REF_NO",
    headerName: t("BRV Reference No"),
    width: 150,
  },
  {
    field: "TransactionDate",
    headerName: t("Transaction Date"),
    width: 200,
  },
];



export const posArchiveColumns = (t)=> [
  {
    field: "CustomerCode",
    headerName: t("Customer Code"),
    width: 150,
  },
  {
    field: "CustomerName",
    headerName: t("Customer Name"),
    width: 150,
  },
  {
    field: "DeliveryLocationCode",
    headerName: t("Delivery Location Code"),
    width: 180,
  },
  {
    field: "InvoiceNo",
    headerName: t("Invoice No"),
    width: 180,
  },
  {
    field: "MobileNo",
    headerName: t("Mobile No"),
    width: 180,
  },
  {
    field: "Remarks",
    headerName: t("Remarks"),
    width: 180,
  },
  {
    field: "SalesLocationCode",
    headerName: t("Sales Location Code"),
    width: 150,
  },
  {
    field: "TransactionCode",
    headerName: t("Transaction Code"),
    width: 180,
  },
  {
    field: "TransactionDate",
    headerName: t("Transaction Date"),
    width: 180,
  },


  
];



export const LanguageDataColumn = (t, i18n) => [
  {
    field: "key",
    headerName: t("Name[English]"),
    width: 300,
  },
  {
    field: "value",
    headerName: t("Name[Arabic]"),
    width: 300,
  },
];



export const posBulkCashreceiptInvoiceColumns = (t)=> [
  {
    field: "CustomerName",
    headerName: t("Customer Name"),
    width: 150,
  },
  {
    field: "DeliveryLocationCode",
    headerName: t("Delivery Location Code"),
    width: 180,
  },
  {
    field: "ItemSysID",
    headerName: t("Item System ID"),
    width: 150,
  },
  {
    field: "InvoiceNo",
    headerName: t("Invoice No"),
    width: 180,
  },
  {
    field: "DocNo",
    headerName: t("Document No"),
    width: 180,
  },
  {
    field: "AdjAmount",
    headerName: t("Adjustment Amount"),
    width: 180,
  },
  {
    field: "PendingAmount",
    headerName: t("Pending Amount"),
    width: 180,
  },
  {
    field: "AmountWithTax",
    headerName: t("Amount With Tax"),
    width: 180,
  },
  {
    field: "VatNumber",
    headerName: t("Vat Number (%)"),
    width: 180,
  },
  {
    field: "Head_SYS_ID",
    headerName: t("Head System ID"),
    width: 180,
  },
  {
    field: "TransactionCode",
    headerName: t("Transaction Code"),
    width: 150,
  },
  {
    field: "CustomerCode",
    headerName: t("Customer Code"),
    width: 180,
  },
  {
    field: "SalesLocationCode",
    headerName: t("Sales Location Code"),
    width: 180,
  },
  {
    field: "Remarks",
    headerName: t("Remarks"),
    width: 250,
  },
  {
    field: "TransactionType",
    headerName: t("Transaction Type"),
    width: 150,
  },
  {
    field: "UserID",
    headerName: t("User ID"),
    width: 150,
  },
  {
    field: "MobileNo",
    headerName: t("Mobile No"),
    width: 150,
  },
  {
    field: "zatcaPayment_mode_id",
    headerName: t("ZATCA Payment Mode ID"),
    width: 120,
  },
  {
    field: "zatcaPayment_mode_name",
    headerName: t("ZATCA Payment Mode Name"),
    width: 180,
  },
  {
    field: "TransactionDate",
    headerName: t("Transaction Date"),
    width: 200,
  },
];



export const posErrorLogsColumn =(t)=> [
  {
    field: "inDocumentNo",
    headerName: t("In Document No"),
    width: 180,
  },
  {
    field: "inRefSysId",
    headerName: t("In RefSys Id"),
    renderCell: GTINCell,
    width: 280,
  },
  {
    field: "srDocumentNo",
    headerName: t("SR DocumentNo"),
    width: 180,
  },
  {
    field: "srRefSysId",
    headerName: t("SR RefSysId"),
    width: 180,
  },
  {
    field: "transactionType",
    headerName: t("Transaction Type"),
    width: 180,
  },
  


]



export const taxSettingsColumn =(t)=> [
  {
    field: "taxAmount",
    headerName: t("Tax Settings"),
    width: 180,
  },
  {
    field: "createdAt",
    headerName: t("Created At"),
    width: 180,

    type: "dateTime",
    valueGetter: (params) => {
      // Convert the string date to a Date object
      return params.value ? new Date(params.value) : null;
    },
  },
  {
    field: "updatedAt",
    headerName: t("Updated At"),
    width: 180,
    type: "dateTime",
    valueGetter: (params) => {
      // Convert the string date to a Date object
      return params.value ? new Date(params.value) : null;
    },
  },
]


export const supplierColumn = (t) => [
  {
    field: "name",
    headerName: t("Supplier Name"),
    width: 250,
  },
  {
    field: "email",
    headerName: t("Email"),
    width: 280,
  },
  {
    field: "status",
    headerName: t("Status"),
    renderCell: (params) => {
      const status = params.value?.toLowerCase();
      const style = {
        backgroundColor: 
          status === "approved" ? "green" : 
          status === "pending" ? "orange" : 
          "red",
        color: "white",
        borderRadius: "30px",
        padding: "2px 10px",
        textTransform: "capitalize",
        border: "1px solid white",
      };
      return <div style={style}>{params.value}</div>;
    },
    width: 150,
  },
  {
    field: "createdAt",
    headerName: t("Created At"),
    renderCell: (params) => {
      return new Date(params.value).toLocaleDateString();
    },
    width: 150,
  },
  {
    field: "updatedAt",
    headerName: t("Updated At"),
    renderCell: (params) => {
      return new Date(params.value).toLocaleDateString();
    },
    width: 150,
  },
];