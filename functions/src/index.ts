/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */
import * as functions from "firebase-functions";
import {CallableRequest, onCall} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import {firestore} from "firebase-admin";
import {Timestamp} from "firebase-admin/firestore";

// https://github.com/firebase/firebase-admin-node/discussions/1959#discussioncomment-3985176
import {
    AccountsGetRequest,
    Configuration,
    CountryCode,
    IdentityGetRequest,
    InstitutionsGetByIdRequest,
    InstitutionsGetRequest,
    InstitutionsSearchRequest,
    LinkTokenCreateRequest,
    PlaidApi,
    PlaidEnvironments,
    Products,
    TransactionsGetRequest,
    TransactionsSyncRequest,
} from "plaid";
import DocumentReference = firestore.DocumentReference;
import DocumentSnapshot = firestore.DocumentSnapshot;

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
            products: [Products.Auth, Products.Transactions, Products.Identity],
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
// https://plaid.com/docs/api/products/identity/#identityget
exports.getIdentity = onCall(
    {
        enforceAppCheck: false,
    },
    async (request: CallableRequest<any>) => {
        if (!request.auth || !request.auth.uid) {
            logger.error("Error in getting auth uid");
            return {error: "Error in getting auth uid"};
        }
        const userDoc = await admin.firestore().collection("users").doc(request.auth.uid).get();
        const accessToken = userDoc.data()?.plaidAccessToken;
        if (accessToken == null) {
            logger.error("invalid plaidAccessToken");
            return {error: "invalid plaidAccessToken"};
        }
        try {
            const procRequest: IdentityGetRequest = {
                access_token: accessToken,
            };
            const response = await plaidClient.identityGet(procRequest);
            const identities = response.data.accounts.flatMap(
                (account) => account.owners,
            );
            logger.log(identities);
            return {identities: identities};
        } catch (error) {
            return {error: error};
        }
    }
);
// https://plaid.com/docs/api/products/balance/#accountsbalanceget
exports.getAccountBal = onCall(
    {
        enforceAppCheck: false,
    },
    async (request: CallableRequest<any>) => {
        if (!request.auth || !request.auth.uid) {
            logger.error("Error in getting auth uid");
            return {error: "Error in getting auth uid"};
        }
        const userDoc = await admin.firestore().collection("users").doc(request.auth.uid).get();
        const accessToken = userDoc.data()?.plaidAccessToken;
        if (accessToken == null) {
            logger.error("invalid plaidAccessToken");
            return {error: "invalid plaidAccessToken"};
        }
        try {
            const procRequest: AccountsGetRequest = {
                access_token: accessToken,
            };
            const response = await plaidClient.accountsBalanceGet(procRequest);
            const accounts = response.data.accounts;
            logger.log(accounts);
            return {accounts: accounts};
        } catch (error) {
            return {error: error};
        }
    }
);

// https://plaid.com/docs/api/products/transactions/#transactionsget
exports.getTransactions = onCall(
    {
        enforceAppCheck: false,
    },
    async (request) => {
        if (!request.auth || !request.auth.uid) {
            logger.error("Error in getting auth uid");
            return {error: "Error in getting auth uid"};
        }
        const userDoc = await admin.firestore().collection("users").doc(request.auth.uid).get();
        const accessToken = userDoc.data()?.plaidAccessToken;
        if (accessToken == null) {
            logger.error("invalid plaidAccessToken");
            return {error: "invalid plaidAccessToken"};
        }
        const procRequest: TransactionsGetRequest = {
            access_token: accessToken,
            start_date: "2018-01-01", // will figure out how request will take them later
            end_date: "2020-02-01",
        };
        try {
            const response = await plaidClient.transactionsGet(procRequest);
            const transactions = response.data.transactions;
            // const total_transactions = response.data.total_transactions;
            return {transactions: transactions};
        } catch (error) {
            return {error: error};
        }
    }
);
// a better version of the above call, but I'm still comprehending it
exports.syncTransactions = onCall(
    {
        enforceAppCheck: false,
    },
    async (request) => {
        if (!request.auth || !request.auth.uid) {
            logger.error("Error in getting auth uid");
            return {error: "Error in getting auth uid"};
        }
        const userDoc = await admin.firestore().collection("users").doc(request.auth.uid).get();
        const accessToken = userDoc.data()?.plaidAccessToken;
        if (accessToken == null) {
            logger.error("invalid plaidAccessToken");
            return {error: "invalid plaidAccessToken"};
        }
        try {
            // will see how I can implement this with our database
            /*
            let cursor = database.getLatestCursorOrNull(itemId);
            let added: Array<Transaction> = [];
            let modified: Array<Transaction> = [];
            let removed: Array<RemovedTransaction> = [];
            let hasMore = true;
            while (hasMore) {
            const request: TransactionsSyncRequest = {
                access_token: accessToken,
                cursor: cursor,
            };
            const response = await client.transactionsSync(request);
            const data = response.data;
            // Add this page of results
            added = added.concat(data.added);
            modified = modified.concat(data.modified);
            removed = removed.concat(data.removed);
            hasMore = data.has_more;
            // Update cursor to the next cursor
            cursor = data.next_cursor;
            }
            // Persist cursor and updated data
            database.applyUpdates(itemId, added, modified, removed, cursor);*/
            const procRequest: TransactionsSyncRequest = {
                access_token: accessToken,
            };
            const response = await plaidClient.transactionsSync(procRequest);
            const data = response.data;
            return {data: data};
        } catch (error) {
            return {error: error};
        }
    }
);
// https://plaid.com/docs/api/products/transactions/#categoriesget
exports.getCategories = onCall(
    {
        enforceAppCheck: false,
    },
    async (request) => {
        try {
            const response = await plaidClient.categoriesGet({});
            return response.data.categories;
        } catch (error) {
            return error;
        }
    }
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
            await userDoc.set({
                plaidAccessToken: response.data.access_token,
                itemID: response.data.item_id,
            }, {merge: true});
            return {success: "Access token saved"};
        } catch (error) {
            logger.error("Error in saving access token:", error);
            return {error: "Error in saving access token"};
        }
    },
);

exports.hasToken = onCall(
    {
        enforceAppCheck: true,
    },
    async (request: CallableRequest<any>) => {
        if (!request.auth || !request.auth.uid) {
            logger.error("Error in getting auth uid");
            return {error: "Error in getting auth uid"};
        }
        const userDoc = await admin.firestore().collection("users").doc(request.auth.uid).get();
        const accessToken = userDoc.data()?.plaidAccessToken;
        if (accessToken == null) {
            return {result: false};
        }
        return {result: true};
    },
);

// these are test/debug functions
// will implement properly if found use for it

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

exports.chatWithGPT = onCall(
    {
        enforceAppCheck: true,
    },
    async (request) => {
        // user who called us:
        const user = request.auth?.uid;
        if (!user) {
            return {error: "User not found"};
        }
        console.log(request.data);
        const path = `users/${user}/messages`;
        const ref: DocumentReference = await admin
            .firestore()
            .collection(path)
            .add({
                prompt: request.data.prompt,
                parentMessageId: request.data.parentMessageId ? request.data.parentMessageId : null,
            });
        const snap: DocumentSnapshot = await ref.get();
        if (snap.get("response")) {
            console.log(`RESPONSE: ${snap.get("response")}`);
            return {response: snap.get("response")};
        } else {
            return {response: "No response yet"};
        }
        // ref.onSnapshot((snap: DocumentSnapshot) => {
        //     if (snap.get("response")) {
        //         console.log(`RESPONSE: ${snap.get("response")}`);
        //         return {response: snap.get("response")};
        //     } else {
        //         return {response: "No response yet"};
        //     }
        // });
        // return;
    },
);
