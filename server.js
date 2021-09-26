require('dotenv').config()

const express = require('express')
const fs = require('fs')
const multer = require('multer')
const AWS = require('aws-sdk')

AWS.config.update({
  accessKeyId: process.env.ACCESS_KEY_ID,
  secretAccessKey: process.env.SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
})

const rekognition = new AWS.Rekognition()

const imageModeratorParams = (imagePath = null) => {
  if (!imagePath) {
    throw new Error('Provide valid image path.')
  }
  const file = fs.readFileSync(imagePath)
  if (!imagePath) {
    throw new Error('No such file.')
  }
  const buffer = Buffer.from(file)
  return {
    Image: {
      Bytes: buffer,
    },
    // HumanLoopConfig: {
    //   FlowDefinitionArn:
    //     'STRING' /* required */,
    //   HumanLoopName: 'STRING' /* required */,
    //   DataAttributes: {
    //     ContentClassifiers: [
    //       'FreeOfPersonallyIdentifiableInformation',
    //       'FreeOfAdultContent',
    //     ],
    //   },
    // },
    MinConfidence: 50,
  }
}

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
  const getImageModeratorParams = imageModeratorParams(`./uploads/${filename}`)
  rekognition.detectModerationLabels(
    getImageModeratorParams,
    function (err, data) {
      if (err) {
        console.log('AWS ERROR', err, err.stack)
        return res.send(
          'Something went wrong while uploading image. Try again.'
        )
      }
      const isNotAllowed = hasExplicitContent(data.ModerationLabels)
      if (isNotAllowed) {
        // Delete the image that was saved
        try {
          fs.unlinkSync(`./uploads/${filename}`)
        } catch (error) {
          // skip into next step
        }
        return res.send('<p style="color: red;">Image not allowed</p>')
      }
      // Perform your normal task here
      return res.send(
        '<p style="color: green;">Image uploaded successfully.</p>'
      )
    }
  )
})

const PORT = 3000
app.listen(PORT, () => {
  console.log(`Server started at http://localhost:${PORT}`)
})

function hasExplicitContent(labels = []) {
  return labels.some(
    (label) =>
      label.Name === 'Explicit Nudity' || label.ParentName === 'Explicit Nudity'
  )
}
