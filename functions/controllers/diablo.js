const firebase = require('firebase');
const { db } = require('../utils/admin');
const bot = require('../utils/telegram');
const env = require('../env.json');
const { validateLoginData } = require('../utils/validators');

const GROUPID = env.config.telegram_group;

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

const notify = (req, res) => {
    const request = formatObject(req.body);
    const { valid, errors } = validateLoginData(request);
    if (!valid) return res.status(400).json(errors);

    firebase
        .auth()
        .signInWithEmailAndPassword(request.email, request.password)
        .then((data) => {
            if (!data.user.emailVerified) {
                return sendEmailVerification(data.user, res);
            }

            db.doc(`/users/${data.user.uid}`)
                .get()
                .then((doc) => {
                    if (!doc.exists) {
                        return res
                            .status(404)
                            .json({ message: 'User not found' });
                    }

                    if (
                        doc.data().telegramId !== '' &&
                        doc.data().telegramVerified
                    ) {
                        return res.send('telegram verified');
                    } else if (doc.data().telegramId !== '') {
                        const msg = `Not verified Telegram ID, please send /verify to activate your telegram notification`;
                        bot.telegram.sendMessage(doc.data().telegramId, msg, {
                            parse_mode: 'HTML',
                        });
                        return res.send('telegram not verified');
                    } else {
                        return res.send('empty telegram id');
                    }
                });
        })
        .catch((error) => {
            console.error(error);

            if (error.code === 'auth/wrong-password') {
                return res
                    .status(403)
                    .json({ general: 'Wrong credentials, please try again' });
            }

            return res.status(500).json({ error: error.code });
        });
};

module.exports = {
    notify,
};
