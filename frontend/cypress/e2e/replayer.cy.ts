describe('Replayer visual match test', {
  viewportHeight: 900,
  viewportWidth: 1400,
}, () => {
  it('Checking Replayer at breakpoints, user events and console', () => {
    cy.intercept('/api/account').as('getAccount')
    cy.intercept('/mobs/7585361734083637/*').as('getSession')

    cy.visit('/', {
      onBeforeLoad: function (window) {
        window.localStorage.setItem('notesFeatureViewed', 'true');
      }
    })
    cy.get(':nth-child(1) > .relative > .p-2').type(Cypress.env('account').replaceAll("\"", ''))
    cy.get(':nth-child(2) > .relative > .p-2').type(Cypress.env('password').replaceAll("\"", ''))
    cy.get('.justify-center > .h-10').click()
    cy.wait('@getAccount')
    cy.visit('3/session/7585361734083637?jumpto=5000&freeze=true')
    cy.wait('@getSession')
    cy.wait(3000)

    cy.matchImageSnapshot('1st-breakpoint');

    cy.visit('3/session/7585361734083637?jumpto=20000&freeze=true')
    cy.wait('@getSession')
    // adjusting because we have more messages to load
    cy.wait(4000)

    cy.matchImageSnapshot('2nd-breakpoint');

    cy.get('[data-openreplay-label="User Steps"]').click()
    cy.matchImageSnapshot('User-Events');

    cy.get('#control-button-network > .controlButton-module__label--YznMl').click()
    cy.matchImageSnapshot('Network-Events');
  })
})