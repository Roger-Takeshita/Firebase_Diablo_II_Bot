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
            return sendEmailVerification(data.user, res);
        }

        const user = await db.doc(`/users/${authenticatedUser.user.uid}`).get();

        if (!user.exists) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.data().telegramId !== '' && user.data().telegramVerified) {
            switch (request.code) {
                case 'Diablo Clone':
                    chatId = groupId;
                    msg = `<b>${request.message}</b>

                    <b>PROFILE:</b> ${request.profile}
                    <b>GAME:</b> ${request.gameName}
                    <b>PASSWORD:</b> ${request.password}
                    <b>IP:</b> ${request.ip}`;

                    break;
                case 'Trade':
                    chatId = user.data().telegramId;
                    msg = `<b>${request.message}</b>

                    <u><b>PROFILE:</b> ${request.profile}</u>
                    <b>GAME:</b> ${request.gameName}`;

                    break;
                case 'Soj':
                    chatId = groupId;
                    msg = `<b>${request.message}</b>
                    <b>IP:</b> ${request.ip}`;

                    break;
                default:
                    break;
            }

            bot.telegram.sendMessage(chatId, msg, {
                parse_mode: 'HTML',
            });

            return res.send('Server received your message');
        } else if (doc.data().telegramId !== '') {
            msg = `Telegram ID not verified, please send /verify to link your telegram with ${
                doc.data().email
            }`;
            bot.telegram.sendMessage(doc.data().telegramId, msg, {
                parse_mode: 'HTML',
            });

            return res
                .status(400)
                .json({ message: 'Telegram ID not verified' });
        } else {
            return res.status(400).json({
                message: 'This Telegram ID is not linked to any user.',
            });
        }
    } catch (error) {
        console.error(error);

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
