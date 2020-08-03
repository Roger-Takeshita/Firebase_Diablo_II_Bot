const firebase = require('firebase');
const { db } = require('../utils/admin');
const bot = require('../utils/telegram');
const env = require('../env.json');
const { validateLoginData } = require('../utils/validators');

const groupId = env.config.telegram_group_id;

const formatObject = (body) => {
    const allowedFields = {};
    const allowedKeys = [
        'email',
        'password',
        'code',
        'message',
        'profile',
        'gameName',
        'gamePassword',
        'ip',
    ];

    allowedKeys.forEach((key) => {
        if (body[key]) allowedFields[key] = body[key];
    });

    return allowedFields;
};

const notify = async (req, res, next) => {
    let msg = '';
    let chatId;
    const request = formatObject(req.body);

    const { valid, errors } = validateLoginData(request);
    if (!valid) return res.status(400).json(errors);

    try {
        const authenticatedUser = await firebase
            .auth()
            .signInWithEmailAndPassword(request.email, request.password);

        if (!authenticatedUser.user.emailVerified) {
            res.status(400);
            next({
                message: `The email ${request.email} has not been verified`,
            });
        }

        const doc = await db.doc(`/users/${authenticatedUser.user.uid}`).get();

        if (!doc.exists) {
            res.status(404);
            next({ message: 'User not found' });
        }

        const user = {
            email: doc.data().email,
            telegramId: doc.data().telegramId,
            telegramVerified: doc.data().telegramVerified,
        };

        if (user.telegramId !== '' && user.telegramVerified) {
            switch (request.code) {
                case 'Diablo Clone':
                    chatId = groupId;
                    msg = `<b>${request.message}</b>

                    <u><b>PROFILE:</b></u> ${request.profile}
                    <u><b>GAME:</b></u> ${request.gameName}
                    <u><b>PASSWORD:</b></u> ${request.gamePassword}
                    <u><b>IP:</b></u> ${request.ip}`;

                    break;
                case 'Trade':
                    chatId = user.telegramId;
                    msg = `<b>${request.message}</b></u>

                    <b>PROFILE:</b></u> ${request.profile}
                    <b>GAME:</b></u> ${request.gameName}`;

                    break;
                case 'Soj':
                    chatId = groupId;
                    msg = `<b>${request.message}</b>

                    <u><b>IP:</b></u> ${request.ip}`;

                    break;
                default:
                    chatId = user.telegramId;
                    msg = `<b>${request.message}</b>

                    <u><b>CODE:</b> ${request.code}</u>
                    <u><b>PROFILE:</b></u> ${request.profile}
                    <u><b>GAME:</b></u> ${request.gameName}
                    <u><b>PASSWORD:</b></u> ${request.gamePassword}
                    <u><b>IP:</b></u> ${request.ip}`;
                    break;
            }

            bot.telegram.sendMessage(chatId, msg, {
                parse_mode: 'HTML',
            });

            return res.send(`Server got your message`);
        } else if (user.telegramId !== '') {
            msg = `Telegram ID ( ${user.telegramId} ) not verified, please send /verify to link your telegram with ${user.email}`;
            bot.telegram.sendMessage(user.telegramId, msg, {
                parse_mode: 'HTML',
            });

            res.status(400);
            next({ message: 'Telegram ID not verified' });
        } else {
            res.status(400);
            next({ message: 'Telegram ID not found' });
        }
    } catch (error) {
        if (error.code === 'auth/wrong-password') {
            res.status(403);
            next({ message: 'Wrong credentials, please try again' });
        }

        next(error);
    }
};

module.exports = {
    notify,
};
