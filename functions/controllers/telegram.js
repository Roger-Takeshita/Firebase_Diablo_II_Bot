const { db } = require('../utils/admin');

const isUserRegistered = async (chat_id, res) => {
    let user = {};

    try {
        const docs = await db
            .collection('users')
            .where('telegramId', '==', `${chat_id}`)
            .get();

        docs.forEach((doc) => {
            user = doc.data();
        });
    } catch (error) {
        throw new Error(error);
    }

    if (user.email) return user;

    //TODO build a front-end
    const msg = `Your Telegram ID ( ${chat_id} ) is not linked to a registered user. Please visit the <a href="https://rogertakeshita.com">link</a>`;

    await res.send({
        method: 'sendMessage',
        chat_id,
        text: msg,
        parse_mode: 'HTML',
    });

    return false;
};

const isLinkExists = async (user, link) => {
    try {
        const docs = await db
            .collection('links')
            .where('userId', '==', user.userId)
            .where('link', '==', link)
            .get();

        const links = [];
        docs.forEach((doc) => {
            links.push(doc.link);
        });
        return links;
    } catch (error) {
        throw new Error(error);
    }
};

const getLinks = async (user) => {
    try {
        let strLinks = '';
        let countLinks = 0;
        const docs = await db
            .collection('links')
            .where('userId', '==', user.userId)
            .get();

        docs.forEach((doc) => {
            strLinks += `
    <b>---></b> <a href="${doc.data().link}">${doc.data().link}</a>`;
            countLinks++;
        });

        if (countLinks === 0) {
            return `You don't have any link.`;
        }

        return `Found ${countLinks} link${countLinks > 1 ? 's' : ''}:
    ${strLinks}`;
    } catch (error) {
        throw new Error(error);
    }
};

const incomingMsg = async (req, res) => {
    const telegramText =
        req.body &&
        req.body.message &&
        req.body.message.chat &&
        req.body.message.chat.id &&
        req.body.message.from &&
        req.body.message.from.first_name;

    if (telegramText) {
        let user;
        let chat_id;
        let msg = '';
        const type = req.body.message.chat.type;
        const userChatId = req.body.message.from.id;
        const userGroupChatId = req.body.message.chat.id;
        const first_name = req.body.message.from.first_name;
        const last_name = req.body.message.from.last_name;
        const username = req.body.message.from.username;
        const incomingMessage = req.body.message.text;

        switch (incomingMessage) {
            case '/me':
                chat_id = userChatId;
                msg = `<b>Here is your profile:</b>

            <u><b>First Name:</b></u>    ${first_name}
            <u><b>Last Name:</b></u>    ${last_name}
            <u><b>Username:</b></u>    <a href="tg://username?id=${username}">${username}</a>
            <u><b>Direct Msg:</b></u>   <a href="t.me/${username}">t.me/${username}</a>
            <u><b>Telegram ID:</b></u>  <a href="tg://user?id=${chat_id}">${chat_id}</a>`;

                break;
            case '/verify':
                chat_id = userChatId;
                user = await isUserRegistered(chat_id, res);

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

                break;
            case '/start':
            case '/help':
                chat_id = userGroupChatId;
                let keyboard = [];

                if (type === 'group') {
                    msg = `<u>Available Group Commands</u>

            /verify - link telegram account
            /help - available commands`;

                    keyboard = [['/verify', '/help']];
                } else {
                    msg = `<u>Commands:</u>
                
            /me - get your profile info
            /verify - link telegram account
            /links - show all saved links
            /help - available commands`;

                    keyboard = [
                        ['/me', '/verify'],
                        ['/links', '/help'],
                    ];
                }

                return res.send({
                    method: 'sendMessage',
                    chat_id,
                    text: msg,
                    reply_markup: {
                        keyboard,
                        resize_keyboard: true,
                        one_time_keyboard: true,
                    },
                    parse_mode: 'HTML',
                });
            case '/body':
                chat_id = userGroupChatId;
                user = isUserRegistered(chat_id, res);

                if (user) {
                    msg = JSON.stringify(req.body, undefined, 3);
                } else {
                    msg = `You Telegram ID ( ${user.telegramId} ) has not been verified, please send /verify to link your telegram with ${user.email}`;
                }

                break;
            case '/links':
                chat_id = userChatId;
                user = await isUserRegistered(chat_id, res);

                if (user && user.telegramVerified) {
                    msg = await getLinks(user);
                } else if (user && !user.telegramVerified) {
                    msg = `Your Telegram ID ( ${user.telegramId} ) has not been verified, please send /verify to link your telegram with ${user.email}`;
                }

                break;
            default:
                chat_id = userChatId;
                user = await isUserRegistered(chat_id, res);

                if (user && type === 'private') {
                    const regEx = /^(http|https|ftp|ftps)\:\/\/[a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,3}(\/\S*)?/i;
                    const isAnUrl = incomingMessage.match(regEx);

                    if (isAnUrl) {
                        const link = isAnUrl[0];
                        const links = await isLinkExists(user, link);

                        if (links.length > 0) {
                            msg = 'This link already exists!';
                            return res.send({
                                method: 'sendMessage',
                                chat_id,
                                text: msg,
                                parse_mode: 'HTML',
                            });
                        }

                        return await db
                            .collection('links')
                            .add({ link, userId: user.userId });
                    }

                    return res.send({
                        method: 'sendMessage',
                        chat_id,
                        text: `Hello ${first_name}, \n You sent us message: ${incomingMessage}`,
                        parse_mode: 'HTML',
                    });
                }

                break;
        }

        return res.send({
            method: 'sendMessage',
            chat_id,
            text: msg,
            parse_mode: 'HTML',
        });
    }

    return res.send({
        method: 'sendMessage',
        chat_id,
        text: 'Something went wrong!',
        parse_mode: 'HTML',
    });
};

module.exports = { incomingMsg };
