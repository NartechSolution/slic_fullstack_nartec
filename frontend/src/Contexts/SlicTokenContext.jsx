import React, { createContext, useContext, useEffect, useCallback, useRef } from 'react';
import ErpTeamRequest from '../utils/ErpTeamRequest';

// Create the context
const SlicTokenContext = createContext();

// Custom hook to use the context
export const useSlicToken = () => {
    const context = useContext(SlicTokenContext);
    if (!context) {
        throw new Error('useSlicToken must be used within a SlicTokenProvider');
    }
    return context;
};

// Provider component
export const SlicTokenProvider = ({ children }) => {
    const intervalRef = useRef(null);
    const isRefreshingRef = useRef(false);

    // Function to handle SLIC login and token generation
    const handleSlicLogin = useCallback(async () => {
        // Prevent multiple simultaneous requests
        if (isRefreshingRef.current) {
            return;
        }

        isRefreshingRef.current = true;

        try {
            const response = await ErpTeamRequest.post(
                '/slicuat05api/v1/slicLogin',
                {
                    apiKey: 'b4d21674cd474705f6caa07d618b389ddc7ebc25a77a0dc591f49e9176beda01',
                },
                {
                    headers: {
                        'X-tenanttype': 'live',
                    },
                }
            );

            // Save token to sessionStorage
            sessionStorage.setItem(
                'slicLoginToken',
                JSON.stringify(response?.data?.token)
            );

            // console.log('SLIC token refreshed successfully');
        } catch (error) {
            // console.error('Error refreshing SLIC token:', error);

            // For example, clear the token if refresh fails
            if (error?.response?.status === 401 || error?.response?.status === 403) {
                sessionStorage.removeItem('slicLoginToken');
            }
        } finally {
            isRefreshingRef.current = false;
        }
    }, []);

    // Function to start auto-refresh
    const startTokenRefresh = useCallback(() => {
        // Clear any existing interval
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }

        // Initial token fetch
        handleSlicLogin();

        // Set up interval to refresh token every 2 minutes (120000ms)
        intervalRef.current = setInterval(() => {
            handleSlicLogin();
        }, 120000); // 2 minutes

        // console.log('Token auto-refresh started (every 2 minutes)');
    }, [handleSlicLogin]);

    // Function to stop auto-refresh
    const stopTokenRefresh = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
            // console.log('Token auto-refresh stopped');
        }
    }, []);

    // Function to manually refresh token
    const refreshToken = useCallback(() => {
        handleSlicLogin();
    }, [handleSlicLogin]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, []);

    const value = {
        startTokenRefresh,
        stopTokenRefresh,
        refreshToken,
        handleSlicLogin,
    };

    return (
        <SlicTokenContext.Provider value={value}>
            {children}
        </SlicTokenContext.Provider>
    );
};

export default SlicTokenContext;