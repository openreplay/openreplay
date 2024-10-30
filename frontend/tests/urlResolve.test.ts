import { test, describe, expect } from "@jest/globals";
import { resolveCSS } from '../app/player/web/messages/rewriter/urlResolve';

const strings = [
  `@import "custom.css";`,
  `@import url("chrome://communicator/skin/");`,
  `@import '../app/custom.css';`,
  `@import "styles/common.css";`,
  `@import "/css/commonheader.css";`,
  `@import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;500;700;900&display=swap');`,
  `@import '../css/onboardcustom.css';
@import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;500;700;900&display=swap');
#login-required {
  color: #fff;
}`,
  `@import url("style.css") screen and (max-width: 600px);`
];
const testStrings = [
`@import url("https://example.com/custom.css");`,
`@import url("chrome://communicator/skin/");`,
`@import url('https://example.com/app/custom.css');`,
`@import url("https://example.com/styles/common.css");`,
`@import url("https://example.com/css/commonheader.css");`,
`@import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;500;700;900&display=swap');`,
`@import url('https://example.com/css/onboardcustom.css');
@import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;500;700;900&display=swap');
#login-required {
  color: #fff;
};`,
`@import url("https://example.com/style.css") screen and (max-width: 600px);`
]
describe('resolveCSS', () => {
  test('should rewrite the CSS with the correct URLs', () => {
    strings.forEach((string, i) => {
      expect(resolveCSS('https://example.com', string)).toBe(testStrings[i]);
  })
  })
})