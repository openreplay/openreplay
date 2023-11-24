import App from '../../app/index.js'
import * as styles from './styles.js'
import Recorder, { Quality } from './recorder.js'
import attachDND from './dnd.js'

function createElement(
  tag: string,
  className: string,
  styles: any,
  textContent?: string,
  id?: string,
) {
  const element = document.createElement(tag)
  element.className = className
  Object.assign(element.style, styles)
  if (textContent) {
    element.textContent = textContent
  }
  if (id) {
    element.id = id
  }
  return element
}

interface Test {
  title: string
  description: string
  startingPath: string
  status: string
  reqMic: boolean
  reqCamera: boolean
  guidelines: string
  conclusion: string
  tasks: {
    task_id: number
    title: string
    description: string
    allow_typing: boolean
  }[]
}

export default class UserTestManager {
  private readonly userRecorder: Recorder
  private readonly bg = createElement('div', 'bg', styles.bgStyle, undefined, '__or_ut_bg')
  private readonly container = createElement(
    'div',
    'container',
    styles.containerStyle,
    undefined,
    '__or_ut_ct',
  )
  private widgetGuidelinesVisible = true
  private widgetTasksVisible = false
  private widgetVisible = true
  private descriptionSection: HTMLElement | null = null
  private taskSection: HTMLElement | null = null
  private endSection: HTMLElement | null = null
  private stopButton: HTMLElement | null = null
  private test: Test | null = null
  private testId: number | null = null
  private token: string | null = null
  private readonly durations = {
    testStart: 0,
    tasks: [] as unknown as { taskId: number; started: number }[],
  }

  constructor(private readonly app: App) {
    this.userRecorder = new Recorder(app)
  }

  signalTask = (taskId: number, status: 'begin' | 'done' | 'skip', answer = '') => {
    if (!taskId) return console.error('OR: no task id')
    const taskStart = this.durations.tasks.find((t) => t.taskId === taskId)
    const timestamp = this.app.timestamp()
    const duration = taskStart ? timestamp - taskStart.started : 0
    const ingest = this.app.options.ingestPoint
    return fetch(`${ingest}/v1/web/uxt/signals/task`, {
      method: 'POST',
      headers: {
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify({
        testId: this.testId,
        taskId,
        status,
        duration,
        timestamp,
        answer,
      }),
    })
  }

  signalTest = (status: 'begin' | 'done' | 'skip') => {
    const ingest = this.app.options.ingestPoint
    const timestamp = this.app.timestamp()
    const duration = timestamp - this.durations.testStart

    return fetch(`${ingest}/v1/web/uxt/signals/test`, {
      method: 'POST',
      headers: {
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify({
        testId: this.testId,
        status,
        duration,
        timestamp,
      }),
    })
  }

  getTest = (id: number, token: string) => {
    this.testId = id
    this.token = token
    const ingest = this.app.options.ingestPoint
    fetch(`${ingest}/v1/web/uxt/test/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then(({ test }: { test: Test }) => {
        this.test = test
        this.createGreeting(test.title, test.reqMic, test.reqCamera)
      })
      .catch((err) => {
        console.log('OR: Error fetching test', err)
      })
  }

  hideTaskSection = () => false
  showTaskSection = () => true
  collapseWidget = () => false

  createGreeting(title: string, micRequired: boolean, cameraRequired: boolean) {
    const titleElement = createElement('div', 'title', styles.titleStyle, title)
    const descriptionElement = createElement(
      'div',
      'description',
      styles.descriptionStyle,
      'Welcome, this session will be recorded. You have complete control, and can stop the session at any time.',
    )
    const noticeElement = createElement(
      'div',
      'notice',
      styles.noticeStyle,
      `Please note that your ${micRequired ? 'audio,' : ''} ${cameraRequired ? 'video,' : ''} ${
        micRequired || cameraRequired ? 'and' : ''
      } screen will be recorded for research purposes during this test.`,
    )
    const buttonElement = createElement(
      'div',
      'button',
      styles.buttonStyle,
      'Read guidelines to begin',
    )

    buttonElement.onclick = () => {
      this.container.innerHTML = ''
      void this.userRecorder.startRecording(30, Quality.Standard)
      this.durations.testStart = this.app.timestamp()
      void this.signalTest('begin')
      this.showWidget(this.test?.description || '', this.test?.tasks || [])
      this.container.removeChild(buttonElement)
      this.container.removeChild(noticeElement)
      this.container.removeChild(descriptionElement)
      this.container.removeChild(titleElement)
    }

    this.container.append(titleElement, descriptionElement, noticeElement, buttonElement)
    this.bg.appendChild(this.container)
    document.body.appendChild(this.bg)
  }

  showWidget(
    description: string,
    tasks: {
      title: string
      description: string
      task_id: number
    }[],
  ) {
    this.container.innerHTML = ''
    Object.assign(this.bg.style, {
      position: 'fixed',
      zIndex: 99999999999999,
      right: '8px',
      left: 'unset',
      width: 'fit-content',
      top: '8px',
      height: 'fit-content',
      background: 'unset',
      display: 'unset',
      alignItems: 'unset',
      justifyContent: 'unset',
    })
    // Create title section
    const titleSection = this.createTitleSection()
    Object.assign(this.container.style, styles.containerWidgetStyle)
    const descriptionSection = this.createDescriptionSection(description)
    const tasksSection = this.createTasksSection(tasks)
    const stopButton = createElement('div', 'stop_bn_or', styles.stopWidgetStyle, 'Abort Session')

    this.container.append(titleSection, descriptionSection, tasksSection, stopButton)
    this.taskSection = tasksSection
    this.descriptionSection = descriptionSection
    this.stopButton = stopButton
    stopButton.onclick = () => {
      this.userRecorder.discard()
      void this.signalTest('skip')
      document.body.removeChild(this.bg)
    }
    this.hideTaskSection()
  }

  createTitleSection() {
    const title = createElement('div', 'title', styles.titleWidgetStyle)
    const leftIcon = createElement('div', 'left_icon', {}, '(icn)')
    const titleText = createElement('div', 'title_text', {}, this.test?.title)
    const rightIcon = createElement(
      'div',
      'right_icon',
      { marginLeft: 'auto', cursor: 'pointer' },
      '(icn)',
    )

    title.append(leftIcon, titleText, rightIcon)

    const toggleWidget = (isVisible: boolean) => {
      this.widgetVisible = isVisible
      Object.assign(
        this.container.style,
        this.widgetVisible
          ? styles.containerWidgetStyle
          : { border: 'none', background: 'none', padding: 0 },
      )
      if (this.taskSection) {
        Object.assign(
          this.taskSection.style,
          this.widgetVisible ? styles.descriptionWidgetStyle : { display: 'none' },
        )
      }
      if (this.descriptionSection) {
        Object.assign(
          this.descriptionSection.style,
          this.widgetVisible ? styles.descriptionWidgetStyle : { display: 'none' },
        )
      }
      if (this.endSection) {
        Object.assign(
          this.endSection.style,
          this.widgetVisible ? styles.descriptionWidgetStyle : { display: 'none' },
        )
      }
      if (this.stopButton) {
        Object.assign(
          this.stopButton.style,
          this.widgetVisible ? styles.stopWidgetStyle : { display: 'none' },
        )
      }
      return isVisible
    }

    rightIcon.onclick = () => toggleWidget(!this.widgetVisible)
    attachDND(this.bg, leftIcon)

    this.collapseWidget = () => toggleWidget(false)
    return title
  }

  createDescriptionSection(description: string) {
    const section = createElement('div', 'description_section_or', styles.descriptionWidgetStyle)
    const titleContainer = createElement('div', 'description_s_title_or', styles.sectionTitleStyle)
    const title = createElement('div', 'title', {}, 'Introduction & Guidelines')
    const icon = createElement('div', 'icon', styles.symbolIcon, '-')
    const content = createElement('div', 'content', styles.contentStyle)
    const ul = document.createElement('ul')
    ul.innerHTML = description
    const button = createElement('div', 'button_begin_or', styles.buttonWidgetStyle, 'Begin Test')

    titleContainer.append(title, icon)
    content.append(ul, button)
    section.append(titleContainer, content)

    const toggleDescriptionVisibility = () => {
      this.widgetGuidelinesVisible = !this.widgetGuidelinesVisible
      icon.textContent = this.widgetGuidelinesVisible ? '-' : '+'
      Object.assign(
        content.style,
        this.widgetGuidelinesVisible ? styles.contentStyle : { display: 'none' },
      )
    }

    titleContainer.onclick = toggleDescriptionVisibility
    button.onclick = () => {
      toggleDescriptionVisibility()
      if (this.test) {
        if (
          this.durations.tasks.findIndex(
            (t) => this.test && t.taskId === this.test.tasks[0].task_id,
          ) === -1
        ) {
          this.durations.tasks.push({
            taskId: this.test.tasks[0].task_id,
            started: this.app.timestamp(),
          })
        }
        void this.signalTask(this.test.tasks[0].task_id, 'begin')
      }
      this.showTaskSection()
    }

    return section
  }

  createTasksSection(
    tasks: {
      title: string
      description: string
      task_id: number
    }[],
  ) {
    let currentTaskIndex = 0
    const section = createElement('div', 'task_section_or', styles.descriptionWidgetStyle)
    const titleContainer = createElement('div', 'description_t_title_or', styles.sectionTitleStyle)
    const title = createElement('div', 'title', {}, 'Tasks')
    const icon = createElement('div', 'icon', styles.symbolIcon, '-')
    const content = createElement('div', 'content', styles.contentStyle)
    const pagination = createElement('div', 'pagination', styles.paginationStyle)
    const leftArrow = createElement('span', 'leftArrow', {}, '<')
    const rightArrow = createElement('span', 'rightArrow', {}, '>')
    const taskCard = createElement('div', 'taskCard', styles.taskDescriptionCard)
    const taskText = createElement('div', 'taskText', styles.taskTextStyle)
    const taskDescription = createElement('div', 'taskDescription', styles.taskDescriptionStyle)
    const taskButtons = createElement('div', 'taskButtons', styles.taskButtonsRow)
    const closePanelButton = createElement(
      'div',
      'closePanelButton',
      styles.taskButtonStyle,
      'Collapse panel',
    )
    const nextButton = createElement(
      'div',
      'nextButton',
      styles.taskButtonBorderedStyle,
      'Done, next',
    )

    titleContainer.append(title, icon)
    taskCard.append(taskText, taskDescription)
    taskButtons.append(closePanelButton, nextButton)
    content.append(pagination, taskCard, taskButtons)
    section.append(titleContainer, content)

    const updateTaskContent = () => {
      const task = tasks[currentTaskIndex]
      taskText.textContent = task.title
      taskDescription.textContent = task.description
    }

    pagination.appendChild(leftArrow)
    tasks.forEach((_, index) => {
      const pageNumber = createElement('span', `or_task_${index}`, {}, (index + 1).toString())
      pageNumber.id = `or_task_${index}`
      pagination.append(pageNumber)
    })
    pagination.appendChild(rightArrow)

    const toggleTasksVisibility = () => {
      this.widgetTasksVisible = !this.widgetTasksVisible
      icon.textContent = this.widgetTasksVisible ? '-' : '+'
      Object.assign(
        content.style,
        this.widgetTasksVisible ? styles.contentStyle : { display: 'none' },
      )
    }
    this.hideTaskSection = () => {
      icon.textContent = '+'
      Object.assign(content.style, {
        display: 'none',
      })
      this.widgetTasksVisible = false
      return false
    }
    this.showTaskSection = () => {
      icon.textContent = '-'
      Object.assign(content.style, styles.contentStyle)
      this.widgetTasksVisible = true
      return true
    }

    titleContainer.onclick = toggleTasksVisibility
    closePanelButton.onclick = this.collapseWidget

    nextButton.onclick = () => {
      void this.signalTask(tasks[currentTaskIndex].task_id, 'done')
      if (currentTaskIndex < tasks.length - 1) {
        currentTaskIndex++
        updateTaskContent()
        if (
          this.durations.tasks.findIndex((t) => t.taskId === tasks[currentTaskIndex].task_id) === -1
        ) {
          this.durations.tasks.push({
            taskId: tasks[currentTaskIndex].task_id,
            started: this.app.timestamp(),
          })
        }
        void this.signalTask(tasks[currentTaskIndex].task_id, 'begin')
        const activeTaskEl = document.getElementById(`or_task_${currentTaskIndex}`)
        if (activeTaskEl) {
          Object.assign(activeTaskEl.style, styles.taskNumberActive)
        }
        for (let i = 0; i < currentTaskIndex; i++) {
          const taskEl = document.getElementById(`or_task_${i}`)
          if (taskEl) {
            Object.assign(taskEl.style, styles.taskNumberDone)
          }
        }
      } else {
        this.showEndSection()
      }
    }

    updateTaskContent()
    setTimeout(() => {
      const firstTaskEl = document.getElementById('or_task_0')
      console.log(firstTaskEl, styles.taskNumberActive)
      if (firstTaskEl) {
        Object.assign(firstTaskEl.style, styles.taskNumberActive)
      }
    }, 1)
    return section
  }

  showEndSection() {
    void this.signalTest('done')
    void this.userRecorder.saveToFile()
    const section = createElement('div', 'end_section_or', styles.endSectionStyle)
    const title = createElement(
      'div',
      'end_title_or',
      {
        fontSize: '1.25rem',
        fontWeight: '500',
      },
      'Thank you! 👍',
    )
    const description = createElement(
      'div',
      'end_description_or',
      {},
      'Thank you for participating in our user test. Your feedback has been captured and will be used to enhance our website. \n' +
        '\n' +
        'We appreciate your time and valuable input.',
    )
    const button = createElement('div', 'end_button_or', styles.buttonWidgetStyle, 'End Session')

    if (this.taskSection) {
      this.container.removeChild(this.taskSection)
    }
    if (this.descriptionSection) {
      this.container.removeChild(this.descriptionSection)
    }
    if (this.stopButton) {
      this.container.removeChild(this.stopButton)
    }

    button.onclick = () => {
      document.body.removeChild(this.bg)
    }
    section.append(title, description, button)
    this.endSection = section
    this.container.append(section)
  }
}
