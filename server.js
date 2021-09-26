require('dotenv').config()

const express = require('express')
const fs = require('fs')
const multer = require('multer')

const upload = multer({
  storage: multer.diskStorage({
    destination: './uploads',
    filename: (_, file, cb) => {
      cb(null, +new Date() + file.originalname)
    },
  }),
}).single('image')

const app = express()

app.use(express.static('./uploads'))

app.get('/', (_, res) => {
  return res.end(fs.readFileSync('./index.html'))
})

app.post('/upload', upload, (req, res) => {
  const filename = req.file.filename
  return res.send('image uploaded successfully')
})

const PORT = 3000
app.listen(PORT, () => {
  console.log(`Server started at http://localhost:${PORT}`)
})
