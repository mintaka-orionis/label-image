const fs = require('fs')
const path = require('path')
const express = require('express')
const morgan = require('morgan')
const puppeteer = require('puppeteer')
const app = express()
const host = '0.0.0.0'
const port = 3000

const labelTypes = ['default', 'warning', 'success']
const labelMap = {
  CE: 'warning',
  MLE: 'warning',
  TLE: 'warning',
  RE: 'warning',
  IE: 'warning',
  WA: 'warning',
  AC: 'success',
  WJ: 'default',
  WR: 'default'
}

const tmpDir = path.join(__dirname, 'tmp')

app.set('view engine', 'pug')

app.use(morgan('combined'))

app.get('/ress.min.css', (req, res) => {
  res.sendFile(path.join(__dirname, 'css', 'ress.min.css'))
})
app.get('/style.css', (req, res) => {
  res.sendFile(path.join(__dirname, 'css', 'style.css'))
})


app.get('/', (req, res) => {
  if ((labelTypes.includes(req.query.labelType) || req.query.labelType == null) && /[a-zA-Z0-9]/.test(req.query.labelText)) {
    res.render('index', { labelType: req.query.labelType ? `label-${req.query.labelType}` : 'label-default', labelText: req.query.labelText })
  } else {
    res.sendStatus(400)
  }
})

app.get('/:label', (req, res) => {
  if (req.params.label) {
    const labelType = labelMap[req.params.label]

    if (labelType) {
      res.render('index', { labelType: `label-${labelType}`, labelText: req.params.label })
    } else {
      res.sendStatus(404)
    }
  } else {
    res.sendStatus(404)
  }
})

app.get('/img', async (req, res) => {
  if (labelTypes.includes(req.query.labelType) && /[a-zA-Z0-9]/.test(req.query.labelText)) {
    const file = path.join(tmpDir, `${req.query.labelType}-${req.query.labelText}.png`)

    if (!fs.existsSync(file)) {
      const browser = await puppeteer.launch()
      const page = (await browser.pages())[0]
      await page.goto(`http://localhost:${port}/?labelType=${req.query.labelType}&labelText=${req.query.labelText}`)
      const label = await page.$('#label')
      if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir)
      await label.screenshot({path: file, omitBackground: true})
      await page.close()
    }

    res.sendFile(file)
  } else {
    res.sendStatus(400)
  }
})
app.get('/img/:label', async (req, res) => {
  if (req.params.label) {
    if (labelMap[req.params.label]) {
      const file = path.join(tmpDir, `${req.params.label}.png`)

      if (!fs.existsSync(file)) {
        const browser = await puppeteer.launch()
        const page = (await browser.pages())[0]
        await page.goto(`http://localhost:${port}/${req.params.label}`)
        const label = await page.$('#label')
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir)
        await label.screenshot({path: file, omitBackground: true})
        await page.close()
      }

      res.sendFile(file)
    } else {
      res.sendStatus(404)
    }
  } else {
    res.sendStatus(404)
  }
})

app.listen(port, host, () => {
  console.log(`label-image listening at http://${host}:${port}`)
})
