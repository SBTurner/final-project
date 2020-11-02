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


//---Custom handlebars
// const hbs = expressHandlebars.create({
//     helpers: {
//         taskAvatar: function () {
            
//         }
//     }, 
//     handlebars: allowInsecurePrototypeAccess(Handlebars)
// })

// app.use(express.static('public'))
// app.engine('handlebars', hbs.engine)
// app.set('view engine', 'handlebars')
// app.use(express.urlencoded({ extended: true }))
// app.use(express.json())


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
//  Render profile page
app.get(['/users/:user_id/profilepage'], async (req, res) => {
    const user = await User.findByPk(req.params.user_id)
    const tasks = await Task.findAll({ where: { UserId: req.params.user_id } })
    res.render("user-profile", { user: user, tasks: tasks })
})
// Update user
app.post(['/users/:user_id/profilepage/edit'], async (req, res) => {
    const user = await User.findByPk(req.params.user_id)
    await user.update(req.body)
    res.redirect(`/users/${user.id}/profilepage`)
})
// Delete user
app.get(['/users/:user_id/profilepage/delete'], async (req, res) => {
    const user = await User.findByPk(req.params.user_id)
    await user.destroy()
    res.redirect('/')
})
// Render boards page
app.get(['/users/:user_id/boards'], async (req, res) => {
    const boards = await Board.findAll({
        include: 'tasks',
        nest: true
    })
    const users = await User.findAll({
        include: 'tasks',
        nest: true
    })
    // get array of user Ids per board
    const avatars = []
    for (i = 0; i < boards.length; i++) {
        const brd_all_users = []
        for (j = 0; j < boards[i].tasks.length; j++) {
            brd_all_users.push(boards[i].tasks[j].UserId)
        }
        if (j == boards[i].tasks.length) {
            const brd_unique_users = brd_all_users.filter((val, idx, self) => { return self.indexOf(val) === idx })
            avatars.push(brd_unique_users)
        }
    }
    //console.log(avatars)
    const user = await User.findByPk(req.params.user_id)
    res.render("all-boards", { users, boards, user, avatars })
})
//Render individual board page
app.get('/users/:user_id/boards/:board_id', async (req, res) => {
    const board = await Board.findByPk(req.params.board_id)
    const users = await User.findAll({
        include: 'tasks',
        nest: true
    })
    const tasks = await board.getTasks()
    const user = await User.findByPk(req.params.user_id)
    res.render('board', { board, user, users, tasks })
})
// Create board
app.post(['/users/:user_id/boards/create'], async (req, res) => {
    const user = await User.findByPk(req.params.user_id) 
    const board = await Board.create({ title: req.body.title })
    res.redirect(`/users/${user.id}/boards`)
})
// Update board
app.post(['/users/:user_id/boards/:board_id/edit'], async (req, res) => {
    const board = await Board.findByPk(req.params.board_id)
    await board.update(req.body)
    res.redirect(`/board/${board.id}`)
})
// Delete board
app.get(['/users/:user_id/boards/:board_id/delete'], async (req, res) => {
    const user = await User.findByPk(req.params.user_id)
    const board = await Board.findByPk(req.params.board_id)
    await board.destroy()
    res.redirect(`/users/${user.id}/boards`)
})
//Create task
app.post('/users/:user_id/boards/:board_id/tasks/create', async (req, res) => {
    const board = await Board.findByPk(req.params.board_id)
    const user = await User.findByPk(req.params.user_id)
    const selectUser = await User.findByPk(req.body.selectpicker)
    await Task.create({ desc: req.body.desc, status: 0, BoardId: board.id, UserId: selectUser.id })
    res.redirect(`/users/${user.id}/boards/${board.id}`)
})
//Update tasks
app.post(['/users/:user_id/boards/:board_id/tasks/:task_id/edit'], async (req, res) => {
    const task = await Task.findByPk(req.params.task_id)
    const board = await Board.findByPk(req.params.board_id)
    const user = await User.findByPk(req.params.user_id)
    await task.update(req.body)
    console.log(task)
    res.redirect(`/users/${user.id}/boards/${board.id}`)
})
//Delete tasks
app.get(['/users/:user_id/boards/:board_id/tasks/:task_id/delete'], async (req, res) => {
    const board = await Board.findByPk(req.params.board_id)
    const user = await User.findByPk(req.params.user_id)
    const task = await Task.findByPk(req.params.task_id)
    await task.destroy()
    res.redirect(`/users/${user.id}/boards/${board.id}`)
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
