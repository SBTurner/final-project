const express = require("express")
const Handlebars = require("handlebars")
const expressHandlebars = require("express-handlebars")
const {allowInsecurePrototypeAccess} = require("@handlebars/allow-prototype-access")

const {Board, Task, User, db} = require("./models/models")
const data = require("./models/boards.json")
const { request } = require("express")

const app = express()

const handlebars = expressHandlebars({
    handlebars: allowInsecurePrototypeAccess(Handlebars)
})

app.use(express.static('public')) //this is a folder name that you will save your html etc files in. 
app.engine('handlebars', handlebars)
app.set("view engine", "handlebars")
//Insert congiguration for handling form POST requests:
app.use(express.urlencoded({ extended: true }))
app.use(express.json())


//-----ROUTES-------
// Read ✅
app.get(['/'], async (request, response) => {
    const users = await User.findAll({
        include: 'tasks',
        nest: true
    })
    response.render("home", {users: users})
})




//this is the point where the server is initialised. 
app.listen(3000, ()=>{
    db.sync().then(async () => {
        const boards = await Board.findAll()
            if (boards.length > 0) return
            const taskQueue = data.map(async (json_board) => {
                    const board = await Board.create({title: json_board.title})
                    const tasks = await Promise.all(json_board.tasks.map(async (_task) => {
                        const user = await User.create({name: _task.user[0].name, image: _task.user[0].image})
                        const task = await Task.create({desc: _task.desc, status: _task.status})
                        return user.setTasks(task)
                    }))
                    return await board.setTasks(tasks)
                })
                await Promise.all(taskQueue).catch(console.error)
            })
    console.log('port = ', 3000)
})