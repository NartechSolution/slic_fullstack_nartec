
import axios from "axios";
import { baseUrl } from './config.jsx';
import { attachApiErrorTracking } from './apiErrorHandler.jsx';

const ErpTeamRequest = axios.create({
    baseURL: baseUrl,
    // withCredentials: true,
});

attachApiErrorTracking(ErpTeamRequest);

export default ErpTeamRequest;