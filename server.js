const express = require("express")
const Handlebars = require("handlebars")
const expressHandlebars = require("express-handlebars")
const { allowInsecurePrototypeAccess } = require("@handlebars/allow-prototype-access")

const { Board, Task, User, db } = require("./models/models")
const { request } = require("express")

const app = express()

// const handlebars = expressHandlebars({
//     handlebars: allowInsecurePrototypeAccess(Handlebars)
// })

// app.use(express.static('public')) //this is a folder name that you will save your html etc files in. 
// app.engine('handlebars', handlebars)
// app.set("view engine", "handlebars")
// //Insert congiguration for handling form POST requests:
// app.use(express.urlencoded({ extended: true }))
// app.use(express.json())


//Custom handlebars
const hbs = expressHandlebars.create({
    helpers: {
        taskAvatar: function() {

        }
    },
    handlebars: allowInsecurePrototypeAccess(Handlebars)
})
hbs.handlebars.registerHelper('ifEquals', function(arg1, arg2, options) {
    return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
});
app.use(express.static('public'))
app.engine('handlebars', hbs.engine)
app.set('view engine', 'handlebars')
app.use(express.urlencoded({ extended: true }))
app.use(express.json())


//---Custom handlebars
// const hbs = expressHandlebars.create({
//     helpers: {
//         taskAvatar: function (task, users) {
//             if(task.UserId) {
//                 return users.image;
//             }
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
app.get(['/'], async(req, res) => {
        const users = await User.findAll({
            include: [{ model: Task, as: 'tasks' }],
            nest: true
        })
        res.render("home", { users: users })
    })
    // Create user
app.post(['/users/create'], async(req, res) => {
        const user = await User.create({ name: req.body.name, image: req.body.image })
        res.redirect(`/users/${user.id}/boards`)
    })
    //  Render profile page
app.get(['/users/:user_id/profilepage'], async(req, res) => {
        const user = await User.findByPk(req.params.user_id)
        const tasks = await Task.findAll({ where: { UserId: req.params.user_id } })
        res.render("user-profile", { user: user, tasks: tasks })
    })
    // Update user
app.post(['/users/:user_id/profilepage/edit'], async(req, res) => {
        const user = await User.findByPk(req.params.user_id)
        await user.update(req.body)
        res.redirect(`/users/${user.id}/boards`)
    })
    // Delete user
app.get(['/users/:user_id/profilepage/delete'], async(req, res) => {
    const user = await User.findByPk(req.params.user_id)
    await user.destroy()
    res.redirect('/')
})

// Render boards page
app.get(['/users/:user_id/boards'], async(req, res) => {
        const boards = await Board.findAll({
            include: 'tasks',
            nest: true
        })
        const user = await User.findByPk(req.params.user_id)
        const users = await User.findAll({
            include: 'tasks',
            nest: true
        })

        const avatarsArray = boards.map(async(b) => {
            const users = {};
            const board = await Board.findByPk(b.id)
            const tasks = await board.getTasks({ include: { model: User } })
            tasks.map((task) => (users[task.User.id] = task.User.image))
            return {
                boardId: b.id,
                users: users
            }
        })

        const avatars = await Promise.all(avatarsArray)
        res.render("all-boards", { users, boards, user, avatars })
    })
    //Render individual board page
app.get('/users/:user_id/boards/:board_id', async(req, res) => {
        const board = await Board.findByPk(req.params.board_id)
        const users = await User.findAll({
            include: 'tasks',
            nest: true
        })
        const tasks = await board.getTasks({ include: { model: User } })
        const user = await User.findByPk(req.params.user_id)
        res.render('board', { board, user, users, tasks })
    })
    // Create board
app.post(['/users/:user_id/boards/create'], async(req, res) => {
        const user = await User.findByPk(req.params.user_id)
        const board = await Board.create({ title: req.body.title, image: req.body.image })
        res.redirect(`/users/${user.id}/boards`)
    })
    // Update board
app.post(['/users/:user_id/boards/:board_id/edit'], async(req, res) => {
        const board = await Board.findByPk(req.params.board_id)
        await board.update(req.body)
        res.redirect(`/board/${board.id}`)
    })
    // Delete board
app.get(['/users/:user_id/boards/:board_id/delete'], async(req, res) => {
        const user = await User.findByPk(req.params.user_id)
        const board = await Board.findByPk(req.params.board_id)
        await board.destroy()
        res.redirect(`/users/${user.id}/boards`)
    })
    //Create task
app.post('/users/:user_id/boards/:board_id/tasks/create', async(req, res) => {
        const board = await Board.findByPk(req.params.board_id)
        const user = await User.findByPk(req.params.user_id)
        const selectUser = await User.findByPk(req.body.selectpicker)
        const task = await Task.create({ desc: req.body.desc, status: 0, BoardId: board.id, UserId: selectUser.id })
        res.redirect(`/users/${user.id}/boards/${board.id}`)
    })
    //Update tasks
app.post(['/users/:user_id/boards/:board_id/tasks/:task_id/edit'], async(req, res) => {
        const task = await Task.findByPk(req.params.task_id)
        const board = await Board.findByPk(req.params.board_id)
        const user = await User.findByPk(req.params.user_id)
        await task.update(req.body)

        res.redirect(`/users/${user.id}/boards/${board.id}`)
    })
    //Delete tasks
app.get(['/users/:user_id/boards/:board_id/tasks/:task_id/delete'], async(req, res) => {
        const board = await Board.findByPk(req.params.board_id)
        const user = await User.findByPk(req.params.user_id)
        const task = await Task.findByPk(req.params.task_id)
        await task.destroy()
        res.redirect(`/users/${user.id}/boards/${board.id}`)
    })
    //Update status
app.post('/users/:task_id/updatetask', async(req, res) => {
    const task = await Task.findByPk(req.params.task_id)
    task.update({ status: req.body.status })
    res.send()
})


//this is the point where the server is initialised. 
app.listen(3000, () => {
    db.sync().then(async() => {
        const boards = await Board.findAll()

        if (boards.length > 0) {
            return
        }
        const sarah = await User.create({ "name": "Sarah", "image": "https://images.pexels.com/photos/2364633/pexels-photo-2364633.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260" })
        const krystyna = await User.create({ "name": "Krystyna", "image": "https://images.pexels.com/photos/589840/pexels-photo-589840.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260" })
        const josie = await User.create({ "name": "Josie", "image": "https://images.pexels.com/photos/617965/pexels-photo-617965.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260" })
        const board1 = await Board.create({ "title": "Board 1", "image": "https://images.pexels.com/photos/3335511/pexels-photo-3335511.jpeg?auto=compress&cs=tinysrgb&dpr=2&w=500" })
        await Task.create({ "desc": "Feed dog", "status": 0, "BoardId": board1.id, UserId: sarah.id })
        await Task.create({ "desc": "Text mum", "status": 0, "BoardId": board1.id, UserId: krystyna.id })
        await Task.create({ "desc": "Put on clothes", "status": 0, "BoardId": board1.id, UserId: josie.id })
        const board2 = await Board.create({ "title": "Board 2", "image": "https://images.pexels.com/photos/268362/pexels-photo-268362.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260" })
        await Task.create({ "desc": "Go Shopping", "status": 0, "BoardId": board2.id, UserId: krystyna.id })
        await Task.create({ "desc": "Take bins out", "status": 0, "BoardId": board2.id, UserId: josie.id })
        await Task.create({ "desc": "Eat food", "status": 0, "BoardId": board2.id, UserId: sarah.id })

    }).catch(console.error)
    console.log('port = ', 3000)
})