module.exports = class {
    constructor() {
        this.Tasks = {};
        //System tasks

        //Application tasks
        if (!empty(Application.Scheduler)) {
            if (!empty(Application.Scheduler.StartUp)) {
                //startup tasks
                /*
                each task is one async function without parameters
                */
                for (let key in Application.Scheduler.StartUp) {
                    let task = Application.Scheduler.StartUp[key];
                    let task_body = async function () {
                        try {
                            await task()
                        } catch (e) {
                            ErrorCatcher(e)
                        }
                    }
                    setTimeout(task_body, 0)
                }
            }
            if (!empty(Application.Scheduler.Periodic)) {
                //periodic tasks
                 /*
                each task is one object with two fields
                f: async function without parameters
                t: integer with time interval in ms
                */
                for (let key in Application.Scheduler.Periodic) {
                    let task = Application.Scheduler.Periodic[key];
                    let task_body = async function () {
                        try {
                            await task.f()
                            setTimeout(task_body, task.t)
                        } catch (e) {
                            ErrorCatcher(e)
                        }
                    }
                    this.Tasks[key] = task_body;
                    setTimeout(task_body, task.t)
                }
            }
        }
    }

    addTask(func,periodic = false,time = 0,key = undefined){
        if(!key) key = GUID();
        if (!periodic || empty(time)){
            //do once
            let task_body = async function () {
                try {
                    await func()
                } catch (e) {
                    ErrorCatcher(e)
                }
            }
            setTimeout(task_body, time)
        }else{
            //set interval
            let task_body = async function () {
                try {
                    await func()
                    setTimeout(task_body, time)
                } catch (e) {
                    ErrorCatcher(e)
                }
            }
            this.Tasks[key] = task_body;
            setTimeout(task_body, time)
        }
        return key;
    }
    killTask(key){
        clearTimeout(this.Tasks[key]);
        delete this.Tasks[key];
    }
}
