const express = require("express")
const Handlebars = require("handlebars")
const expressHandlebars = require("express-handlebars")
const { allowInsecurePrototypeAccess } = require("@handlebars/allow-prototype-access")

const { Board, Task, User, db } = require("./models/models")
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
        include: [{ model: Task, as: 'tasks' }],
        nest: true
    })
    res.render("home", { users: users })
})
// Create user
app.post(['/users/create'], async (req, res) => {
    const user = await User.create({ name: req.body.name, image: req.body.image })
    res.redirect(`/users/${user.id}/boards`)
})
// Update user
app.post(['/users/:user_id/edit'], async (req, res) => {
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
    const boards = await Board.findAll({
        include: 'tasks',
        nest: true
    })
    const users = await User.findAll({
        include: 'tasks',
        nest: true
    })
    const user = await User.findByPk(req.params.user_id)
    res.render("all-boards", { users: users, boards: boards, user: user })
})
// Create board
app.post(['/users/:user_id/boards/create'], async (req, res) => {
    const board = await Board.create({ title: req.body.title })
    res.redirect("/all-boards")
})
// Update board
app.post(['/users/:user_id/boards/:board_id/edit'], async (req, res) => {
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
    //const user = await User.findByPk(req.params.user_id)
    // !!!!!!  Pass in a specific user ID based on who is selected  !!!!!!
    await Task.create({ desc: req.body.desc, status: 0, BoardId: board.id })
    res.redirect(`/boards/${board.id}`)
})
//Update tasks
app.post(['/users/:user_id/boards/:board_id/tasks/:task_id/edit'], async (req, res) => {
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
app.listen(3000, () => {
    db.sync().then(async () => {
        const boards = await Board.findAll()
        if (boards.length > 0) {
            return
        }
        const sarah = await User.create({ "name": "Sarah", "image": "https://images.pexels.com/photos/2364633/pexels-photo-2364633.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260" })
        const krystyna = await User.create({ "name": "Krystyna", "image": "https://images.pexels.com/photos/589840/pexels-photo-589840.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260" })
        const josie = await User.create({ "name": "Josie", "image": "https://images.pexels.com/photos/617965/pexels-photo-617965.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260" })
        const board1 = await Board.create({ "title": "Board 1" })
        await Task.create({ "desc": "Feed dog", "status": 0, "BoardId": board1.id, UserId: sarah.id })
        await Task.create({ "desc": "Text mum", "status": 0, "BoardId": board1.id, UserId: krystyna.id })
        await Task.create({ "desc": "Put on clothes", "status": 0, "BoardId": board1.id, UserId: josie.id })
        const board2 = await Board.create({ "title": "Board 2" })
        await Task.create({ "desc": "Go Shopping", "status": 0, "BoardId": board2.id, UserId: krystyna.id })
        await Task.create({ "desc": "Take bins out", "status": 0, "BoardId": board2.id, UserId: josie.id })
        await Task.create({ "desc": "Eat food", "status": 0, "BoardId": board2.id, UserId: sarah.id })

    }).catch(console.error)
    console.log('port = ', 3000)
})


