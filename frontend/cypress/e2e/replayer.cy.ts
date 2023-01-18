describe('Replayer visual match test', () => {
  it('Teklogiks sessions on 3 and 20 seconds are same', () => {
    cy.intercept('/api/account').as('getAccount')
    cy.intercept('/mobs/*').as('getSession')

    cy.visit('/', {
      onBeforeLoad: function (window) {
        window.localStorage.setItem('notesFeatureViewed', 'true');
      }
    })
    cy.get(':nth-child(1) > .relative > .p-2').type(Cypress.env('account'))
    cy.get(':nth-child(2) > .relative > .p-2').type(Cypress.env('password'))
    cy.get('.h-10').click()
    cy.wait('@getAccount')
    cy.visit('3/session/7585361734083637?jumpto=5000&freeze=true')
    cy.wait(3000)

    cy.matchImageSnapshot('1st-breakpoint');

    cy.visit('3/session/7585361734083637?jumpto=20000&freeze=true')
    // adjusting because we have more messages to load
    cy.wait(5000)

    cy.matchImageSnapshot('2nd-breakpoint');
  })
})