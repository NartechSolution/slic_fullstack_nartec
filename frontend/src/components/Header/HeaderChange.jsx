import React from 'react'
import sliclogo from "../../Images/slic-logo.png"
import { useNavigate } from 'react-router-dom'

const HeaderChange = () => {

  const navigate = useNavigate()

  return (
    <div>

      <div className='sticky top-0 z-50 bg-white'>
        <div className={`h-auto w-full bg-gray-100 flex flex-col sm:flex-row justify-between items-center px-4 py-4 `}>
          {/* Logo and Text */}
          <div className='flex items-center flex-wrap mb-4 sm:mb-0'>
            <img onClick={() => navigate('/')} src={sliclogo} className='h-14 w-auto object-contain cursor-pointer' alt='' />
          </div>
        </div>
      </div>
      {/* End Nav */}
    </div>
  )
}

export default HeaderChange