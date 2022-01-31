const express = require('express')
const speakeasy = require('speakeasy')
const uid = require('./uid')
const { JsonDB } = require('node-json-db')
const { Config } = require('node-json-db/dist/lib/JsonDBConfig')
const QRCode = require('qrcode')

const app = express()
app.use(express.json())

const db = new JsonDB(new Config('myDatabase', true, false, '/'))

// Register user & create temp secret

app.post('/api/register', (req, res) => {
    const id = uid()

    try {
        const path = `/user/${id}`
        const temp_secret = speakeasy.generateSecret()
        QRCode.toDataURL(temp_secret.otpauth_url, function (err, data_url) {
            if (err) {
                console.log(err)
                return res.status(500).json({ message: 'Error generating qrcode' })
            }
            db.push(path, { id, temp_secret, data_url })
            res.json({ id, secret: temp_secret.base32 })
        })
    }
    catch (err) {
        console.log(err)
        res.status(500).json({ message: 'Error generating secret' })
    }
})

// Verify token and make secret permanent

app.post('/api/verify', (req, res) => {
    const { token, userId } = req.body
    try {
        const path = `/user/${userId}`
        const user = db.getData(path)

        const { base32: secret } = user.temp_secret

        const verified = speakeasy.totp.verify({
            secret,
            encoding: 'base32',
            token
        })

        if (!verified) {
            console.log('NOT VERIFIED')
            return res.json({ verified: false })
        }

        db.push(path, {
            id: userId,
            secret: user.temp_secret,
            data_url: user.data_url
        })
        console.log('VERIFIED')
        return res.json({ verified: true })
    }
    catch (err) {
        console.log(err)
        res.status(500).json({ message: 'Error finding user' })
    }
})

app.post('/api/getQrCode', (req, res) => {
    const { userId } = req.body
    try {
        const path = `/user/${userId}`
        const user = db.getData(path)
        const base64Data = user.data_url.replace(/^data:image\/(png|jpeg|jpg);base64,/, '')
        const img = Buffer.from(base64Data, 'base64');
        res.writeHead(200, {
            'Content-Type': 'image/png',
            'Content-Length': img.length
        });
        res.end(img);
    }
    catch (err) {
        console.log(err)
        res.status(500).json({ message: 'Error finding user' })
    }
})

const PORT = process.env.PORT || 5000

app.get('/api', (req, res) => {
    res.json({ message: "Welcome to the two factor authentication example" })
})

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
})