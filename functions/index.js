const cors = require('cors');
const express = require('express');
const functions = require('firebase-functions');
const firebase = require('firebase');
const config = require('./utils/config');

const usersPath = require('./routes/users');
const diabloPath = require('./routes/diablo');
const bot = require('./utils/telegram');

const app = express();
firebase.initializeApp(config);
bot.launch();

app.use(cors({ origin: true }));
app.use(express.json());

require('./controllers/telegram');
app.use('/users', usersPath);
app.use('/diablo', diabloPath);

bot.catch((error, ctx) => {
    console.log(`Ooops, encountered an error for ${ctx.updateType}`, error);
    bot.telegram.sendMessage(ctx.chat.id, `ERROR: ${error.message}`);
});

app.use((error, req, res, next) => {
    const statusCode = res.statusCode === 200 ? 400 : res.statusCode;
    console.error(error);
    res.status(statusCode);
    res.json({
        message: error.message,
    });
});

exports.api = functions.https.onRequest(app);
