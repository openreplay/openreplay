describe('Testing general stability', {
  viewportHeight: 900,
  viewportWidth: 1400,
}, () => {
  it('Checking if app will crash', () => {
    cy.clearCookies()
    cy.clearAllSessionStorage()
    cy.clearAllCookies()
    cy.clearAllLocalStorage()

    cy.intercept('**/api/account').as('getAccount');

    cy.visit('/')
    cy.get('[data-test-id=login]').type(Cypress.env('account').replaceAll('"', ''));
    cy.get('[data-test-id=password]').type(Cypress.env('password').replaceAll('"', ''));
    cy.get('[data-test-id=log-button]').click();
    cy.wait('@getAccount')

    Cypress.on('uncaught:exception', (err, runnable) => {
      return false
    })

    cy.get(':nth-child(1) > .ant-menu-item-group-title > .ant-typography').should('be.visible')

    cy.visit('/5/dashboard')
    cy.wait(500)
    cy.get('input[name="dashboardsSearch"]').should('be.visible')

    cy.visit('/client/account')

    cy.get(':nth-child(2) > .profileSettings-module__left--D4pCi > .profileSettings-module__info--DhVpL').should('be.visible')

    cy.get('.ant-menu-item-group-list > :nth-child(2)').click()
    cy.wait(250)
    cy.get('.text-2xl > div').should('be.visible')
    cy.get('.ant-menu-item-group-list > :nth-child(3)').click()
    cy.get('.ant-menu-item-group-list > :nth-child(4)').click()
    cy.get('.text-base').should('be.visible')

    cy.get('.ant-menu-item-group-title').should('be.visible')

    // if test has not failed, we assume that app is not crashed (so far)
  })
})