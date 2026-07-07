import React from "react";
import { useQuery, useMutation } from "react-query";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import SideNav from "../../../components/Sidebar/SideNav";
import { supplierColumn } from "../../../utils/datatablesource";
import DeleteIcon from "@mui/icons-material/Delete";
import { MdCheckCircle, MdCancel } from "react-icons/md";
import DataTable from "../../../components/Datatable/Datatable";
import RightDashboardHeader from "../../../components/RightDashboardHeader/RightDashboardHeader";
import newRequest from "../../../utils/userRequest";
import { useTranslation } from "react-i18next";

const SupplierList = () => {
  const { t } = useTranslation();

  // React Query fetch function
  const fetchSuppliers = async () => {
    const response = await newRequest.get("/suppliers/v1?page=1&limit=1000");
    return response?.data?.data?.suppliers || [];
  };

  const { 
    data = [], 
    isLoading, 
    isError, 
    error, 
    refetch, 
    isFetching 
  } = useQuery({
    queryKey: ['suppliers'],
    queryFn: fetchSuppliers,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    onError: (err) => {
      toast.error(err?.response?.data?.error || err?.response?.data?.message || "Failed to load data");
    },
  });

  // Approve supplier mutation
  const approveMutation = useMutation({
    mutationFn: async (supplierId) => {
      const response = await newRequest.put(
        `/suppliers/v1/${supplierId}/status`,
        { status: "approved" }
      );
      return response.data;
    },
    onSuccess: () => {
      toast.success("Supplier approved successfully!");
      refetch();
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error || err?.response?.data?.message || "Failed to approve supplier");
    },
  });

  // Reject supplier mutation
  const rejectMutation = useMutation({
    mutationFn: async (supplierId) => {
      const response = await newRequest.put(
        `/suppliers/v1/${supplierId}/status`,
        { status: "rejected" }
      );
      return response.data;
    },
    onSuccess: () => {
      toast.success("Supplier rejected successfully!");
      refetch();
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error || err?.response?.data?.message || "Failed to reject supplier");
    },
  });

  // Delete supplier mutation
  const deleteMutation = useMutation({
    mutationFn: async (supplierId) => {
      const response = await newRequest.delete(`/suppliers/v1/${supplierId}`);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Supplier deleted successfully!");
      refetch();
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error || err?.response?.data?.message || "Failed to delete supplier");
    },
  });

  // Action handlers
  const handleApprove = (row) => {
    Swal.fire({
      title: `${t('Are you sure?')}`,
      text: `${t('Do you want to approve this supplier?')}`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: `${t('Yes, Approve!')}`,
      cancelButtonText: `${t('No, Cancel')}`,
      confirmButtonColor: '#10B981',
      cancelButtonColor: '#6B7280',
    }).then((result) => {
      if (result.isConfirmed) {
        approveMutation.mutate(row.id);
      }
    });
  };

  const handleReject = (row) => {
    Swal.fire({
      title: `${t('Are you sure?')}`,
      text: `${t('Do you want to reject this supplier?')}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: `${t('Yes, Reject!')}`,
      cancelButtonText: `${t('No, Cancel')}`,
      confirmButtonColor: '#F59E0B',
      cancelButtonColor: '#6B7280',
    }).then((result) => {
      if (result.isConfirmed) {
        rejectMutation.mutate(row.id);
      }
    });
  };

  const handleDelete = (row) => {
    Swal.fire({
      title: `${t('Are you sure to delete this record?')}!`,
      text: `${t('You will not be able to recover this Supplier!')}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: `${t('Yes Delete!')}`,
      cancelButtonText: `${t('No, keep it!')}`,
      confirmButtonColor: '#1E3B8B',
      cancelButtonColor: '#FF0032',
    }).then((result) => {
      if (result.isConfirmed) {
        deleteMutation.mutate(row.id);
      }
    });
  };

  const handleRowClickInParent = (item) => {
    if (!item || item?.length === 0) {
      return;
    }
  };


  const filterDropdownOptions = (row, dropDownOptions) => {
    if (row?.status === "approved") {
      return dropDownOptions.filter((option) => option.label !== "Approve" && option.label !== "Reject");
    }
    if (row?.status === "pending") {
      return dropDownOptions;
    }
  };

  return (
    <div>
      <SideNav>
        <div>
          <RightDashboardHeader title={t("Supplier List")} />
        </div>

        <div className="h-auto w-full">
          <div className="h-auto w-full p-0 bg-white shadow-xl rounded-md pb-10">
            <div style={{ marginTop: "-15px" }}>
              <DataTable
                data={data}
                title={t("Supplier List")}
                columnsName={supplierColumn(t)}
                loading={isLoading || isFetching || approveMutation.isLoading || rejectMutation.isLoading || deleteMutation.isLoading}
                secondaryColor="secondary"
                uniqueId="customerListId"
                handleRowClickInParent={handleRowClickInParent}
                getFilteredOptions={filterDropdownOptions}
                checkboxSelection="disabled"
                dropDownOptions={[
                  {
                    label: t("Approve"),
                    icon: (
                      <MdCheckCircle
                        fontSize="22px"
                        color="green"
                      />
                    ),
                    action: handleApprove,
                  },
                  {
                    label: t("Reject"),
                    icon: (
                      <MdCancel
                        fontSize="22px"
                        color="orange"
                      />
                    ),
                    action: handleReject,
                  },
                  {
                    label: t("Delete"),
                    icon: (
                      <DeleteIcon
                        fontSize="small"
                        color="action"
                        style={{ color: "red" }}
                      />
                    ),
                    action: handleDelete,
                  },
                ]}
              />
            </div>
          </div>
        </div>
      </SideNav>
    </div>
  );
};

export default SupplierList;