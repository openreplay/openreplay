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
    tasks: [] as unknown as {
      taskId: number
      started: number
    }[],
  }

  constructor(private readonly app: App) {
    this.userRecorder = new Recorder(app)
    const taskIndex = this.app.sessionStorage.getItem('or_uxt_task_index')
    if (taskIndex) {
      this.currentTaskIndex = parseInt(taskIndex, 10)
    }
  }

  signalTask = (taskId: number, status: 'begin' | 'done' | 'skipped', answer?: string) => {
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

  signalTest = (status: 'begin' | 'done' | 'skipped') => {
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
      allow_typing: boolean
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
      void this.signalTest('skipped')
      document.body.removeChild(this.bg)
    }
    this.hideTaskSection()
  }

  createTitleSection() {
    const title = createElement('div', 'title', styles.titleWidgetStyle)
    const leftIcon = generateGrid()
    const titleText = createElement('div', 'title_text', {}, this.test?.title)
    const rightIcon = generateChevron()

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

    rightIcon.onclick = () => {
      Object.assign(rightIcon.style, {
        transform: this.widgetVisible ? 'rotate(0deg)' : 'rotate(180deg)',
      })
      toggleWidget(!this.widgetVisible)
    }
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
      content.removeChild(button)
    }

    return section
  }

  currentTaskIndex = 0

  createTasksSection(
    tasks: {
      title: string
      description: string
      task_id: number
      allow_typing: boolean
    }[],
  ) {
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
    const inputTitle = createElement('div', 'taskText', styles.taskTextStyle)
    inputTitle.textContent = 'Your answer'
    const inputArea = createElement('textarea', 'taskDescription', {
      resize: 'vertical',
    }) as HTMLTextAreaElement
    const inputContainer = createElement('div', 'inputArea', styles.taskDescriptionCard)
    inputContainer.append(inputTitle, inputArea)
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
    content.append(pagination, taskCard, inputContainer, taskButtons)
    section.append(titleContainer, content)

    const updateTaskContent = () => {
      const task = tasks[this.currentTaskIndex]
      taskText.textContent = task.title
      taskDescription.textContent = task.description
      if (task.allow_typing) {
        inputContainer.style.display = 'flex'
      } else {
        inputContainer.style.display = 'none'
      }
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
      const textAnswer = tasks[this.currentTaskIndex].allow_typing ? inputArea.value : undefined
      inputArea.value = ''
      void this.signalTask(tasks[this.currentTaskIndex].task_id, 'done', textAnswer)
      if (this.currentTaskIndex < tasks.length - 1) {
        this.currentTaskIndex++
        updateTaskContent()
        if (
          this.durations.tasks.findIndex(
            (t) => t.taskId === tasks[this.currentTaskIndex].task_id,
          ) === -1
        ) {
          this.durations.tasks.push({
            taskId: tasks[this.currentTaskIndex].task_id,
            started: this.app.timestamp(),
          })
        }
        void this.signalTask(tasks[this.currentTaskIndex].task_id, 'begin')
        const activeTaskEl = document.getElementById(`or_task_${this.currentTaskIndex}`)
        if (activeTaskEl) {
          Object.assign(activeTaskEl.style, styles.taskNumberActive)
        }
        for (let i = 0; i < this.currentTaskIndex; i++) {
          const taskEl = document.getElementById(`or_task_${i}`)
          if (taskEl) {
            Object.assign(taskEl.style, styles.taskNumberDone)
          }
        }
      } else {
        this.showEndSection()
      }
      this.app.sessionStorage.setItem('or_uxt_task_index', this.currentTaskIndex.toString())
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

function generateGrid() {
  const grid = document.createElement('div')
  grid.className = 'grid'
  for (let i = 0; i < 16; i++) {
    const cell = document.createElement('div')
    Object.assign(cell.style, {
      width: '2px',
      height: '2px',
      borderRadius: '10px',
      background: 'white',
    })
    cell.className = 'cell'
    grid.appendChild(cell)
  }
  Object.assign(grid.style, {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gridTemplateRows: 'repeat(4, 1fr)',
    gap: '2px',
    cursor: 'grab',
  })
  return grid
}

function generateChevron() {
  const triangle = document.createElement('div')
  Object.assign(triangle.style, {
    width: '0',
    height: '0',
    borderLeft: '7px solid transparent',
    borderRight: '7px solid transparent',
    borderBottom: '7px solid white',
  })
  const container = document.createElement('div')
  container.appendChild(triangle)
  Object.assign(container.style, {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '16px',
    height: '16px',
    cursor: 'pointer',
    marginLeft: 'auto',
    transform: 'rotate(180deg)',
  })
  return container
}
