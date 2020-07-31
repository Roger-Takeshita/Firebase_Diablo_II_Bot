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

const sendEmailVerification = (user, res) => {
    user.sendEmailVerification()
        .then(() => {
            return res.json({
                message: `An email was sent to ${user.email}, please verify your email first.`,
            });
        })
        .catch((error) => {
            return res
                .status(500)
                .json({ message: 'Something went wrong', error });
        });
};

const signup = (req, res) => {
    const newUser = {
        email: req.body.email,
        password: req.body.password,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
    };

    const { valid, errors } = validateSignupData(newUser);
    if (!valid) return res.status(400).json(errors);

    db.collection('users')
        .where('email', '==', req.body.email)
        .get()
        .then((doc) => {
            if (doc.exists) {
                return res
                    .status(400)
                    .json({ message: 'This email is already taken' });
            } else {
                return firebase
                    .auth()
                    .createUserWithEmailAndPassword(
                        newUser.email,
                        newUser.password
                    );
            }
        })
        .then((data) => {
            const userProfile = {
                email: newUser.email,
                createdAt: new Date().toISOString(),
                userId: data.user.uid,
                firstName: req.body.firstName,
                lastName: req.body.lastName,
                telegramId: '',
                telegramVerified: false,
            };

            db.doc(`/users/${data.user.uid}`)
                .set(userProfile)
                .then(() => {
                    return sendEmailVerification(
                        firebase.auth().currentUser,
                        res
                    );
                })
                .catch((error) => {
                    return res
                        .status(500)
                        .json({ message: 'Something went wrong' });
                });
        })
        .catch((error) => {
            console.error(error);
            if (error.code === 'auth/email-already-in-use') {
                return res
                    .status(400)
                    .json({ error: 'Email is already in use' });
            }
            return res.status(500).json({ error: error.code });
        });
};

const login = (req, res) => {
    const user = {
        email: req.body.email,
        password: req.body.password,
    };
    const { valid, errors } = validateLoginData(user);
    if (!valid) return res.status(400).json(errors);

    firebase
        .auth()
        .signInWithEmailAndPassword(user.email, user.password)
        .then((data) => {
            if (!data.user.emailVerified) {
                return sendEmailVerification(data.user, res);
            }

            return data.user.getIdToken().then((token) => {
                return res.json({ token });
            });
        })
        .catch((error) => {
            console.error(error);

            if (
                error.code === 'auth/wrong-password' ||
                error.code === 'auth/user-not-found'
            ) {
                return res.status(403).json({
                    general:
                        'Wrong credentials, make sure email and password are correct',
                });
            }

            return res.status(500).json({ error: error.code });
        });
};

const updateProfile = async (req, res) => {
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

    if (updateUserProfile.telegramId.length > 0) {
        const telegramInUse = await db
            .collection('users')
            .where('telegramId', '==', `${updateUserProfile.telegramId}`)
            .get();

        if (telegramInUse) {
            return res
                .status(400)
                .json({ message: 'Telegram ID already in use' });
        }
    }

    db.doc(`/users/${req.user.uid}`)
        .update(formatObject(updateUserProfile))
        .then(() => {
            firebase
                .auth()
                .signInWithEmailAndPassword(req.user.email, req.body.password)
                .then((doc) => {
                    if (updateUserProfile.newEmail) {
                        doc.user.updateEmail(updateUserProfile.newEmail);
                        updateEmailFlag = true;
                    }
                    if (updateUserProfile.newPassword) {
                        doc.user.updatePassword(updateUserProfile.newPassword);
                    }
                    if (updateUserProfile.telegramId) {
                        const msg = `Telegram ID not verified, please send /verify to link your telegram with ${
                            updateUserProfile.newEmail
                                ? updateUserProfile.newEmail
                                : req.user.email
                        }`;
                        bot.telegram.sendMessage(
                            updateUserProfile.telegramId,
                            msg,
                            {
                                parse_mode: 'HTML',
                            }
                        );
                    }

                    if (updateEmailFlag) {
                        return res.json({
                            message:
                                'Your email has been updated, please log in again.',
                        });
                    }
                    return res.json({
                        message: 'Profile updated successfully',
                    });
                })
                .catch((error) => {
                    console.error(error);
                    return res
                        .status(500)
                        .json({ message: 'Something went wrong', error });
                });
        })
        .catch((error) => {
            console.error(error);
            return res.status(500).json({ error: error.code });
        });
};

const getProfile = (req, res) => {
    db.doc(`/users/${req.user.uid}`)
        .get()
        .then((doc) => {
            if (doc.exists) {
                return res.json({
                    userId: req.user.uid,
                    firstName: doc.data().firstName,
                    lastName: doc.data().lastName,
                    email: doc.data().email,
                    telegramId: doc.data().telegramId
                        ? doc.data().telegramId
                        : '',
                    telegramVerified: doc.data().telegramVerified,
                });
            }
        })
        .catch((error) => {
            console.error(error);
            return res.status(500).json({ error: error.code });
        });
};

module.exports = {
    signup,
    login,
    updateProfile,
    getProfile,
};
