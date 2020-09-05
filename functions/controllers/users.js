const firebase = require('firebase');
const { db } = require('../utils/admin');
const bot = require('../utils/telegram');
const {
    validateSignupData,
    validateLoginData,
    validateUpdateData,
} = require('../utils/validators');

const formatObject = (body) => {
    const allowedFields = {};
    const allowedKeys = ['newEmail', 'firstName', 'lastName', 'telegramId'];

    allowedKeys.forEach((key) => {
        if (body[key] || body[key] === '') {
            switch (key) {
                case 'telegramId':
                    allowedFields[key] = body[key];
                    allowedFields.telegramVerified = false;

                    break;
                case 'newEmail':
                    allowedFields.email = body[key];

                    break;
                default:
                    allowedFields[key] = body[key];

                    break;
            }
        }
    });

    return allowedFields;
};

const sendEmailVerification = async (res) => {
    try {
        const user = firebase.auth().currentUser;
        user.sendEmailVerification();
        return res.json({
            message: `An email was sent to ${user.email}, please verify first and before log in.`,
        });
    } catch (error) {
        throw new Error(
            'Unable to send the email verification, please try again later.'
        );
    }
};

const signup = async (req, res, next) => {
    const newUser = {
        email: req.body.email,
        password: req.body.password,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
    };

    const { valid, errors } = validateSignupData(newUser);
    if (!valid) return res.status(400).json(errors);

    try {
        const newUserAuthentication = await firebase
            .auth()
            .createUserWithEmailAndPassword(newUser.email, newUser.password);

        const newUserProfile = {
            email: req.body.email,
            userId: newUserAuthentication.user.uid,
            createdAt: new Date().toISOString(),
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            telegramId: '',
            telegramVerified: false,
        };

        await db
            .doc(`/users/${newUserAuthentication.user.uid}`)
            .set(newUserProfile);
        return sendEmailVerification(res);
    } catch (error) {
        if (error.code === 'auth/email-already-in-use') {
            res.status(400);
            next({ message: 'Email is already in use' });
        }

        next(error);
    }
};

const login = async (req, res) => {
    const user = {
        email: req.body.email,
        password: req.body.password,
    };

    const { valid, errors } = validateLoginData(user);
    if (!valid) return res.status(400).json(errors);

    try {
        const request = await firebase
            .auth()
            .signInWithEmailAndPassword(user.email, user.password);

        if (!request.user.emailVerified) {
            return sendEmailVerification(res);
        }

        const token = await request.user.getIdToken();
        return res.json({ token });
    } catch (error) {
        if (
            error.code === 'auth/wrong-password' ||
            error.code === 'auth/user-not-found'
        ) {
            res.status(403);
            next({
                message:
                    'Wrong credentials, make sure email and password are correct',
            });
        }

        next(error);
    }
};

const updateProfile = async (req, res, next) => {
    let updateEmailFlag = false;
    const updateUserProfile = {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        newEmail: req.body.newEmail,
        telegramId: req.body.telegramId,
        password: req.body.password,
        newPassword: req.body.newPassword,
    };

    const { valid, errors } = validateUpdateData(updateUserProfile);
    if (!valid) return res.status(400).json(errors);

    if (
        updateUserProfile.telegramId &&
        updateUserProfile.telegramId.length > 0
    ) {
        try {
            const data = await db
                .collection('users')
                .where('telegramId', '==', `${updateUserProfile.telegramId}`)
                .get();
            if (!data) {
                res.status(400);
                next({ message: 'Telegram ID already in use' });
            }
        } catch (error) {
            next(error);
        }
    }

    try {
        const request = await firebase
            .auth()
            .signInWithEmailAndPassword(req.user.email, req.body.password);

        if (updateUserProfile.newEmail) {
            await request.user.updateEmail(updateUserProfile.newEmail);
            updateEmailFlag = true;
        }
        if (updateUserProfile.newPassword) {
            await request.user.updatePassword(updateUserProfile.newPassword);
        }

        const updateSomething = formatObject(updateUserProfile);
        if (Object.keys(updateSomething).length > 0) {
            await db.doc(`/users/${req.user.uid}`).update(updateSomething);

            if (updateUserProfile.telegramId) {
                const msg = `Telegram ID not verified, please send /verify to link your telegram with ${
                    updateUserProfile.newEmail
                        ? updateUserProfile.newEmail
                        : req.user.email
                }`;

                await bot.telegram.sendMessage(
                    updateUserProfile.telegramId,
                    msg,
                    {
                        parse_mode: 'HTML',
                    }
                );
            }
        }

        if (updateEmailFlag) {
            return res.json({
                message: 'Your email has been updated, please log in again.',
            });
        }

        if (Object.keys(updateSomething).length > 0) {
            return res.json({
                message: 'Profile has been updated successfully',
            });
        }

        return res.json({
            message: 'Password has been updated successfully',
        });
    } catch (error) {
        if (error.code === 'auth/wrong-password') {
            res.status(403);
            next({
                message: 'Wrong password, make sure your password is correct',
            });
        }

        next(error);
    }
};

const getProfile = async (req, res) => {
    try {
        const doc = await db.doc(`/users/${req.user.uid}`).get();

        if (doc.exists) {
            const userProfile = {
                firstName: doc.data().firstName,
                lastName: doc.data().lastName,
                email: req.user.email,
                telegramId: doc.data().telegramId ? doc.data().telegramId : '',
                telegramVerified: doc.data().telegramVerified,
            };
            return res.json(userProfile);
        }

        res.status(404);
        next({ message: 'User not found' });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    signup,
    login,
    updateProfile,
    getProfile,
};
