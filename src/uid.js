const uid = () => {
    const rd = require('crypto').randomBytes
    return `${Date.now()}_${rd(32).toString('hex')}`
}

module.exports = uid