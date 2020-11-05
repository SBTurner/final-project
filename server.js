const express = require("express")
const Handlebars = require("handlebars")
const expressHandlebars = require("express-handlebars")
const { allowInsecurePrototypeAccess } = require("@handlebars/allow-prototype-access")

const { Board, Task, TaskItem, User, db } = require("./models/models")

const app = express()


//Custom handlebars
const hbs = expressHandlebars.create({
    helpers: {
        removeUser: function() {
            
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
            tasks
            .filter(task => task.User)
            .map((task) => (users[task.User.id] = task.User.image))
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
        const tasks = await board.getTasks({ include: [{ model: User}, {model: TaskItem, as: "items"}] })
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
        const user = await User.findByPk(req.params.user_id)
        await board.update(req.body)
        res.redirect(`/users/${user.id}/boards/${board.id}`)
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
        if(req.body.selectpicker == "no") {
            await Task.create({ desc: req.body.desc, status: 0, BoardId: board.id, UserId: null })
        } else {
            const selectUser = await User.findByPk(req.body.selectpicker)
            await Task.create({ desc: req.body.desc, status: 0, BoardId: board.id, UserId: selectUser.id })
        }
        res.redirect(`/users/${user.id}/boards/${board.id}`)
    })
    //Update tasks
app.post(['/users/:user_id/boards/:board_id/tasks/:task_id/edit'], async(req, res) => {
        const task = await Task.findByPk(req.params.task_id)
        const board = await Board.findByPk(req.params.board_id)
        const user = await User.findByPk(req.params.user_id)
        if(req.body.selectpicker == "no") {
            await task.update({ desc: req.body.desc, status: req.body.move, BoardId: board.id, UserId: null})
        } else {
            const selectUser = await User.findByPk(req.body.selectpicker)
            await task.update({ desc: req.body.desc, status: req.body.move, BoardId: board.id, UserId: selectUser.id })
        }
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
    //Add task item
app.post('/users/:user_id/boards/:board_id/tasks/:task_id/items/create', async(req, res) => {
    const board = await Board.findByPk(req.params.board_id)
    const user = await User.findByPk(req.params.user_id)
    const task = await Task.findByPk(req.params.task_id)
    await TaskItem.create({ item: req.body.item, progress: 0, TaskId: task.id})
    res.redirect(`/users/${user.id}/boards/${board.id}`)
})
    //Delete Task item
app.get(['/users/:user_id/boards/:board_id/tasks/:task_id/items/:item_id/delete'], async(req, res) => {
    const board = await Board.findByPk(req.params.board_id)
    const user = await User.findByPk(req.params.user_id)
    const task = await Task.findByPk(req.params.task_id)
    const taskitem = await TaskItem.findByPk(req.params.item_id)
    await taskitem.destroy()
    res.redirect(`/users/${user.id}/boards/${board.id}`)
})

    //Update status
app.post('/users/:task_id/updatetask', async(req, res) => {
    const task = await Task.findByPk(req.params.task_id)
    await task.update({ status: req.body.status })
    res.send()
})
    //Update progress
app.post('/users/:taskitem_id/update-taskitem', async(req, res) => {
    const taskitem = await TaskItem.findByPk(req.params.taskitem_id)
    await taskitem.update({ progress: req.body.progress })
    res.send()
})

//this is the point where the server is initialised. 
app.listen(process.env.PORT || 3000, () => {
    db.sync().then(async() => {
        const boards = await Board.findAll()

        if (boards.length > 0) {
            return
        }
        const sarah = await User.create({ "name": "Sarah", "image": "https://images.pexels.com/photos/2364633/pexels-photo-2364633.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260" })
        const krystyna = await User.create({ "name": "Krystyna", "image": "https://images.pexels.com/photos/589840/pexels-photo-589840.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260" })
        const josie = await User.create({ "name": "Josie", "image": "https://images.pexels.com/photos/617965/pexels-photo-617965.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260" })
        const board1 = await Board.create({ "title": "Board 1", "image": "https://images.pexels.com/photos/1121123/pexels-photo-1121123.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260" })
        await Task.create({ "desc": "Feed dog", "status": 0, "BoardId": board1.id, UserId: sarah.id })
        await Task.create({ "desc": "Prepare for exam", "status": 0, "BoardId": board1.id, UserId: krystyna.id })
        await Task.create({ "desc": "Create Kanban", "status": 0, "BoardId": board1.id, UserId: josie.id })
        const board2 = await Board.create({ "title": "Board 2", "image": "https://images.pexels.com/photos/268362/pexels-photo-268362.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260" })
        await Task.create({ "desc": "Go Shopping", "status": 0, "BoardId": board2.id, UserId: krystyna.id })
        await Task.create({ "desc": "Take bins out", "status": 0, "BoardId": board2.id, UserId: josie.id })
        await Task.create({ "desc": "Eat food", "status": 0, "BoardId": board2.id, UserId: sarah.id })
        await TaskItem.create({ "item": "Add CSS", "progress": 0, TaskId: 3})
        await TaskItem.create({ "item": "Make responsive", "progress": 1, TaskId: 3})
        await TaskItem.create({ "item": "Style forms", "progress": 0, TaskId: 3})
        await TaskItem.create({ "item": "Run cypress tests", "progress": 0, TaskId: 3})
        await TaskItem.create({ "item": "Buy a notebook", "progress": 0, TaskId: 2})
        await TaskItem.create({ "item": "Organise pens", "progress": 1, TaskId: 2})
        await TaskItem.create({ "item": "Buy correct textbooks", "progress": 1, TaskId: 2})


    }).catch(console.error)
    console.log('port = ', process.env.PORT)
})