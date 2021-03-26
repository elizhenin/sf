
let config = {
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



module.exports = function (mailOptions, m_config = 'default') {
    return new Promise((resolve, reject) => {
        let transporter = Application.lib.nodemailer.createTransport(config[m_config]);
        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                ErrorCatcher(error);
                resolve(false);
            } else {
                resolve(true);
            }
        });
    })
}
