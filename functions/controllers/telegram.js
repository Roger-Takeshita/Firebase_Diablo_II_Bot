const { db } = require('../utils/admin');
const bot = require('../utils/telegram');
const Markup = require('telegraf/markup');

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

    //TODO build a front-end
    const msg = `User not found, please sign in <a href="https://rogertakeshita.com">here</a>`;
    bot.telegram.sendMessage(chatId, msg, { parse_mode: 'HTML' });
    return false;
};

const isLinkExists = async (user, link) => {
    try {
        const docs = await db
            .collection('links')
            .where('userId', '==', user.userId)
            .where('link', '==', link)
            .get();

        if (docs.exists) {
            const links = [];
            docs.forEach((doc) => {
                links.push(doc.link);
            });
            return links;
        }
        return false;
    } catch (error) {
        throw new Error(error);
    }
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

bot.command(
    '/me',
    ({ from: { id: chatId, first_name, last_name, username } }) => {
        const msg = `Here is your profile:

        <u>First name:</u>    ${first_name}
        <u>Last name:</u>    ${last_name}
        <u>Username:</u>    <a href="tg://username?id=${username}">${username}</a>
        <u>Direct msg:</u>   <a href="t.me/${username}">t.me/${username}</a>
        <u>Telegram ID:</u>  <a href="tg://user?id=${chatId}">${chatId}</a>
    `;

        bot.telegram.sendMessage(chatId, msg, { parse_mode: 'HTML' });
    }
);

bot.command('/links', async ({ from: { id: chatId } }) => {
    let msg = '';

    const user = await isUserRegistered(chatId);
    const links = await db
        .collection('links')
        .where('userId', '==', user.userId)
        .get();

    if (links.length === 0) {
        msg = `You don't have any link.`;
        return bot.telegram.sendMessage(chatId, msg, { parse_mode: 'HTML' });
    }

    let strLinks = '';
    links.forEach((item) => {
        strLinks += `
    <b>---></b> <a href="${item.data().link}">${item.data().link}</a>
        `;
    });

    msg = `Here are your links ${links.length}:
    ${strLinks}`;

    bot.telegram.sendMessage(chatId, msg, { parse_mode: 'HTML' });
});

bot.command('/help', ({ chat: { type, id: chatId } }) => {
    let msg = '';
    let keyboard = [];
    let keyboardConfig = {};

    if (type === 'group') {
        // msg = `Available Group Commands
        // /command1 ->
        // /command2 ->
        // /command3 ->
        // /help
        //     `;
        // keyboard = ['/command1', '/command2', '/command3', '/help'];
        // keyboardConfig = { columns: 2, rows: 2 };
    } else {
        msg = `
        <u>Commands:</u>
            /me - get your profile info
            /verify - link telegram account
            /help - available commands
            `;
        keyboard = ['/me', '/verify', '/help'];
        keyboardConfig = { columns: 2, rows: 2 };
    }

    bot.telegram.sendMessage(
        chatId,
        msg,
        Markup.keyboard(keyboard, keyboardConfig)
            .oneTime()
            .resize()
            .extra({ parse_mode: 'HTML' })
    );
});

bot.hears(
    /^(http|https|ftp|ftps)\:\/\/[a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,3}(\/\S*)?/i,
    async ({ from: { id: chatId }, match }) => {
        let msg = '';
        const link = match[0].toLowerCase();
        const user = await isUserRegistered(chatId);

        const linkExists = await isLinkExists(user, link);
        if (linkExists) {
            msg = `This link already exists!`;
        } else {
            msg = `I got you: ${link}, ${linkExists} ${JSON.stringify(user)}`;
        }

        bot.telegram.sendMessage(chatId, msg, {
            parse_mode: 'HTML',
        });
    }
);
