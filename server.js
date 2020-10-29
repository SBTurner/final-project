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
// Render landing page
app.get(['/'], async (req, res) => {
    const users = await User.findAll({
        include: 'tasks',
        nest: true
    })
    res.render("home", {users: users})
})
// Create user
app.post(['/users/create'], async (req, res) => {
    const user = await User.create(req.body)
    res.redirect("/all-boards")
})
// Update user
app.post(['/users/:user_id/edit'], async (req,res)=>{
    const user = await User.findByPk(req.params.user_id)
    await user.update(req.body)
    res.redirect(`/user-profile/${user.id}`)
})
// Delete user
app.get(['/users/:user_id/delete'], async (req, res) => {
    const user = await User.findByPk(req.params.user_id)
    await user.destroy()
    res.redirect('/')
})
// Render boards page
app.get(['/users/:user_id/boards/'], async (req, res) => {
    const boards = await Board.findAll()
    const users = await User.findAll({
        include: 'tasks',
        nest: true
    })
    const user = await User.findByPk(req.params.user_id)
    res.render("all-boards", {users: users, boards: boards, user: user})
})
// Create board
app.post(['/users/:user_id/boards/create'], async (req, res) => {
    const board = await Board.create(req.body)
    res.redirect("/all-boards")
})
// Update board
app.post(['/users/:user_id/boards/:board_id/edit'], async (req,res)=>{
    const board = await Board.findByPk(req.params.board_id)
    await board.update(req.body)
    res.redirect(`/board/${board.id}`)
})
// Delete board
app.get(['/users/:user_id/boards/:board_id/delete'], async (req, res) => {
    const board = await Board.findByPk(req.params.board_id)
    await board.destroy()
    res.redirect('/all-boards')
})
//Create task
app.post('/users/:user_id/boards/:board_id/tasks/create', async (req, res) => {
    const board = await Board.findByPk(req.params.board_id)
    await board.createTask(req.body)
    res.redirect(`/boards/${board.id}`)
})
//Update tasks
app.post(['/users/:user_id/boards/:board_id/tasks/:task_id/edit'], async (req,res)=>{
    const task = await Task.findByPk(req.params.task_id)
    const board = await Board.findByPk(req.params.board_id)
    const user = await User.findByPk(req.params.user_id)
    await task.update(req.body)
    res.redirect(`/board/${board.id}`)
})
//Delete tasks
app.get(['/users/:user_id/boards/:board_id/tasks/:task_id/delete'], async (req, res) => {
    const board = await Board.findByPk(req.params.board_id)
    const task = await Task.findByPk(req.params.task_id)
    await task.destroy()
    res.redirect(`/board/${board.id}`)
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