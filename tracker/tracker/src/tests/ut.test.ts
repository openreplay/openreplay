import { describe, test, expect, beforeEach, jest } from '@jest/globals'
import UserTestManager from '../main/modules/userTesting/index'
import mockApp from '../main/app/index'

jest.mock('../main/app/index')
jest.mock('../main/modules/userTesting/recorder.js')
jest.mock('../main/modules/userTesting/styles.js')
jest.mock('../main/modules/userTesting/dnd.js')

// @ts-ignore
global.fetch = jest.fn().mockResolvedValue({
  status: 200,
  // @ts-ignore
  json: jest.fn().mockResolvedValue(true),
})

describe('UserTestManager', () => {
  let userTestManager: UserTestManager
  let mockAppInstance
  beforeEach(() => {
    document.body.innerHTML = ''
    mockAppInstance = {
      localStorage: { getItem: () => null, setItem: () => null, removeItem: () => null },
      timestamp: () => 0,
      options: {
        ingestPoint: 'https://localhost:3000/i',
      },
      getSessionID: () => 1111,
    }
    userTestManager = new UserTestManager(mockAppInstance as unknown as mockApp, 'testkey')
  })

  test('should create a greeting', () => {
    userTestManager.createGreeting('Hello', true, true)
    expect(document.body.innerHTML).toContain('Hello')
    expect(document.body.innerHTML).toContain(
      `Welcome, you're here to help us improve, not to be judged.`,
    )
  })

  test('should show a widget with descriptions and tasks', () => {
    userTestManager.createGreeting('Hello', true, true)
    userTestManager.showWidget('Desc1', [
      { task_id: 1, allow_typing: false, title: 'Task1', description: 'Task1 Description' },
    ])
    expect(document.body.innerHTML).toContain('Desc1')
  })

  test('should create a title section', () => {
    const titleSection = userTestManager.createTitleSection()
    expect(titleSection).toBeDefined()
  })

  test('should create a description section', () => {
    const descriptionSection = userTestManager.createDescriptionSection('Desc1')
    expect(descriptionSection).toBeDefined()
    expect(descriptionSection.innerHTML).toContain('Desc1')
  })

  test('should create tasks section', () => {
    jest.useFakeTimers()
    const tasksSection = userTestManager.createTasksSection([
      { title: 'Task1', description: 'Desc1', task_id: 1, allow_typing: false },
    ])
    jest.runAllTimers()
    expect(tasksSection).toBeDefined()
    expect(tasksSection.innerHTML).toContain('Task1')
    expect(tasksSection.innerHTML).toContain('Desc1')
  })

  test('should show end section', () => {
    userTestManager.createGreeting('Hello', true, true)
    userTestManager.showEndSection()
    expect(document.body.innerHTML).toContain('Thank you!')
  })
})
