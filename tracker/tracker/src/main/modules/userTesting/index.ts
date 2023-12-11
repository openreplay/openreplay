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
  public isActive = false
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

  constructor(
    private readonly app: App,
    private readonly storageKey: string,
  ) {
    this.userRecorder = new Recorder(app)
    const sessionId = this.app.getSessionID()
    const savedSessionId = this.app.localStorage.getItem('or_uxt_session_id')
    console.log(sessionId, savedSessionId)
    if (sessionId !== savedSessionId) {
      this.app.localStorage.removeItem(this.storageKey)
      this.app.localStorage.removeItem('or_uxt_session_id')
      this.app.localStorage.removeItem('or_uxt_test_id')
      this.app.localStorage.removeItem('or_uxt_task_index')
      this.app.localStorage.removeItem('or_uxt_test_start')
    }

    const taskIndex = this.app.localStorage.getItem('or_uxt_task_index')
    if (taskIndex) {
      this.currentTaskIndex = parseInt(taskIndex, 10)
      this.durations.testStart = parseInt(
        this.app.localStorage.getItem('or_uxt_test_start') as string,
        10,
      )
    }
  }

  public getTestId() {
    return this.testId
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
    const timestamp = this.app.timestamp()
    if (status === 'begin' && this.testId) {
      const sessionId = this.app.getSessionID()
      this.app.localStorage.setItem('or_uxt_session_id', sessionId as unknown as string)
      this.app.localStorage.setItem(this.storageKey, this.testId.toString())
      this.app.localStorage.setItem('or_uxt_test_start', timestamp.toString())
    } else {
      this.app.localStorage.removeItem(this.storageKey)
      this.app.localStorage.removeItem('or_uxt_task_index')
      this.app.localStorage.removeItem('or_uxt_test_start')
    }
    const ingest = this.app.options.ingestPoint
    const start = this.durations.testStart || timestamp
    const duration = timestamp - start

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

  getTest = (id: number, token: string, inProgress?: boolean) => {
    this.testId = id
    this.token = token
    const ingest = this.app.options.ingestPoint
    return fetch(`${ingest}/v1/web/uxt/test/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then(({ test }: { test: Test }) => {
        this.isActive = true
        this.test = test
        this.createGreeting(test.title, test.reqMic, test.reqCamera)
        if (inProgress) {
          if (test.reqMic || test.reqCamera) {
            void this.userRecorder.startRecording(30, Quality.Standard, test.reqMic, test.reqCamera)
          }
          this.showWidget(test.description, test.tasks, true)
          this.showTaskSection()
        }
      })
      .then(() => id)
      .catch((err) => {
        console.log('OR: Error fetching test', err)
      })
  }

  hideTaskSection = () => false
  showTaskSection = () => true
  collapseWidget = () => false
  removeGreeting = () => false

  createGreeting(title: string, micRequired: boolean, cameraRequired: boolean) {
    const titleElement = createElement('div', 'title', styles.titleStyle, title)
    const descriptionElement = createElement(
      'div',
      'description',
      styles.descriptionStyle,
      `Welcome, you're here to help us improve, not to be judged. Your insights matter!\n
📹 We're recording this browser tab to learn from your experience.
🎤 Please enable mic and camera if asked, to give us a complete picture.`,
    )
    const buttonElement = createElement(
      'div',
      'button',
      styles.buttonStyle,
      'Read guidelines to begin',
    )

    this.removeGreeting = () => {
      // this.container.innerHTML = ''
      if (micRequired || cameraRequired) {
        void this.userRecorder.startRecording(30, Quality.Standard, micRequired, cameraRequired)
      }
      this.container.removeChild(buttonElement)
      this.container.removeChild(descriptionElement)
      this.container.removeChild(titleElement)
      return false
    }
    buttonElement.onclick = () => {
      this.removeGreeting()
      this.durations.testStart = this.app.timestamp()
      void this.signalTest('begin')
      Object.assign(this.container.style, styles.containerWidgetStyle)
      this.showWidget(this.test?.guidelines || '', this.test?.tasks || [])
    }

    this.container.append(titleElement, descriptionElement, buttonElement)
    this.bg.appendChild(this.container)
    document.body.appendChild(this.bg)
  }

  showWidget(
    guidelines: string,
    tasks: {
      title: string
      description: string
      task_id: number
      allow_typing: boolean
    }[],
    inProgress?: boolean,
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
    const descriptionSection = this.createDescriptionSection(guidelines)
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
    if (!inProgress) {
      this.hideTaskSection()
    } else {
      this.toggleDescriptionVisibility()
    }
  }

  createTitleSection() {
    const title = createElement('div', 'title', styles.titleWidgetStyle)
    const leftIcon = generateGrid()
    const titleText = createElement(
      'div',
      'title_text',
      {
        maxWidth: '19rem',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        width: '100%',
        fontSize: 16,
        lineHeight: 'auto',
        cursor: 'pointer',
      },
      this.test?.title,
    )
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

    const collapseWidget = () => {
      Object.assign(rightIcon.style, {
        transform: this.widgetVisible ? 'rotate(0deg)' : 'rotate(180deg)',
      })
      toggleWidget(!this.widgetVisible)
    }
    titleText.onclick = collapseWidget
    rightIcon.onclick = collapseWidget
    attachDND(this.bg, leftIcon)

    this.collapseWidget = () => toggleWidget(false)
    return title
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  toggleDescriptionVisibility = () => {}

  createDescriptionSection(guidelines: string) {
    const section = createElement('div', 'description_section_or', styles.descriptionWidgetStyle)
    const titleContainer = createElement('div', 'description_s_title_or', styles.sectionTitleStyle)
    const title = createElement(
      'div',
      'title',
      {
        fontSize: 13,
        fontWeight: 500,
        lineHeight: 'auto',
      },
      'Introduction & Guidelines',
    )
    const icon = createElement('div', 'icon', styles.symbolIcon, '-')
    const content = createElement('div', 'content', styles.contentStyle)
    const descriptionC = createElement('div', 'text_description', {
      maxHeight: '250px',
      overflowY: 'auto',
      whiteSpace: 'pre-wrap',
      fontSize: 13,
      color: '#454545',
      lineHeight: 'auto',
    })
    descriptionC.innerHTML = guidelines
    const button = createElement('div', 'button_begin_or', styles.buttonWidgetStyle, 'Begin Test')

    titleContainer.append(title, icon)
    content.append(descriptionC, button)
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
    this.toggleDescriptionVisibility = () => {
      this.widgetGuidelinesVisible = false
      icon.textContent = this.widgetGuidelinesVisible ? '-' : '+'
      Object.assign(
        content.style,
        this.widgetGuidelinesVisible ? styles.contentStyle : { display: 'none' },
      )
      content.removeChild(button)
    }
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
    Object.assign(this.container.style, styles.containerWidgetStyle)
    const section = createElement('div', 'task_section_or', styles.descriptionWidgetStyle)
    const titleContainer = createElement('div', 'description_t_title_or', styles.sectionTitleStyle)
    const title = createElement(
      'div',
      'title',
      {
        fontSize: '14px',
        fontWeight: '500',
        lineHeight: 'auto',
      },
      'Tasks',
    )
    const icon = createElement('div', 'icon', styles.symbolIcon, '-')
    const content = createElement('div', 'content', styles.contentStyle)
    const pagination = createElement('div', 'pagination', styles.paginationStyle)
    // const leftArrow = createElement('span', 'leftArrow', {}, '<')
    // const rightArrow = createElement('span', 'rightArrow', {}, '>')
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
      'Collapse Panel',
    )
    const nextButton = createElement(
      'div',
      'nextButton',
      styles.taskButtonBorderedStyle,
      'Done, Next',
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

    // pagination.appendChild(leftArrow)
    tasks.forEach((_, index) => {
      const pageNumber = createElement(
        'span',
        `or_task_${index}`,
        {
          outline: '1px solid #efefef',
          fontSize: '13px',
          height: '24px',
          width: '24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '6.25em',
        },
        (index + 1).toString(),
      )
      pageNumber.id = `or_task_${index}`
      pagination.append(pageNumber)
    })
    // pagination.appendChild(rightArrow)

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

    const highlightActive = () => {
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
        highlightActive()
      } else {
        this.showEndSection()
      }
      this.app.localStorage.setItem('or_uxt_task_index', this.currentTaskIndex.toString())
    }

    setTimeout(() => {
      const firstTaskEl = document.getElementById('or_task_0')
      if (firstTaskEl) {
        Object.assign(firstTaskEl.style, styles.taskNumberActive)
      }
      updateTaskContent()
      highlightActive()
    }, 1)
    return section
  }

  showEndSection() {
    let isLoading = true
    void this.signalTest('done')
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
      this.test?.conclusion ??
        'Thank you for participating in our usability test. Your feedback has been captured and will be used to enhance our website. \n' +
          '\n' +
          'We appreciate your time and valuable input.',
    )
    const button = createElement(
      'div',
      'end_button_or',
      styles.buttonWidgetStyle,
      'Submitting Feedback',
    )
    const spinner = createSpinner()
    button.appendChild(spinner)

    if (this.test?.reqMic || this.test?.reqCamera) {
      void this.userRecorder
        .sendToAPI()
        .then(() => {
          button.removeChild(spinner)
          button.textContent = 'End Session'
          isLoading = false
        })
        .catch((err) => {
          console.error(err)
          button.removeChild(spinner)
          button.textContent = 'End Session'
          isLoading = false
        })
    } else {
      button.removeChild(spinner)
      button.textContent = 'End Session'
      isLoading = false
    }

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
      if (isLoading) return
      window.close()
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

const spinnerStyles = {
  border: '4px solid rgba(255, 255, 255, 0.4)',
  width: '16px',
  height: '16px',
  borderRadius: '50%',
  borderLeftColor: '#fff',
  animation: 'spin 0.5s linear infinite',
}

function addKeyframes() {
  const styleSheet = document.createElement('style')
  styleSheet.type = 'text/css'
  styleSheet.innerText = `@keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }`
  document.head.appendChild(styleSheet)
}

function createSpinner() {
  addKeyframes()
  const spinner = document.createElement('div')
  spinner.classList.add('spinner')

  Object.assign(spinner.style, spinnerStyles)

  return spinner
}
