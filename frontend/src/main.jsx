import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './i18n';
import ApiErrorDialog from './components/ApiErrorDialog/ApiErrorDialog.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
    
  <React.StrictMode>
      <App />
    <ToastContainer />
    <ApiErrorDialog />
  </React.StrictMode>,
)

