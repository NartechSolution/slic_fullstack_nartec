require("dotenv").config();

const axios = require("axios");

const TrxCodesType = require("../models/TrxCodesType");
const CustomError = require("../exceptions/customError");
const response = require("../utils/response");

exports.getAll = async (req, res, next) => {
  try {
    const filters = req.query; // Extract query parameters from the request
    const trxCodes = await TrxCodesType.fetchFiltered(filters);

    if (!trxCodes || trxCodes.length === 0) {
      const error = new CustomError("No transaction codes found!");
      error.statusCode = 404;
      throw error;
    }

    res
      .status(200)
      .json(
        response(
          200,
          true,
          "Transaction codes retrieved successfully",
          trxCodes
        )
      );
  } catch (error) {
    next(error);
  }
};

// exports.sync = async (req, res, next) => {
//   try {
//     // Extract Bearer token from the Authorization header
//     const authHeader = req.headers.authorization || req.headers.Authorization;
//     if (!authHeader || !authHeader.startsWith("Bearer ")) {
//       throw new CustomError("Authorization header is missing or invalid", 401);
//     }
//     const token = authHeader.split(" ")[1];

//     // Configuration for the external API request
//     const externalApiUrl =
//       "https://slicapi.oneerpcloud.com/oneerpreport/api/getapi";
//     const requestBody = {
//       filter: {
//         P_TXN_TYPE: "LTRFO",
//       },
//       M_COMP_CODE: "SLIC",
//       M_USER_ID: "SYSADMIN",
//       APICODE: "ListOfTransactionCode",
//       M_LANG_CODE: "ENG",
//     };
//     const headers = {
//       Authorization: `Bearer ${token}`,
//       "Content-Type": "application/json",
//     };

//     // Make the request to the external API
//     const externalApiResponse = await axios.post(
//       externalApiUrl,
//       JSON.stringify(requestBody),
//       {
//         headers,
//       }
//     );

//     console.log("response" + externalApiResponse);

//     if (!externalApiResponse.data || !Array.isArray(externalApiResponse.data)) {
//       throw new CustomError("Invalid response from external API", 500);
//     }

//     // Assuming the external API returns an array of transaction codes
//     const externalTrxCodes = externalApiResponse.data;

//     // Fetch all existing transaction codes from your database
//     const existingTrxCodes = await TrxCodesType.fetchAll();

//     // Create a map of existing codes for easy lookup
//     const existingCodesMap = new Map(
//       existingTrxCodes.map((code) => [code.code, code])
//     );

//     // Array to store new codes that need to be added
//     const newCodes = [];

//     // Iterate through external codes and check if they exist in your database
//     for (const externalCode of externalTrxCodes) {
//       if (!existingCodesMap.has(externalCode.code)) {
//         newCodes.push(externalCode);
//       }
//     }

//     // If there are new codes, add them to your database
//     if (newCodes.length > 0) {
//       await TrxCodesType.bulkCreate(newCodes);
//     }

//     res
//       .status(200)
//       .json(
//         response(
//           200,
//           true,
//           `Sync completed. ${newCodes.length} new codes added.`,
//           { addedCodes: newCodes }
//         )
//       );
//   } catch (error) {
//     if (error instanceof CustomError) {
//       return next(error);
//     }
//     error.message = "Server error occurred during sync";
//     next(error);
//   }
// };

exports.sync = async (req, res, next) => {
  try {
    // Extract Bearer token from the Authorization header
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new CustomError("Authorization header is missing or invalid", 401);
    }
    const token = authHeader.split(" ")[1];

    // const slic_erp_url = process.env.SLIC_ERP_URL;
    const slic_erp_url = "https://slicapi.oneerpcloud.com";

    // Configuration for the external API request
    const externalApiUrl = slic_erp_url + "/oneerpreport/api/getapi";
    const requestBody = {
      filter: { P_TXN_TYPE: "LTRFO" },
      M_COMP_CODE: "SLIC",
      M_USER_ID: "SYSADMIN",
      APICODE: "ListOfTransactionCode",
      M_LANG_CODE: "ENG",
    };
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    // Make the request to the external API
    let externalApiResponse;
    try {
      externalApiResponse = await axios.post(externalApiUrl, requestBody, {
        headers,
      });
    } catch (axiosError) {
      // Check if the error is due to expired token
      if (axiosError.response?.data === "Expired JWT token") {
        throw new CustomError(
          "External API token has expired. Please login again to get a new token.",
          401
        );
      }
      // Re-throw other axios errors with more context
      throw new CustomError(
        axiosError.response?.data || "Failed to connect to external API",
        axiosError.response?.status || 500
      );
    }

    // log CURL for externalApiResponse
    console.log("CURL for externalApiResponse:", {
      url: externalApiUrl,
      method: "POST",
      headers,
      data: requestBody,
    });

    if (!externalApiResponse.data || !Array.isArray(externalApiResponse.data)) {
      throw new CustomError("Invalid response from external API", 500);
    }

    // Map the response data to match your Prisma schema model
    const externalTrxCodes = externalApiResponse.data.map((item) => ({
      TXN_CODE: item.ListOfTransactionCod.TXN_CODE,
      TXN_NAME: item.ListOfTransactionCod.TXN_NAME,
      TXN_TYPE: requestBody.filter.P_TXN_TYPE, // You can adjust this if you need to map different types
    }));

    console.table(externalTrxCodes);

    // Fetch all existing transaction codes from your database
    const existingTrxCodes = await TrxCodesType.fetchAll();

    // Create a map of existing codes for easy lookup
    const existingCodesMap = new Map(
      existingTrxCodes.map((code) => [code.TXN_CODE, code])
    );

    // Array to store new codes that need to be added
    const newCodes = [];

    // Iterate through external codes and check if they exist in your database
    for (const externalCode of externalTrxCodes) {
      if (!existingCodesMap.has(externalCode.TXN_CODE)) {
        newCodes.push(externalCode);
      }
    }

    // If there are new codes, add them to your database
    if (newCodes.length > 0) {
      await TrxCodesType.bulkCreate(newCodes);
    }

    res
      .status(200)
      .json(
        response(
          200,
          true,
          `Sync completed. ${newCodes.length} new codes added.`,
          { addedCodes: newCodes }
        )
      );
  } catch (error) {
    next(error);
  }
};

exports.filterByLocation = async (req, res, next) => {
  try {
    const { locationCode } = req.query;

    if (!locationCode) {
      const error = new CustomError("Location code is required!");
      error.statusCode = 400;
      throw error;
    }

    const filteredTrxCodes = await TrxCodesType.filterByLocationCode(
      locationCode
    );

    if (!filteredTrxCodes || filteredTrxCodes.length === 0) {
      const error = new CustomError(
        `No transaction codes found for location code: ${locationCode}`
      );
      error.statusCode = 404;
      throw error;
    }

    res
      .status(200)
      .json(
        response(
          200,
          true,
          `Transaction codes for location code ${locationCode} retrieved successfully`,
          filteredTrxCodes
        )
      );
  } catch (error) {
    next(error);
  }
};
