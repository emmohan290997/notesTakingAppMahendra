const express = require('express')
const app = express()

app.use(express.json())

const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const path = require('path')
const dbPath = path.join(__dirname, 'notes.db')

const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

let db = null

const initializeDataBaseServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })

    app.listen(3000, () => {
      console.log('Server Running on Port Number 3000')
    })
  } catch (error) {
    console.log(`DB Error : ${error.message}`)
    process.exit(1)
  }
}

initializeDataBaseServer()

//TO create a user

app.post('/register/', async (request, response) => {
  console.log("success")
  const {username, password, name, gender} = request.body
  const isUserThereQuery = `SELECT * FROM user WHERE username='${username}';`
  const result = await db.get(isUserThereQuery)
  if (result === undefined) {
    if (password.length < 6) {
      response.status(400)
      response.send('Password is too short')
    } else {
      const hashedPassword = await bcrypt.hash(password, 10)
      const toAddNewUserQuery = `INSERT INTO 
          user(name,username, password, gender) 
          VALUES ('${name}','${username}'
          ,'${hashedPassword}', '${gender}');`
      await db.run(toAddNewUserQuery)
      response.status(200)
      response.send('User created successfully')
    }
  } else {
    response.status(400)
    response.send('User already exists')
  }
})

//To Login User
app.post('/login/', async (request, response) => {
  const {username, password} = request.body
  const isUserThereCheckQuery = `SELECT * FROM user WHERE username='${username}';`
  const result = await db.get(isUserThereCheckQuery)
  if (result !== undefined) {
    const isPasswordSameCheck = await bcrypt.compare(password, result.password)
    if (isPasswordSameCheck) {
      const payload = {username: username}
      const jwtToken = await jwt.sign(payload, 'MyNameIsMahendra')
      console.log(jwtToken)
      response.status(200)
      response.send({jwtToken: jwtToken})
    } else {
      response.status(400)
      response.send('Invalid password')
    }
  } else {
    response.status(400)
    response.send('Invalid user')
  }
})

//Authenticate JWT Token

const authenticateJwtToken = async (request, response, next) => {
  const authorization = request.headers.authorization
  if (authorization !== undefined) {
    const jwtToken = authorization.split(' ')[1]
    await jwt.verify(jwtToken, 'MyNameIsMahendra', (error, payload) => {
      if (error) {
        response.status(401)
        response.send('Invalid JWT Token')
      } else {
        request.username = payload.username
        next()
      }
    })
  } else {
    response.status(401)
    response.send('Invalid JWT Token')
  }
}

//To create a note

app.post('/user/notes/', authenticateJwtToken, async (request, response) => {
  const {notes} = request.body
  const username = request.username
  const toKnowUserId = `SELECT userId FROM user WHERE username LIKE '${username}';`
  const userData = await db.get(toKnowUserId)
  const {userId} = userData
  const {note, tags, bgColor, dueDate, archived, deleteNote, deleteDate} = notes
  const updateNotes = `INSERT INTO notes INNER JOIN userNotes ON notes.noteId = userNotes.noteId (notes.note, notes.tags, notes.bgColor, notes.dueDate, notes.archived, notes.deleteNote, notes.deleteDate, userNotes.userId)
  VALUES ('${note}', '${tags}', '${bgColor}', '${dueDate}', '${archived}', '${deleteNote}', '${deleteDate}', ${userId});`

  await db.run(updateNotes)
  response.send('Created a note')
})

//To return the search

app.get('/user/search/', authenticateJwtToken, async (request, response) => {
  const username = request.username
  const {search} = request.params
  const getUserId = `SELECT userId FROM user WHERE username LIKE '${username}';`
  const userDetails = await db.get(getUserId)
  const sqlQuery = `SELECT *
    FROM notes INNER JOIN userNotes ON notes.noteId=userNotes.noteId
    WHERE userNotes.userId=${userDetails.userId} AND notes.note LIKE %'${search}'%;`
  const result = await db.all(sqlQuery)
  response.send(result)
})

//To return the label

app.get(
  '/user/label/:label/',
  authenticateJwtToken,
  async (request, response) => {
    const {label} = request.params
    const username = request.username
    const toKnowUserId = `SELECT * FROM user WHERE username LIKE '${username}';`
    const userData = await db.get(toKnowUserId)

    const toGetQuery = `SELECT *
    FROM notes INNER JOIN userNotes ON notes.noteId = userNotes.noteId 
    WHERE userNotes.userId=${userData.userId} AND notes.tags LIKE %'${label}'%;`
    const result = await db.all(toGetUserFollowingUsersTweetsQuery)
    response.send(result)
  })

app.get('/hello/', async (request, response) => {
  console.log('hello mahendra')
  response.send(hello)
  
})

