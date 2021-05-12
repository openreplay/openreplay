const puppeteer = require('puppeteer')
const appUrlBase = process.env.BASE_URL
const searchEmail = process.env.SEARCH_EMAIL
const person = {
  email: process.env.EMAIL,
  password: process.env.PASSWORD,
  token: process.env.CAPTCHA_TOKEN
};

let browser
let page
let client
let project

beforeAll(async () => {
  browser = await puppeteer.launch(
    {
      headless: false,
      slowMo: 10,
      defaultViewport: null,
    }
  )
  page = await browser.newPage()
  await page.setUserAgent( 'UA-TEST' );
  await page.setJavaScriptEnabled(true);
  await page.setDefaultNavigationTimeout(10000);
  await page.setRequestInterception(true);

  await page.evaluate(async () => {
    const response = await fetch(appUrlBase + '/API_TESTING/update');
    const text = await response.text();
    return text;
  });

  page.on('request', (req) => {
    if (['image', 'font'].indexOf(req.resourceType()) !== -1) {
      req.abort();
    } else if (req.url().match(/login/) && req.method() === 'POST') {
      var data = {
        'method': 'POST',
        'postData': JSON.stringify(person),
      }
      req.continue(data);
    } else {
      req.continue();
    }
  });
})

describe('Login', () => {
  test('User login', async () => {  
    await page.goto(appUrlBase + '/login');
    await page.waitForSelector('form');

    await page.click("input[name=email]");
    await page.type("input[name=email]", person.email);
  
    await page.click("input[name=password]");
    await page.type("input[name=password]", person.password);

    await page.click("button[type=submit]");

    const response = await page.waitForResponse(response => response.url().match(/login/) && response.request().method() === 'POST');
    try {
      const finalResponse = await response.json();
      client = finalResponse.data.client;
      project = client.projects[0];
    } catch (e) {
      console.log(e)
    }

    expect(response.status()).toBe(200)
  }, 9000000)
});

describe('Sessions', () => {
  test('Search for sessions using email', async () => {
    await page.goto(`${appUrlBase}/${project.projectId}/sessions`);
    await page.waitForSelector('#search');
    await page.click("#search");
    await page.type("#search", searchEmail);

    await page.waitForSelector('#filter-item');
    await page.click("#filter-item");

    const response = await page.waitForResponse(response => response.url().match(/search2/) && response.request().method() === 'POST');
    expect(response.status()).toBe(200)
    await page.waitForTimeout(2000)
  }, 9000000)

  test('Replay a session', async () => {
    await page.waitForSelector('#session-item');
    await page.waitForSelector('#play-button');
    await page.click("#play-button");

    const response = await page.waitForResponse(response => response.url().match(/sessions2/) && response.request().method() === 'GET');
    try {
      const finalResponse = await response.json();
    } catch (e) {
      console.log(e)
    }

    expect(response.status()).toBe(200)
  }, 9000000)

  test('Open network tab', async () => {
    await page.waitForTimeout(3000)
    await page.waitForSelector('#control-button-network:not([disabled])')
    await page.click("#control-button-network");

    await page.waitForSelector('#table-row')
  }, 9000000)

  test('Open fetch tab', async () => {
    await page.waitForSelector('#control-button-fetch:not([disabled])')
    await page.click("#control-button-fetch");

    await page.waitForSelector('#table-row')
  }, 9000000)
  
  test('Open redux tab', async () => {
    await page.waitForSelector('#control-button-redux:not([disabled])')
    await page.click("#control-button-redux");

    await page.waitForSelector('.object-key-val')
  }, 9000000)

  test('Open console tab', async () => {
    await page.waitForSelector('#control-button-console:not([disabled])')
    await page.click("#control-button-console");

    await page.waitForSelector('div[class^="console_line_"]')
  }, 9000000)

  test('Open events tab', async () => {
    await page.waitForSelector('#control-button-events:not([disabled])')
    await page.click("#control-button-events");

    await page.waitForSelector('#table-row')
  }, 9000000)

  test('Open performance tab', async () => {
    await page.waitForSelector('#control-button-performance:not([disabled])')
    await page.click("#control-button-performance");

    await page.waitForSelector('.recharts-surface')
  }, 9000000)
  
  test('Open long tasks tab', async () => {
    await page.waitForSelector('#control-button-long:not([disabled])')
    await page.click("#control-button-long");

    await page.waitForSelector('#table-row')
  }, 9000000)

  test('Check sessions by metadata', async () => {
    await page.waitForSelector('#metadata-button')
    await page.click("#metadata-button");

    await page.waitForSelector('#metadata-item')
    await page.click("#metadata-item");

    const response = await page.waitForResponse(response => response.url().match(/session_search/) && response.request().method() === 'GET');
    expect(response.status()).toBe(200)

    await page.waitForTimeout(5000)
  }, 9000000)
})


describe('Errors', () => {
  test('Navigate to errors and open an exception to see stacktrace', async () => {
    const url = `${appUrlBase}/${project.projectId}/errors`;
    await page.goto(url);
    await page.waitForSelector('#error-item');
    await page.click("#error-item");

    const response = await page.waitForResponse(response => response.url().match(/errors/) && response.request().method() === 'GET');
    try {
      const finalResponse = await response.json();
    } catch (e) {
      console.log(e)
    }

    expect(response.status()).toBe(200)
  }, 9000000)
})

describe('Preferences', () => {
  test('Add a user', async () => {
    await page.goto(`${appUrlBase}/client/manage-users`);
    await page.waitForSelector('#add-button');
    await page.click("#add-button");

    await page.waitForSelector('form');
    await page.waitForSelector("#name-field");
    await page.click("#name-field");
    await page.type("#name-field", 'Puppeteer User');

    await page.click("input[name=email]");
    await page.type("input[name=email]", 'puppeteer@openreplay.com');

    const [button] = await page.$x("//button[contains(., 'Invite')]");
    await button.click();

    const response = await page.waitForResponse(response => response.url().match(/members/) && response.request().method() === 'PUT');
    expect(response.status()).toBe(200)
  }, 9000000)

  test('Delete user', async () => {
    await page.goto(`${appUrlBase}/client/manage-users`);
    await page.waitForSelector('#user-row')

    const rows = await page.$$('#user-row')
    await page.click(`#user-row:nth-child(${rows.length - 1}) #trash`)    
    await page.waitForSelector('#confirm-button')
    await page.click('#confirm-button')


    const response = await page.waitForResponse(response => response.url().match(/members/) && response.request().method() === 'DELETE');
    expect(response.status()).toBe(200)
  }, 9000000)
})

describe('Alerts', () => {
  test('Create Alert', async () => {
    await page.goto(`${appUrlBase}/${project.projectId}/metrics`);
    await page.waitForSelector('#menu-manage-alerts')
    await page.click('#menu-manage-alerts')
    
    await page.waitForSelector('#add-button')

    await page.waitForTimeout(1000)
    await page.click('#add-button')

    await page.waitForSelector('form');
    await page.waitForSelector("#name-field");
    await page.click("#name-field", { clickCount: 3 });
    await page.type("#name-field", 'Test Alert');

    await page.waitForSelector("#name-field");
    await page.click("#name-field");

    await page.waitForSelector("div[name=left]");
    await page.click("div[name=left]");
    await page.waitForSelector('div[name=left] .selected.item')
    await page.click('div[name=left] .selected.item')

    await page.waitForSelector(`div[name=operator]`)
    await page.click(`div[name=operator]`)
    await page.waitForSelector('div[name=operator] .selected.item')
    await page.click('div[name=operator] .selected.item')

    await page.click("input[name=right]");
    await page.type("input[name=right]", '3');
    await page.$eval('input[name=right]', e => e.blur());


    // const [button] = await page.$x("//button[contains(., 'Create')]");
    // await button.click();
    await page.evaluate(() => {
      document.querySelector('#submit-button').click();
    })

    const response = await page.waitForResponse(response => response.url().match(/alerts/) && response.request().method() === 'PUT');
    expect(response.status()).toBe(200)
  }, 9000000)
  

  test('Updated Alert', async () => {
    await page.goto(`${appUrlBase}/${project.projectId}/metrics`);
    await page.waitForSelector('#menu-manage-alerts')
    await page.click('#menu-manage-alerts')

    await page.waitForSelector(`#alert-item:nth-child(1)`)
    await page.click(`#alert-item:nth-child(1)`)

    await page.waitForSelector('form');
    await page.waitForSelector("#name-field");
    await page.click("#name-field", { clickCount: 3 });
    await page.type("#name-field", 'Test Alert - Update');

    await page.evaluate(() => {
      document.querySelector('#submit-button').click();
    })
    const response = await page.waitForResponse(response => response.url().match(/alerts/) && response.request().method() === 'PUT');
    expect(response.status()).toBe(200)
  }, 9000000)

  test('Delete Alert', async () => {
    await page.goto(`${appUrlBase}/${project.projectId}/metrics`);
    await page.waitForSelector('#menu-manage-alerts')
    await page.click('#menu-manage-alerts')
    
    await page.waitForSelector(`#alert-item:nth-child(1)`)
    await page.click(`#alert-item:nth-child(1)`)

    await page.waitForSelector('form');
    await page.waitForSelector('form button#trash-button')
    await page.click('form button#trash-button')

    await page.waitForSelector('#confirm-button')
    await page.click('#confirm-button')

    const response = await page.waitForResponse(response => response.url().match(/alerts/) && response.request().method() === 'DELETE');
    expect(response.status()).toBe(200)
  }, 9000000)
})

describe('Metrics', () => {
  test('Load Metircs', async () => {
    await page.goto(`${appUrlBase}/${project.projectId}/metrics`);

    const response = await page.waitForResponse(response => response.url().match(/dashboard\/overview/) && response.request().method() === 'POST');
    expect(response.status()).toBe(200)
  }, 9000000)

  test('Add country filter', async () => {
    await page.waitForSelector('#filter-options')
    await page.click('#filter-options')
    await page.waitForSelector('#filter-dropdown')
    await page.waitForSelector('#filter-dropdown > div:nth-child(6)')
    await page.click('#filter-dropdown > div:nth-child(6)')

    await page.waitForSelector('div[class^="widgetAutoComplete_searchWrapper_"]')
    await page.type('div[class^="widgetAutoComplete_searchWrapper_"]', 'France')
    
    await page.waitForTimeout(300)
    await page.waitForSelector('div[class^="widgetAutoComplete_optionItem_"]:nth-child(1)')
    await page.click('div[class^="widgetAutoComplete_optionItem_"]:nth-child(1)')

    const response = await page.waitForResponse(response => response.url().match(/dashboard\/overview/) && response.request().method() === 'POST');
    expect(response.status()).toBe(200)
  }, 9000000)

  test('Compare with other country', async () => {
    await page.waitForSelector('#compare-button')
    await page.click('#compare-button')

    const rows = await page.$$('#filter-options')
    rows[1].click()
    
    await page.waitForTimeout(1000)
    await page.waitForSelector('#filter-dropdown')
    await page.waitForSelector('#filter-dropdown > div:nth-child(6)')
    await page.click('#filter-dropdown > div:nth-child(6)')
    await page.waitForSelector('div[class^="widgetAutoComplete_searchWrapper_"]')
    await page.type('div[class^="widgetAutoComplete_searchWrapper_"]', 'India')
    await page.waitForTimeout(300)
    await page.waitForSelector('div[class^="widgetAutoComplete_optionItem_"]:nth-child(1)')
    await page.click('div[class^="widgetAutoComplete_optionItem_"]:nth-child(1)')

    const responseTwo = await page.waitForResponse(response => response.url().match(/dashboard\/overview/) && response.request().method() === 'POST');
    expect(responseTwo.status()).toBe(200)
  }, 9000000)
})

afterAll(() => {
  browser.close()
})
