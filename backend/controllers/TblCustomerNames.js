const axios = require("axios");
const { SLIC_ERP_URL } = require("../config/envConfigs");
const Customer = require("../models/TblCustomerNames");
const CustomError = require("../exceptions/customError");
const response = require("../utils/response");

exports.getCustomerNames = async (req, res, next) => {
  try {
    const customers = await Customer.fetchAll();
    if (customers.length <= 0) {
      const error = new CustomError("Couldn't find any customers");
      error.statusCode = 404;
      throw error;
    }
    res
      .status(200)
      .json(response(200, true, "Records retrieved successfully", customers));
  } catch (error) {
    next(error);
  }
};

exports.getSearch = async (req, res, next) => {
  const { query } = req.query;
  try {
    const customers = await Customer.searchByPartialNameOrCode(query);

    if (!customers || customers.length <= 0) {
      const error = CustomError("No customers found!");
      error.statusCode = 404;
      throw error;
    }

    res.json(response(200, true, "Successfully found customers", customers));
  } catch (error) {
    next(error);
  }
};

exports.syncCustomers = async (req, res, next) => {
  try {
    // Extract Bearer token from the Authorization header
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new CustomError("Authorization header is missing or invalid", 401);
    }
    const token = authHeader.split(" ")[1];

    const slic_erp_url = SLIC_ERP_URL ?? process.env.SLIC_ERP_URL;

    // Configuration for the external API request
    const externalApiUrl = slic_erp_url + "/oneerpreport/api/getapi";
    const requestBody = {
      filter: {},
      M_COMP_CODE: "SLIC",
      M_USER_ID: "SYSADMIN",
      APICODE: "ACTIVECUSTLIST",
      M_LANG_CODE: "ENG",
    };
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    // Make the request to the external API
    const externalApiResponse = await axios.post(externalApiUrl, requestBody, {
      headers,
    });

    if (!externalApiResponse.data || !Array.isArray(externalApiResponse.data)) {
      throw new CustomError("Invalid response from external API", 500);
    }

    // Map the response data to match your Prisma schema model
    const externalCustomers = externalApiResponse.data.map((item) => ({
      CUST_CODE: item.ACTIVECUSTLIST.CUST_CODE,
      CUST_NAME: item.ACTIVECUSTLIST.CUST_NAME,
    }));

    // Fetch all existing customers from your database
    const existingCustomers = await Customer.fetchAll();

    // Create a map of existing customer codes for easy lookup
    const existingCodesMap = new Map(
      existingCustomers.map((customer) => [customer.CUST_CODE, customer])
    );

    // Array to store new customers that need to be added
    const newCustomers = [];

    // Iterate through external customers and check if they exist in your database
    for (const externalCustomer of externalCustomers) {
      if (!existingCodesMap.has(externalCustomer.CUST_CODE)) {
        newCustomers.push(externalCustomer);
      }
    }

    // If there are new customers, add them to your database
    if (newCustomers.length > 0) {
      await Customer.bulkCreate(newCustomers);
    }

    res
      .status(200)
      .json(
        response(
          200,
          true,
          `Sync completed. ${newCustomers.length} new customers added.`,
          { addedCustomers: newCustomers }
        )
      );
  } catch (error) {
    next(error);
  }
};
