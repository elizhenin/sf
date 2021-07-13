//basic Sukina Framework mail class
module.exports = class {
    constructor(m_config = 'default') {
        this.transporter = Application.lib.nodemailer.createTransport(config[m_config]);
    }
    async send(to, subject, html, attachments) {
        let mailOptions = {
            sender: config[m_config].auth.user,
            to: to,
            subject: subject,
            html: html,
            attachments: attachments
        }
        let transporter = this.transporter;
        let Sender = new Promise((resolve, reject) => {
            transporter.sendMail(mailOptions, function (error, info) {
                if (error) {
                    ErrorCatcher(error);
                    resolve(false);
                } else {
                    resolve(true);
                }
            });
        });
        let result = await Sender;
        return result;
    }
}