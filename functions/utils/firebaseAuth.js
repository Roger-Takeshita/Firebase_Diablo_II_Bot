const { admin, db } = require('./admin');

module.exports = (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer ')
    ) {
        token = req.headers.authorization.split('Bearer ')[1];
    } else {
        return res.status(403).json({ error: 'Unauthorized!' });
    }

    admin
        .auth()
        .verifyIdToken(token)
        .then((decodedToken) => {
            req.user = decodedToken;
            return db
                .collection('users')
                .where('userId', '==', req.user.uid)
                .limit(1)
                .get();
        })
        .then((data) => {
            req.user.email = data.docs[0].data().email;
            return next();
        })
        .catch((error) => {
            return res
                .status(403)
                .json({ message: 'Error while verifying token', error });
        });
};
