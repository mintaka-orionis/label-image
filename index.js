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

let browser
let puppeteerReLaunchCounter = 0
const puppeteerLaunchOptions = {
  args: [
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--disable-setuid-sandbox',
    '--no-first-run',
    '--no-sandbox',
    '--no-zygote',
    '--single-process'
  ]
};

(async () => {
  await launchPuppeteer()
})()

async function getPage() {
  if (puppeteerReLaunchCounter > 3) {
    console.error("Cannot launch puppeteer.")
    process.exit(1)
  }

  let page
  try {
    page = await browser.newPage()
    page.setDefaultNavigationTimeout(1000)
    puppeteerReLaunchCounter = 0

    const pages = await browser.pages()
    console.log(`pages counts: ${pages.length}`)
    if (pages.length > 5) {
      throw new Error("Too many pages")
    }
  } catch (err) {
    puppeteerReLaunchCounter++

    console.error('cannot create page. try relaunch.', err.stack)
    await browser.close()
    await launchPuppeteer()

    page = await getPage()
  }

  return page
}

async function launchPuppeteer() {
  console.log(`puppeteerReLaunchCounter: ${puppeteerReLaunchCounter}`)

  console.log("launch puppeteer")
  browser = await puppeteer.launch(puppeteerLaunchOptions)
  console.log(`puppeteer is running PID: ${browser.process().pid}, ENDPOINT: ${browser.wsEndpoint()}`)

  browser.on('disconnected', async () => {
    console.log('puppeteer disconnected. need relaunch.')
  })
}

app.set('view engine', 'pug')

app.use(morgan('combined'))

app.get('/ress.min.css', (req, res) => {
  res.sendFile(path.join(__dirname, 'css', 'ress.min.css'))
})
app.get('/style.css', (req, res) => {
  res.sendFile(path.join(__dirname, 'css', 'style.css'))
})

const labelTextRegex = /^[\x20-\x7e]{1,100}$/

app.get('/', (req, res) => {
  if ((labelTypes.includes(req.query.labelType) || req.query.labelType == null) && labelTextRegex.test(req.query.labelText)) {
    res.render('index', { labelType: req.query.labelType ? `label-${req.query.labelType}` : 'label-default', labelText: req.query.labelText })
  } else {
    res.sendStatus(400)
  }
})

app.get('/img', async (req, res) => {
  if ((labelTypes.includes(req.query.labelType) || req.query.labelType == null) && labelTextRegex.test(req.query.labelText)) {
    const file = path.join(tmpDir, `${req.query.labelType || 'default'}-${req.query.labelText}.png`)

    if (!fs.existsSync(file)) {
      const page = await getPage()
      await page.goto(`http://localhost:${port}/?${req.query.labelType == null ? '' : `labelType=${req.query.labelType}&`}labelText=${req.query.labelText}`)
      const label = await page.$('#label')
      if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir)
      const image = await label.screenshot({path: file, omitBackground: true})
      res.writeHead(200, {
        'Content-Type': 'image/png',
        'Content-Length': image.length
      })
      res.end(image)
      await page.close()
    } else {
      res.sendFile(file)
    }
  } else {
    res.sendStatus(400)
  }
})

app.get('/img/:label', async (req, res) => {
  if (req.params.label) {
    if (labelMap[req.params.label]) {
      const file = path.join(tmpDir, `${req.params.label}.png`)

      if (!fs.existsSync(file)) {
        const page = await getPage()
        await page.goto(`http://localhost:${port}/${req.params.label}`)
        const label = await page.$('#label')
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir)
        const image = await label.screenshot({path: file, omitBackground: true})
        res.writeHead(200, {
          'Content-Type': 'image/png',
          'Content-Length': image.length
        })
        res.end(image)
        await page.close()
      } else {
        res.sendFile(file)
      }
    } else {
      res.sendStatus(404)
    }
  } else {
    res.sendStatus(404)
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

app.listen(port, host, () => {
  console.log(`label-image listening at http://${host}:${port}`)
})
