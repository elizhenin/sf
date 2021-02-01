//config for nodemailer
module.exports = {
    default: {
        host: '',
        port: 587,
        auth: {
            user: '',
            pass: ''
        },
        secure: false,
        tls: {
            rejectUnauthorized: false
        },
    }
};
