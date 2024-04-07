/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {onCall, onRequest} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

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
