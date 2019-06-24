/* globals describe test expect */

const { JSDOM } = require('jsdom')
const nunjucks = require('jstransformer')(require('jstransformer-nunjucks'))

const filters = require('../../lib/filters')
const globals = require('../../lib/globals')
const pathFromRoot = require('../../util/pathFromRoot')
const templatePaths = [
  ...require('../../lib/templatePaths'),
  pathFromRoot('application', '__tests__', 'fixtures')
]

const options = {
  path: templatePaths,
  trimBlocks: true,
  lstripBlocks: true,
  filters,
  globals
}

const throwIfUsedWithNotOrRefactoredToArrowFunction = (context) => {
  if (context.isNot !== false) {
    throw new Error('This matcher doesn\'t yet support `.not`.')
  }
}

expect.extend({
  toHaveAttributes: function (domElement, expectedAttributes) {
    throwIfUsedWithNotOrRefactoredToArrowFunction(this)

    const hasAttributes = Object.keys(expectedAttributes)
      .map(key => domElement.getAttribute(key) !== expectedAttributes[key] && `${key} did not match, expected [${key}] to match [${expectedAttributes[key]}] but received [${domElement.getAttribute(key)}]`)
      .filter(value => value !== false)

    return {
      pass: hasAttributes.length === 0,
      message: () => hasAttributes.join('\n') || 'blah'
    }
  }
})

const templateFactory = (parameters) =>
  `{%- from "_example.njk"  import example with context-%}
  {{ example(${JSON.stringify(parameters)})
  }}`.toString()

const documentFactory = function (parameters, options) {
  const document = new JSDOM('<!DOCTYPE html><html><head></head><body><div id="exampleContainer"></div></body></html>',
    { contentType: 'text/html' }
  ).window.document

  const exampleContainer = document.getElementById('exampleContainer')
  const templateString = templateFactory(parameters)
  exampleContainer.innerHTML = nunjucks.render(templateString, options).body
  return document
}

describe('Single page example macro english', () => {
  const parameters = { item: 'new-tab-link', example: 'default' }
  const document = documentFactory(parameters, options)

  const exampleSrc = '/design-library/new-tab-link/default/'

  const htmlPanelID = 'example-default-html'
  const nunjucksPanelID = 'example-default-nunjucks'

  const exampleFrame = document.querySelector('#example-default iframe')
  const exampleLink = document.querySelector('.app-example__link a')

  test('should render an iFrame for the example with the correct attribute values', () => {
    expect(exampleFrame).not.toBeNull()
    expect(exampleFrame.tagName.toLowerCase()).toBe('iframe')
    expect(exampleFrame.src).toMatch(exampleSrc)
  })

  test('should have a link to open the example html in a new window or tab', () => {
    expect(exampleLink).not.toBeNull()
    expect(exampleLink.href).toBe(exampleSrc)
    expect(exampleLink.target).toBe('_blank')
  })

  test('Should not have a language toggle for English only examples', () => {
    const languageToggleLink = document.querySelector('a.language-toggle')
    expect(languageToggleLink).toBeNull()
  })

  test('Should have a language toggle for dual language examples', () => {
    const welshParameters = { ...parameters, welsh: 'welsh' }
    const welshDocument = documentFactory(welshParameters, options)
    const languageToggleLink = welshDocument.querySelector('a[href="/design-library/new-tab-link/welsh/"]')
    expect(languageToggleLink).not.toBeNull()
  })

  test('should have a button to show HTML code examples', () => {
    const tabLink = document.querySelector(`ul.app-tabs li.js-tabs__item a[href="#${htmlPanelID}"]`)
    const tabContentContainer = document.getElementById(htmlPanelID)
    expect(tabContentContainer).not.toBeNull()
    expect(tabLink).not.toBeNull()
    expect(tabLink.text).toBe('HTML')
    expect(tabLink).toHaveAttributes({
      'aria-controls': htmlPanelID,
      role: 'tab'
    })
  })

  test('should have a button to show Nunjucks code examples', () => {
    const tabLink = document.querySelector(`ul.app-tabs li.js-tabs__item a[href="#${nunjucksPanelID}"]`)
    const tabContentContainer = document.getElementById(nunjucksPanelID)
    expect(tabContentContainer).not.toBeNull()
    expect(tabLink).not.toBeNull()
    expect(tabLink.text).toBe('Nunjucks')
    expect(tabLink).toHaveAttributes({
      'aria-controls': nunjucksPanelID,
      role: 'tab'
    })
  })

  test('Should include the escaped HTML markup from the examples', () => {
    const exampleHTMLCode = document.querySelector(`#${htmlPanelID} pre code`)
    expect(exampleHTMLCode).toMatchSnapshot()
  })
})
