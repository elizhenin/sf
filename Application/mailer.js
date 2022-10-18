
module.exports = {
    default: {
        host: 'localhost',
        port: 587,
        auth: {
            user: 'noreply@example.com',
            pass: 'Pass123'
        },
        secure: false,
        tls: {
            rejectUnauthorized: false
        },
    }
};
