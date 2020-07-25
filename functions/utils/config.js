const functions = require('firebase-functions');
let env = require('../env.json');

if (Object.keys(functions.config()).length) {
    env = functions.config();
}

module.exports = {
    apiKey: env.config.api_key,
    authDomain: env.config.auth_domain,
    databaseURL: env.config.database_url,
    projectId: env.config.project_id,
    storageBucket: env.config.storage_bucket,
    messagingSenderId: env.config.messaging_sender_id,
    appId: env.config.app_id,
    measurementId: env.config.measurement_id,
};
