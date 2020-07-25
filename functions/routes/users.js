const firebase = require('firebase');
const { db, admin } = require('../utils/admin');
const config = require('../utils/config');
const {
    validateSignupData,
    validateLoginData,
    reduceUserDetails,
} = require('../utils/validators');

firebase.initializeApp(config);

const signup = (req, res) => {
    const newUser = {
        email: req.body.email,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword,
    };

    let token, userId;

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
            userId = data.user.uid;
            return data.user.getIdToken();
        })
        .then((idToken) => {
            token = idToken;
            const userCredentials = {
                email: newUser.email,
                createdAt: new Date().toISOString(),
                userId,
                firstName: req.body.firstName,
                lastName: req.body.lastName,
            };
            return db.doc(`/users/${newUser.email}`).set(userCredentials);
        })
        .then(() => {
            return res.status(201).json({ token });
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
            return data.user.getIdToken();
        })
        .then((token) => {
            return res.json({ token });
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

const addUserDetails = (req, res) => {
    let userDetails = reduceUserDetails(req.body);

    db.doc(`/users/${req.user.email}`)
        .update(userDetails)
        .then(() => {
            return res
                .json({ message: 'Details added successfully' })
                .catch((error) => {
                    console.error(error);
                    return res.status(500).json({ error: error.code });
                });
        });
};

const userProfile = (req, res) => {
    db.doc(`/users/${req.user.email}`)
        .get()
        .then((doc) => {
            if (doc.exists) {
                return res.json(doc.data());
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
    addUserDetails,
    userProfile,
};
