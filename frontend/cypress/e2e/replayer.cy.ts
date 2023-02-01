const SECOND = 1000

describe('Replayer visual match test', {
  viewportHeight: 900,
  viewportWidth: 1400,
}, () => {
  let sessionUrl;
  it('Generating tracker session...', () => {
    cy.visit('http://localhost:3000/')

    cy.scrollTo('bottom', { duration: 500 })
    cy.wait(SECOND * 1.5)
    cy.scrollTo('top', { duration: 500 })

    cy.get('#testrender').click()
    cy.wait(SECOND * 1.5)
    cy.get('#testrender').click()

    cy.get('#obscured-text').type('testing typing in obscured input')
    cy.get('#visible-input').type('testing typing in visible input')
    cy.wait(SECOND * 1.5)

    cy.get('#redcounter').click().click().click()
    cy.wait(SECOND * 1.5)

    cy.window().then(win => {
      sessionUrl = win.__OPENREPLAY__.app.getSessionURL()
    })
  })

  it('Checking Replayer at breakpoints, user events and console', () => {
    cy.intercept('**/api/account').as('getAccount')
    cy.intercept('**/mobs/7585361734083637/dom.mobs?*').as('getFirstMob')
    cy.intercept('**/mobs/7585361734083637/dom.mobe?*').as('getSecondMob')

    cy.visit('http://0.0.0.0:3333', {
      onBeforeLoad: function (window) {
        window.localStorage.setItem('notesFeatureViewed', 'true');
      }
    })
    cy.get(':nth-child(1) > .relative > .p-2').type(Cypress.env('account').replaceAll("\"", ''))
    cy.get(':nth-child(2) > .relative > .p-2').type(Cypress.env('password').replaceAll("\"", ''))
    cy.get('.justify-center > .h-10').click()
    cy.wait('@getAccount')
    cy.wait(SECOND * 2)
    cy.visit('3/session/7585361734083637?jumpto=5000&freeze=true')
    cy.wait('@getFirstMob')
    cy.wait('@getSecondMob')
    cy.wait(SECOND * 2)
    cy.window().then(win => {
      win.playerJump(SECOND * 5)
    })
    cy.wait(SECOND * 4)

    cy.matchImageSnapshot('1st-breakpoint');

    cy.window().then(win => {
      win.playerJump(SECOND * 21)
    })
    cy.wait(SECOND * 4)

    cy.matchImageSnapshot('2nd-breakpoint');

    cy.get('[data-openreplay-label="User Steps"]').click()
    cy.matchImageSnapshot('User-Events');

    cy.get('#control-button-network > .controlButton-module__label--YznMl').click()
    cy.matchImageSnapshot('Network-Events');

    // checking real session
    cy.wait(SECOND * 120)
    cy.visit(sessionUrl.replace('https//foss.openreplay.com/', '') + '?jumpto=0&freeze=true')
    cy.wait(SECOND * 10)

  })
})