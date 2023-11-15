const SECOND = 1000;

describe(
  'Replayer visual match test',
  {
    viewportHeight: 900,
    viewportWidth: 1400,
  },
  () => {
    it('Testing generated tracker session', () => {
      cy.intercept('**/api/account').as('getAccount');
      cy.intercept('**/dom.mobs?*').as('getFirstMob')

      cy.visit('http://0.0.0.0:3333', {
        onBeforeLoad: function (window) {
          window.localStorage.setItem('notesFeatureViewed', 'true');
        },
      });
      Cypress.on('uncaught:exception', (err, runnable) => {
        return false
      })

      cy.origin('http://localhost:3000/', { args: { SECOND } }, ({ SECOND }) => {
        cy.visit('/');
        cy.wait(SECOND * 3);
        cy.get('#get-table').click()
        cy.wait(SECOND * 3);
        cy.get('#testrender').click();
        cy.wait(SECOND * 3);
        cy.get('#testrender').click();
        cy.get('#get-main').click()

        cy.get('#obscured-text').type('testing typing in obscured input');
        cy.get('#visible-input').type('testing typing in visible input');
        cy.wait(SECOND * 3);

        cy.get('#redcounter').click().click().click();
        cy.get('#test-api').click().click();
        cy.get('#test-event').click().click();
        cy.wait(SECOND * 15);

        cy.log('finished generating a session')

        cy.window().then((window) => {
          cy.task('setValue', { key: 'url', value: window.__OPENREPLAY__.app.getSessionURL() });
          cy.log(window.__OPENREPLAY__.app.getSessionURL());
          cy.wait(SECOND * 3)
        });
      });


      cy.task('getValue', 'url').as('firstAlias');

      cy.visit('/');
      cy.get('[data-test-id=login]').type(Cypress.env('account').replaceAll('"', ''));
      cy.get('[data-test-id=password]').type(Cypress.env('password').replaceAll('"', ''));
      cy.get('[data-test-id=log-button]').click();
      cy.wait('@getAccount');
      // checking real session
      cy.get('@firstAlias').then((firstAlias) => {
        cy.log(firstAlias);
        cy.log('waiting for session to save')
        cy.wait(SECOND * 180);
        cy.visit(firstAlias.slice(27) + '?freeze=true');
        cy.log('loading session')
        cy.wait(SECOND * 10);

        cy.window().then(win => {
          const jumpMethod = win.playerJump ? win.playerJump : win.playerJumpToTime
          jumpMethod(SECOND * 3)
        })
        cy.wait(SECOND * 3);
        cy.matchImageSnapshot('Tracker-3');

        cy.window().then(win => {
          win.playerJump(SECOND * 6)
        })
        cy.wait(SECOND * 3);
        cy.matchImageSnapshot('Tracker-5');

        cy.window().then(win => {
          const jumpMethod = win.playerJump ? win.playerJump : win.playerJumpToTime
          jumpMethod(SECOND * 9)
        })
        cy.wait(SECOND * 3);
        cy.matchImageSnapshot('Tracker-9');

        cy.window().then(win => {
          const jumpMethod = win.playerJump ? win.playerJump : win.playerJumpToTime
          jumpMethod(SECOND * 20)
        })
        cy.wait(SECOND * 3);
        cy.get('#control-button-redux > .controlButton-module__label--YznMl').click()
        cy.wait(SECOND * 0.5)
        cy.matchImageSnapshot('Tracker-19-redux');

        cy.get('#control-button-network').click()
        cy.wait(SECOND * 0.5)
        cy.matchImageSnapshot('Tracker-19-network');

        cy.get('#control-button-events').click()
        cy.wait(SECOND * 0.5)
        cy.matchImageSnapshot('Tracker-19-events');

        cy.log('custom session test success')
      });
    });

    // this session is long gone
    // it('Checking Replayer at breakpoints, user events and console', () => {
    //   cy.intercept('**/api/account').as('getAccount')
    //   cy.intercept('**/mobs/7585361734083637/dom.mobs?*').as('getFirstMob')
    //   cy.intercept('**/mobs/7585361734083637/dom.mobe?*').as('getSecondMob')
    //   cy.log('testing premade session')
    //
    //   cy.visit('http://0.0.0.0:3333', {
    //     onBeforeLoad: function (window) {
    //       window.localStorage.setItem('notesFeatureViewed', 'true');
    //     }
    //   })
    //   cy.get('[data-test-id=login]').type(Cypress.env('account').replaceAll('"', ''));
    //   cy.get('[data-test-id=password]').type(Cypress.env('password').replaceAll('"', ''));
    //   cy.get('[data-test-id=log-button]').click();
    //   cy.wait('@getAccount')
    //   cy.wait(SECOND * 2)
    //   cy.visit('3/session/7585361734083637?jumpto=7500&freeze=true')
    //   cy.wait('@getFirstMob')
    //   cy.wait('@getSecondMob')
    //   cy.wait(SECOND * 2)
    //
    //   cy.window().then(win => {
    //     const jumpMethod = win.playerJump ? win.playerJump : win.playerJumpToTime
    //     jumpMethod(SECOND * 7.5)
    //   })
    //   cy.wait(SECOND * 4)
    //   cy.matchImageSnapshot('1st-breakpoint');
    //
    //   cy.window().then(win => {
    //     const jumpMethod = win.playerJump ? win.playerJump : win.playerJumpToTime
    //     jumpMethod(SECOND * 21)
    //   })
    //   cy.wait(SECOND * 4)
    //   cy.matchImageSnapshot('2nd-breakpoint');
    //
    //   cy.get('[data-openreplay-label="User Steps"]').click()
    //   cy.wait(SECOND * 0.5)
    //   cy.matchImageSnapshot('User-Events');
    //
    //   cy.get('#control-button-network > .controlButton-module__label--YznMl').click()
    //   cy.wait(SECOND * 0.5)
    //   cy.matchImageSnapshot('Network-Events');
    // })
  }
);
