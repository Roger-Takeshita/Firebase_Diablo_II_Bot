const firebase = require('firebase');
const { db } = require('../utils/admin');
const config = require('../utils/config');
const {
    validateSignupData,
    validateLoginData,
} = require('../utils/validators');

firebase.initializeApp(config);

const updateFields = (body) => {
    const updatedUserProfile = {};
    const allowedKeys = ['email', 'firstName', 'lastName', 'telegramId'];

    allowedKeys.forEach((key) => {
        if (body[key]) {
            updatedUserProfile[key] = body[key];
            if (key === 'telegramId') {
                updatedUserProfile.telegramVerified = false;
            }
        }
    });

    return updatedUserProfile;
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
    };

    const { valid, errors } = validateSignupData(newUser);
    if (!valid) return res.status(400).json(errors);

    db.doc(`/users/${newUser.email}`)
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

            db.doc(`/users/${newUser.email}`)
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
    db.doc(`/users/${req.user.email}`)
        .update(updateFields(req.body))
        .then(() => {
            return res.json({ message: 'Profile updated successfully' });
        })
        .catch((error) => {
            console.error(error);
            return res.status(500).json({ error: error.code });
        });
};

const getProfile = (req, res) => {
    db.doc(`/users/${req.user.email}`)
        .get()
        .then((doc) => {
            if (doc.exists) {
                return res.json({
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
