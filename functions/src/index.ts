/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */
import * as functions from "firebase-functions";
import {onCall, onRequest} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {initializeApp} from "firebase-admin/app";

import {
  Configuration,
  CountryCode,
  InstitutionsGetByIdRequest,
  InstitutionsGetRequest,
  InstitutionsSearchRequest,
  PlaidApi,
  PlaidEnvironments,
  Products,
} from "plaid";
import {firestore} from "firebase-admin";

const configuration = new Configuration({
  basePath: PlaidEnvironments.sandbox,
  baseOptions: {
    headers: {
      "PLAID_CLIENT_ID": process.env.PLAID_CLIENT_ID,
      "PLAID_SECRET": process.env.PLAID_SANDBOX_KEY,
    },
  },
});
const plaidClient = new PlaidApi(configuration);

initializeApp();
const db = firestore();

// nifty little function that creates a user document for when someone signs up
export const createUserDocument = functions.auth.user().onCreate((user) => {
  const userData = {
    ...user.toJSON(), // Convert user object to JSON
    apiResets: 200, // Initialize apiResets field with null
    apiCallsLimit: 0, // Initialize apiCallsLimit field with 0
  };

  return db.collection("users").doc(user.uid).set(userData);
});

exports.protectedHelloWorld = onCall(
  {
    // Reject requests with missing or invalid App Check tokens.
    enforceAppCheck: true,
  },
  (request) => {
    // request.app contains data from App Check, including the app ID.
    // Your function logic follows.
    console.log("received request from app", request.app?.appId);
  }
);

export const helloWorld = onRequest((request, response) => {
  logger.info("Hello logs!", {structuredData: true});
  response.send("Hello from Firebase!");
});

// problem with these functions is that they would timeout rather than actually finish
// they will log everything in console, but still would timeout instead of finishing execution
// https://plaid.com/docs/api/institutions/#institutionsget
exports.insitutionGet = onRequest(
  {
    // Reject requests with missing or invalid App Check tokens.
    enforceAppCheck: true,
  },
  async (request, response) => {
    const procRequest: InstitutionsGetRequest = {
      count: 1, // request.query.count
      offset: 0, // request.query.offset
      country_codes: [CountryCode.Us], // request.query.codes
    };
    try {
      const response = await plaidClient.institutionsGet(procRequest);
      const institutions = response.data.institutions;
      // need to figure out how to send proper response
      console.log(institutions);
    } catch (error) {
      response.send("Error in getting institutions");
    }
  });
// https://plaid.com/docs/api/institutions/#institutionsget_by_id
exports.insitutionGetById = onRequest(
  {
    // Reject requests with missing or invalid App Check tokens.
    enforceAppCheck: true,
  },
  async (request, response) => {
    const procRequest: InstitutionsGetByIdRequest = {
      institution_id: "ins_109512",
      country_codes: [CountryCode.Us],
    };
    try {
      const response = await plaidClient.institutionsGetById(procRequest);
      const institution = response.data.institution;
      // need to figure out how to send proper response
      console.log(institution);
    } catch (error) {
      response.send("Error in getting institution");
    }
  });
// https://plaid.com/docs/api/institutions/#institutionssearch
exports.institutionsSearch = onRequest(
  {
    // Reject requests with missing or invalid App Check tokens.
    enforceAppCheck: true,
  },
  async (request, response) => {
    const procRequest: InstitutionsSearchRequest = {
      query: "ins_118923",
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
    };
    try {
      const response = await plaidClient.institutionsSearch(procRequest);
      const institution = response.data.institutions;
      // need to figure out how to send proper response
      console.log(institution);
    } catch (error) {
      response.send("Error in getting institution");
    }
  });

// ex: http://127.0.0.1:5001/cs411-63def/us-central1/helloWorld?name=bob&id=1234
// if u do console.log(request.query.name); and console.log(request.query.id);
// console logs bob for name and 1234 for id
