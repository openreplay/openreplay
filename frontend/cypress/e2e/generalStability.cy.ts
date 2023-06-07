describe('Testing general stability', {
  viewportHeight: 900,
  viewportWidth: 1400,
}, () => {
  it('Checking if app will crash', () => {
    cy.intercept('**/api/account').as('getAccount');

    cy.visit('/')
    cy.get('[data-test-id=login]').type(Cypress.env('account').replaceAll('"', ''));
    cy.get('[data-test-id=password]').type(Cypress.env('password').replaceAll('"', ''));
    cy.get('[data-test-id=log-button]').click();
    cy.wait('@getAccount')

    cy.get('#search').should('be.visible')


    cy.get('[data-test-id="dashboards"]').click()

    cy.get(':nth-child(1) > .relative > :nth-child(1) > #menu-manage-alerts > .w-full').should('be.visible')


    cy.visit('/client/account')

    cy.get(':nth-child(2) > .profileSettings-module__left--D4pCi > .profileSettings-module__info--DhVpL').should('be.visible')

    cy.get(':nth-child(3) > .relative > :nth-child(1) > .sideMenuItem-module__menuItem--UzuXv > .w-full > .sideMenuItem-module__iconLabel--Cl_48 > .sideMenuItem-module__title--IFkbw').click()
    cy.get(':nth-child(4) > .relative > :nth-child(1) > .sideMenuItem-module__menuItem--UzuXv > .w-full > .sideMenuItem-module__iconLabel--Cl_48 > .sideMenuItem-module__title--IFkbw').click()
    cy.get(':nth-child(5) > .relative > :nth-child(1) > .sideMenuItem-module__menuItem--UzuXv > .w-full > .sideMenuItem-module__iconLabel--Cl_48 > .sideMenuItem-module__title--IFkbw').click()

    cy.get('.webhooks-module__tabHeader--I0FXb').should('be.visible')

    // if test has not failed, we assume that app is not crashed (so far)
  })
})