const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

/**
 * Listens for any write to a user document in Firestore.
 * If the user's 'role' field is set to 'admin', it grants them a custom authentication claim.
 * This claim is what the Admin Dashboard checks for upon login.
 */
exports.setAdminClaim = functions.firestore
    .document('users/{userId}')
    .onWrite(async (change, context) => {
        const userId = context.params.userId;
        const newData = change.after.data();

        // If the document is deleted, do nothing.
        if (!newData) {
            return null;
        }

        const role = newData.role;

        try {
            // Check if the role is 'admin'
            if (role === 'admin') {
                // Set custom user claims on the auth token.
                await admin.auth().setCustomUserClaims(userId, { role: 'admin' });
                console.log(`SUCCESS: Custom claim set for user ${userId}. They are now an admin.`);
            } else {
                // If the role is removed, remove the custom claim.
                await admin.auth().setCustomUserClaims(userId, null);
                console.log(`INFO: Custom claim removed for user ${userId}.`);
            }
            return null;
        } catch (error) {
            console.error("FAILURE: Error setting custom claim: ", error);
            return null;
        }
    });