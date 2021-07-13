module.exports = class extends Application.System.Model {
 async SayHello(myMailAddress){
    return await this.Mailer.send(myMailAddress/*address where to send*/, "Hello from fresh install"/*mail subject*/, "This html part may be prepared via View()"/*html body of mail*/,false/* no attachments*/)
 }
}