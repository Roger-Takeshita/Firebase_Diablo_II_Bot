const isEmpty = (string) => {
    if (string.trim() === '') return true;
    return false;
};

const isEmail = (email) => {
    const emailRegEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if (email.match(emailRegEx)) return true;
    return false;
};

const validateSignupData = (data) => {
    const errors = {};

    if (isEmpty(data.email)) {
        errors.email = 'Must not be empty';
    } else if (!isEmail(data.email)) {
        errors.email = 'Must be a valid email address';
    }
    if (isEmpty(data.firstName)) errors.firstName = 'Must not be empty';
    if (isEmpty(data.lastName)) errors.lastName = 'Must not be empty';
    if (isEmpty(data.password)) errors.password = 'Must not be empty';

    return {
        errors,
        valid: Object.keys(errors).length === 0 ? true : false,
    };
};

const validateLoginData = (data) => {
    const errors = {};

    if (isEmpty(data.email)) errors.email = 'Must not be empty';
    if (isEmpty(data.password)) errors.password = 'Must not be empty';

    return {
        errors,
        valid: Object.keys(errors).length === 0 ? true : false,
    };
};

const validateUpdateData = (data) => {
    const errors = {};

    if (data.newEmail && isEmpty(data.newEmail)) {
        errors.newEmail = 'Must not be empty';
    } else if (data.newEmail && !isEmail(data.newEmail)) {
        errors.newEmail = 'Must be a valid email address';
    }
    if (isEmpty(data.firstName)) errors.firstName = 'Must not be empty';
    if (isEmpty(data.lastName)) errors.lastName = 'Must not be empty';
    if (isEmpty(data.password)) errors.password = 'Must not be empty';
    if (data.newPassword && isEmpty(data.newPassword))
        errors.newPassword = 'Must not be empty';

    return {
        errors,
        valid: Object.keys(errors).length === 0 ? true : false,
    };
};

module.exports = {
    validateSignupData,
    validateLoginData,
    validateUpdateData,
};
