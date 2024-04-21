/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */
import * as functions from "firebase-functions";
import {CallableRequest, onCall, onRequest} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import {Timestamp} from "firebase-admin/firestore";

// https://github.com/firebase/firebase-admin-node/discussions/1959#discussioncomment-3985176
import {
    Configuration,
    CountryCode,
    InstitutionsGetByIdRequest,
    InstitutionsGetRequest,
    InstitutionsSearchRequest,
    LinkTokenCreateRequest,
    PlaidApi,
    PlaidEnvironments,
    Products,
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
                plaidAccessToken: null,
                itemID: null,
            },
            {merge: true},
        );
        logger.log("User document created for:", email);
    } catch (error) {
        logger.error("Error updating user fields:", error);
    }
});

exports.createNewLinkToken = onCall(
    {
        enforceAppCheck: true,
    },
    async (request: CallableRequest<any>) => {
        if (!request.auth || !request.auth.uid) {
            logger.error("Error in getting auth uid");
            return {error: "Error in getting auth uid"};
        }
        const userID = request.auth.uid;
        logger.info("User id:", userID);
        const linkTokenRequest: LinkTokenCreateRequest = {
            user: {
                client_user_id: userID,
            },
            client_name: "FiFi",
            products: [Products.Auth],
            language: "en",
            country_codes: [CountryCode.Us],
        };
        try {
            const createTokenResponse = await plaidClient.linkTokenCreate(linkTokenRequest);
            logger.info("Link token created:", createTokenResponse.data);
            return {linkToken: createTokenResponse.data};
        } catch (error) {
            logger.error("Error in creating link token:", error);
        }
        return {error: "Error in creating link token"};
    },
);

exports.saveAccessToken = onCall(
    {
        enforceAppCheck: true,
    },
    async (request: CallableRequest<any>) => {
        if (!request.auth || !request.auth.uid) {
            logger.error("Error in getting auth uid");
            return {error: "Error in getting auth uid"};
        }

        const userDoc = admin.firestore().collection("users").doc(request.auth.uid);
        const response = await plaidClient.itemPublicTokenExchange({
            public_token: request.data.publicToken,
        });

        try {
            logger.log("request data public token: ", request.data.publicToken);
            logger.log("data: ", request.data);
            await userDoc.set({plaidAccessToken: response.data.access_token}, {merge: true});
            await userDoc.set({itemID: response.data.item_id}, {merge: true});
            return {success: "Access token saved"};
        } catch (error) {
            logger.error("Error in saving access token:", error);
            return {error: "Error in saving access token"};
        }
    },
);


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
            logger.log(institutions);
        } catch (error) {
            response.send("Error in getting institutions");
        }
    },
);
// https://plaid.com/docs/api/institutions/#institutionsget_by_id
exports.institutionGetById = onCall(
    {
        // Reject requests with missing or invalid App Check tokens.
        enforceAppCheck: true,
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
            return {error: "Error in getting institution"};
        }
    },
);
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
            logger.info(institution);
        } catch (error) {
            response.send("Error in getting institution");
        }
    },
);

// ex: http://127.0.0.1:5001/cs411-63def/us-central1/helloWorld?name=bob&id=1234
// if u do logger.info(request.query.name); and logger.info(request.query.id);
// console logs bob for name and 1234 for id
