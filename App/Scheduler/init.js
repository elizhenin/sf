module.exports = function () {
    //startup tasks
    for (let key in Application.Scheduler.StartUp) {
        let task = Application.Scheduler.StartUp[key];
        let task_body = async function(){
            try{
                await task()
            }
            catch(e){
                ErrorCatcher(e)
            }
        }
        setTimeout(task_body,0)
    }
    //periodic tasks
    for (let key in Application.Scheduler.Periodic) {
        let task = Application.Scheduler.Periodic[key];
        let task_body = async function(){
            try{
                await task.f()
                setTimeout(task_body,task.t)
            }
            catch(e){
                ErrorCatcher(e)
            }
        }
        setTimeout(task_body,task.t)
       
    }

}