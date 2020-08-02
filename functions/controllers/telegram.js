const { db } = require('../utils/admin');
const bot = require('../utils/telegram');

const isUserRegistered = async (chatId) => {
    let user = {};

    try {
        const docs = await db
            .collection('users')
            .where('telegramId', '==', `${chatId}`)
            .get();

        docs.forEach((doc) => {
            user = doc.data();
        });
    } catch (error) {
        throw new Error(error);
    }

    if (user.email) return user;

    const msg = `User not found, please sign in <a href="https://rogertakeshita.com">here</a>`;
    bot.telegram.sendMessage(chatId, msg, { parse_mode: 'HTML' });
    return false;
};

bot.command('/verify', async ({ from: { id: chatId } }) => {
    let msg = '';
    const user = await isUserRegistered(chatId);

    if (user && user.telegramVerified) {
        msg = 'Your account is already linked.';
    } else {
        try {
            await db
                .doc(`/users/${user.userId}`)
                .update({ telegramVerified: true });
        } catch (error) {
            throw new Error(error);
        }

        msg = 'Your account has been linked successfully.';
    }

    bot.telegram.sendMessage(chatId, msg, { parse_mode: 'HTML' });
});

bot.launch().catch();
