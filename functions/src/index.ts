/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */
import * as functions from "firebase-functions";
import {onCall} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import {Timestamp} from "firebase-admin/firestore";

// https://github.com/firebase/firebase-admin-node/discussions/1959#discussioncomment-3985176
import {
  //AccountsGetRequest,
    Configuration,
    CountryCode,
    InstitutionsGetByIdRequest,
    InstitutionsGetRequest,
    InstitutionsSearchRequest,
    LinkTokenCreateRequest,
    PlaidApi,
    PlaidEnvironments,
    Products,
    //TransactionsGetRequest,
} from "plaid";

const configuration = new Configuration({
    basePath: PlaidEnvironments.sandbox,
    baseOptions: {
        headers: {
            "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID,
            "PLAID-SECRET": process.env.PLAID_SANDBOX_KEY,
        },
    },
});
const plaidClient = new PlaidApi(configuration);
//const accessToken = "";
admin.initializeApp();

// nifty little function that creates a user document for when someone signs up
export const onUserCreate = functions.auth.user().onCreate(async (user) => {
    const {uid, email, displayName} = user;

    const date = new Date();
    date.setHours(date.getHours() + 1);
    const timeStamp = Timestamp.fromDate(date);

    try {
        await admin.firestore().collection("users").doc(uid).set(
            {
                email,
                displayName,
                uid,
                apiCallLimit: 20,
                limitResetsAt: timeStamp,
                plaidToken: null,
            },
            {merge: true},
        );
        logger.log("User document created for:", email);
    } catch (error) {
        logger.error("Error updating user fields:", error);
    }
});

exports.protectedHelloWorld = onCall(
    {
        // Reject requests with missing or invalid App Check tokens.
        enforceAppCheck: true,
    },
    (request) => {
        // request.app contains data from App Check, including the app ID.
        // Your function logic follows.
        logger.log("Hello logs!");
        return "Hello " + request.data.name;
    },
);

exports.createNewLinkToken = onCall(
    {
        enforceAppCheck: false,
    },
    async (request) => {
        // hardcode user id for now - need to get their firebase auth uid
        const realClientUserId = request.auth?.uid || "auth is undefined :(";
        if (realClientUserId === "auth is undefined :(") {
            logger.error("Error in getting auth uid");
            return {error: "Error in getting auth uid"};
        }
        logger.info("Real client user id:", realClientUserId);
        const linkTokenRequest: LinkTokenCreateRequest = {
            user: {
                client_user_id: realClientUserId,
            },
            client_name: "FiFi",
            products: [Products.Auth],
            language: "en",
            country_codes: [CountryCode.Us],
        };
        try {
            const createTokenResponse = await plaidClient.linkTokenCreate(linkTokenRequest);
            return createTokenResponse.data;
        } catch (error) {
            logger.error("Error in creating link token:", error);
        }
        return {error: "Error in creating link token"};
    },
);
// will be uncommented once I figure out how accessToken works
/*
exports.accountBalGet = onCall(
  {
    enforceAppCheck: false,
  },
  async(request) => {
    const procRequest: AccountsGetRequest = {
      access_token: accessToken,
    };
    try {
      const response = await plaidClient.accountsBalanceGet(procRequest);
      const accounts = response.data.accounts;
      logger.log(accounts);
      return {accounts: accounts};
    } catch (error) {
      return {error: error};
    }
  }

)
exports.transactionsGet = onCall (

  {
    enforceAppCheck: false,
  },
  async(request) => {
    const procRequest: TransactionsGetRequest = {
      access_token: accessToken,
      start_date: '2018-01-01',
      end_date: '2020-02-01'
    };
    try {
      const response = await plaidClient.transactionsGet(procRequest);
      let transactions = response.data.transactions;
      //const total_transactions = response.data.total_transactions;
      return {transactions: transactions};
    } catch (error) {
      return {error: error};
    }
  }
)
*/
exports.getCategories = onCall(
  {
    enforceAppCheck: false,
  },
  async (request) => {
    try {
      const response = await plaidClient.categoriesGet({});
      const categories = response.data.categories;
      return categories;
    } catch (error) {
      return error;
    }
  }
)

// problem with these functions is that they would timeout rather than actually finish
// they will log everything in console, but still would timeout instead of finishing execution
// https://plaid.com/docs/api/institutions/#institutionsget
exports.institutionGet = onCall(
    {
        // Reject requests with missing or invalid App Check tokens.
        enforceAppCheck: false,
    },
    async (request) => {
        const procRequest: InstitutionsGetRequest = {
            count: 1, // request.query.count
            offset: 0, // request.query.offset
            country_codes: [CountryCode.Us], // request.query.codes
        };
        try {
            const response = await plaidClient.institutionsGet(procRequest);
            const institutions = response.data.institutions;
            // need to figure out how to send proper response
            logger.log(institutions);
            return institutions;
        } catch (error) {
            return error;
        }
    },
);
// https://plaid.com/docs/api/institutions/#institutionsget_by_id
exports.institutionGetById = onCall(
    {
        // Reject requests with missing or invalid App Check tokens.
        enforceAppCheck: false,
    },
    async (request) => {
        const procRequest: InstitutionsGetByIdRequest = {
            institution_id: "ins_109512",
            country_codes: [CountryCode.Us],
        };
        try {
            const response = await plaidClient.institutionsGetById(procRequest);
            const institution = response.data.institution;
            // need to figure out how to send proper response
            logger.info(institution);
            return {institution: institution};
        } catch (error) {
            return {error: error};
        }
    },
);
// https://plaid.com/docs/api/institutions/#institutionssearch
exports.institutionsSearch = onCall(
    {
        // Reject requests with missing or invalid App Check tokens.
        enforceAppCheck: true,
    },
    async (request) => {
        const procRequest: InstitutionsSearchRequest = {
            query: "ins_118923",
            products: [Products.Transactions],
            country_codes: [CountryCode.Us],
        };
        try {
            const response = await plaidClient.institutionsSearch(procRequest);
            const institution = response.data.institutions;
            // need to figure out how to send proper response
            logger.info(institution);
            return institution;
        } catch (error) {
          return error;
        }
    },
);

// ex: http://127.0.0.1:5001/cs411-63def/us-central1/helloWorld?name=bob&id=1234
// if u do logger.info(request.query.name); and logger.info(request.query.id);
// console logs bob for name and 1234 for id
