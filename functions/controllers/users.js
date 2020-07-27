const firebase = require('firebase');
const { db } = require('../utils/admin');
const config = require('../utils/config');
const {
    validateSignupData,
    validateLoginData,
    validateUpdateData,
} = require('../utils/validators');

firebase.initializeApp(config);

const updateFields = (body) => {
    const validUserFields = {};
    const allowedKeys = ['email', 'firstName', 'lastName', 'telegramId'];

    allowedKeys.forEach((key) => {
        if (body[key]) {
            validUserFields[key] = body[key];
            if (key === 'telegramId') {
                validUserFields.telegramVerified = false;
            }
        }
    });

    return validUserFields;
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

            if (error.code === 'auth/wrong-password') {
                return res
                    .status(403)
                    .json({ general: 'Wrong credentials, please try again' });
            }

            return res.status(500).json({ error: error.code });
        });
};

const updateProfile = (req, res) => {
    const updateUserProfile = {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.newEmail,
        newEmail: req.body.newEmail ? req.body.newEmail : '',
        oldEmail: req.body.email,
        telegramId: req.body.telegramId,
        password: req.body.password,
    };

    const { valid, errors } = validateUpdateData(updateUserProfile);
    if (!valid) return res.status(400).json(errors);

    db.doc(`/users/${req.user.uid}`)
        .update(updateFields(updateUserProfile))
        .then(() => {
            firebase
                .auth()
                .signInWithEmailAndPassword(
                    updateUserProfile.oldEmail,
                    updateUserProfile.password
                )
                .then((doc) => {
                    if (updateUserProfile.newEmail.length > 0) {
                        doc.user.updateEmail(updateUserProfile.newEmail);
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
