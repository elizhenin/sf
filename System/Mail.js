//basic Sukina Framework mail class
module.exports = class Mail {
    constructor(m_config = 'default') {
        //define context-specific View() function
        this.View = function (view_path) {
            return new Application.System.View(view_path, {}, {});
        };
        this.config = Application.mailer[m_config];
        this.transporter = Application.lib.nodemailer.createTransport(
            this.config
        );
    }
    async send(to, subject, html, attachments) {
        let mailOptions = {
            sender: this.config.auth.user,
            to: to,
            subject: subject,
            html: html,
            attachments: attachments
        };
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
};
