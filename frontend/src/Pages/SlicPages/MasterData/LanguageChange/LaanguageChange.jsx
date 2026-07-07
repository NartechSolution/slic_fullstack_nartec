import React, { useContext, useEffect, useState } from 'react'
import EditIcon from "@mui/icons-material/Edit";
import { useTranslation } from "react-i18next";
import AddLanguageChange from './AddLanguageChange';
import UpdataLanguageChange from './UpdataLanguageChange';
import { DataTableContext } from '../../../../Contexts/DataTableContext';
import DataTable from '../../../../components/Datatable/Datatable';
import { LanguageDataColumn } from '../../../../utils/datatablesource';
import SideNav from '../../../../components/Sidebar/SideNav';
import newRequest from '../../../../utils/userRequest';

const LaanguageChange = () => {
    const { t, i18n } = useTranslation();
    const [isLoading, setIsLoading] = useState(true);
    const [data, setData] = useState([]);

    const [isCreatePopupVisible, setCreatePopupVisibility] = useState(false);
    const handleShowCreatePopup = () => {
        setCreatePopupVisibility(true);
    };

    const [isUpdatePopupVisible, setUpdatePopupVisibility] = useState(false);
    const handleShowUpdatePopup = (row) => {
        setUpdatePopupVisibility(true);
        sessionStorage.setItem("updatelanguageData", JSON.stringify(row));
    };
    const {
      setTableSelectedRows,
    } = useContext(DataTableContext);

    const refreshcitiesData = async () => {
      try {
        const response = await newRequest.get("/language/translations_table");
        const resdata = response?.data?.data;
        setData(resdata);
        // console.log(resdata);      
        setIsLoading(false)
      } 
      catch (err) {
        setIsLoading(false)
      }
    };

    useEffect(() => {
      refreshcitiesData();
    }, []);

    const handleRowClickInParent = (item) => {
      if (!item || item?.length === 0) {
        setTableSelectedRows(data)
        return
      }
    }
   
    return (
      <div>
        <SideNav>
          <div className={`p-0 h-full`}>            
            <div className='flex justify-center items-center'>
              <div className="h-auto w-[97%] px-0 pt-4">
                <div className="h-auto w-full p-0 bg-white shadow-xl rounded-md">
                  <div className={`flex  sm:justify-start items-center flex-wrap gap-2 py-7 px-3 ${i18n.language === 'ar' ? 'flex-row-reverse justify-start' : 'flex-row justify-start'}`}>
                    <button
                      onClick={handleShowCreatePopup}
                      className="rounded-full bg-secondary font-body px-5 py-1 text-sm mb-3 text-white transition duration-200 hover:bg-primary">
                      <i className="fas fa-plus mr-2"></i>{t('Add')}
                    </button>             
                  </div>
                
                <div style={{ marginLeft: '-11px', marginRight: '-11px' }}>
                  <DataTable 
                    data={data}
                    title={t('Language')}
                    columnsName={LanguageDataColumn(t)}
                    loading={isLoading}
                    secondaryColor="secondary"
                    handleRowClickInParent={handleRowClickInParent}
                    dropDownOptions={[
                      {
                        label: t("Edit"),
                        icon: (
                          <EditIcon
                            fontSize="small"
                            color="action"
                            style={{ color: "rgb(37 99 235)" }}
                          />
                        ),
                        action: handleShowUpdatePopup,
                      },
                    ]}
                    uniqueId="gtinMainTableId"
                   />
                </div>
              </div>
            </div>
          </div>

          {/* Addunit component with handleShowCreatePopup prop */}
          {isCreatePopupVisible && (
            <AddLanguageChange 
              isVisible={isCreatePopupVisible} 
              setVisibility={setCreatePopupVisibility} 
              refreshBrandData={refreshcitiesData} 
            />
          )}
          
          {isUpdatePopupVisible && (
            <UpdataLanguageChange 
              isVisible={isUpdatePopupVisible} 
              setVisibility={setUpdatePopupVisibility} 
              refreshBrandData={refreshcitiesData} 
            />
          )}

        </div>
      </SideNav>
    </div>
    )
}

export default LaanguageChange