class UserTestManager {
  private readonly bg = document.createElement('div')
  private readonly container = document.createElement('div')
  private widgetGuidelinesVisible = true
  private widgetTasksVisible = false

  createGreeting(title: string, micRequired: boolean, cameraRequired: boolean) {
    // Create background
    this.bg.className = 'bg_or'
    Object.assign(this.bg.style, bgStyle)

    // Create container
    this.container.className = 'container_or'
    Object.assign(this.container.style, containerStyle)

    // Create title
    const titleElement = document.createElement('div')
    titleElement.className = 'title_or'
    titleElement.textContent = title
    Object.assign(titleElement.style, titleStyle)

    // Create description
    const descriptionElement = document.createElement('div')
    descriptionElement.className = 'description_or'
    descriptionElement.textContent =
      'Welcome, this session will be recorded. You have complete control, and can stop the session at any time.'
    Object.assign(descriptionElement.style, descriptionStyle)

    // Create notice
    const noticeElement = document.createElement('div')
    noticeElement.className = 'notice_or'
    noticeElement.textContent =
      'Please note that your audio, video, and screen will be recorded for research purposes during this test.'
    Object.assign(noticeElement.style, noticeStyle)

    // Create button
    const buttonElement = document.createElement('div')
    buttonElement.className = 'button_or'
    buttonElement.textContent = 'Read guidelines to begin'
    buttonElement.onclick = () => {
      this.container.innerHTML = ''
      this.showWidget(
        [
          'Please be honest and open with your feedback. We want to hear your thoughts, both positive and negative, about your experience using Product Name.',
          'Feel free to think out loud during the test. Sharing your thought process as you complete tasks will help us understand your perspective better.',
        ],
        [
          {
            title: 'Task 1',
            description: 'This is a test description here',
          },
          {
            title: 'Task 2',
            description:
              'This is a test description here there and not only there, more stuff to come',
          },
        ],
      )
    }
    Object.assign(buttonElement.style, buttonStyle)

    // Append elements to container
    this.container.appendChild(titleElement)
    this.container.appendChild(descriptionElement)
    this.container.appendChild(noticeElement)
    this.container.appendChild(buttonElement)

    // Append container to background
    this.bg.appendChild(this.container)

    // Append background to body
    document.body.appendChild(this.bg)
  }

  showWidget(
    description: string[],
    tasks: {
      title: string
      description: string
    }[],
  ) {
    this.container.innerHTML = ''
    Object.assign(this.bg.style, {
      position: 'absolute',
      left: '530px',
      top: '8px',
      width: 'unset',
      height: 'unset',
      background: 'unset',
      display: 'unset',
      alignItems: 'unset',
      justifyContent: 'unset',
    })
    // Create title section
    const titleSection = this.createTitleSection()
    this.container.appendChild(titleSection)
    Object.assign(this.container.style, containerWidgetStyle)

    // Create description section
    const descriptionSection = this.createDescriptionSection(description)
    this.container.appendChild(descriptionSection)

    // Create tasks section
    const tasksSection = this.createTasksSection(tasks)
    this.hideTaskSection()
    this.container.appendChild(tasksSection)

    // Create stop button
    const stopButton = document.createElement('div')
    stopButton.className = 'stop'
    stopButton.textContent = 'Abort Session'
    Object.assign(stopButton.style, stopWidgetStyle)
    this.container.appendChild(stopButton)
  }

  createTitleSection() {
    const title = document.createElement('div')
    title.className = 'title'
    Object.assign(title.style, titleWidgetStyle)

    const leftIcon = document.createElement('div')
    leftIcon.textContent = '(icn)'
    const titleText = document.createElement('div')
    titleText.textContent = 'Test name goes here'
    const rightIcon = document.createElement('div')
    rightIcon.textContent = '(icn)'
    rightIcon.style.marginLeft = 'auto'

    title.appendChild(leftIcon)
    title.appendChild(titleText)
    title.appendChild(rightIcon)

    return title
  }

  createDescriptionSection(description: string[]) {
    const section = document.createElement('div')
    section.className = 'description_or'
    Object.assign(section.style, descriptionWidgetStyle)

    const titleContainer = document.createElement('div')
    const title = document.createElement('div')
    const icon = document.createElement('div')

    titleContainer.className = 'descrtitle_or'
    title.textContent = 'Introduction & Guidelines'
    icon.textContent = '(icn)'

    titleContainer.appendChild(title)
    titleContainer.appendChild(icon)
    Object.assign(titleContainer.style, descrtitleStyle)

    const content = document.createElement('div')
    Object.assign(content.style, contentStyle)

    const ul = document.createElement('ul')
    ul.innerHTML = description.map((item) => `<li>${item}</li>`).join('')
    content.appendChild(ul)

    const button = document.createElement('div')
    button.className = 'button_or'
    button.textContent = 'Begin Test'
    Object.assign(button.style, buttonWidgetStyle)
    content.appendChild(button)

    section.appendChild(titleContainer)
    section.appendChild(content)

    const hideDescription = () => {
      Object.assign(content.style, {
        display: 'none',
      })
      this.widgetGuidelinesVisible = false
    }
    const showDescription = () => {
      Object.assign(content.style, contentStyle)
      this.widgetGuidelinesVisible = true
    }

    titleContainer.onclick = () => {
      if (this.widgetGuidelinesVisible) {
        hideDescription()
      } else {
        showDescription()
      }
    }
    button.onclick = () => {
      hideDescription()
      this.showTaskSection()
    }
    return section
  }

  createTasksSection(
    tasks: {
      title: string
      description: string
    }[],
  ) {
    let currentTaskIndex = 0
    const section = document.createElement('div')
    section.className = 'description_or'
    Object.assign(section.style, descriptionWidgetStyle)

    const titleContainer = document.createElement('div')
    const title = document.createElement('div')
    const icon = document.createElement('div')

    titleContainer.className = 'descrtitle_or'
    title.textContent = 'Tasks'
    icon.textContent = '(icn)'
    titleContainer.appendChild(title)
    titleContainer.appendChild(icon)
    Object.assign(titleContainer.style, descrtitleStyle)

    const content = document.createElement('div')
    Object.assign(content.style, contentStyle)

    const updateTaskContent = () => {
      const task = tasks[currentTaskIndex]
      taskText.textContent = task.title
      taskDescription.textContent = task.description
    }

    // Pagination
    const pagination = document.createElement('div')
    Object.assign(pagination.style, paginationStyle)

    const leftArrow = document.createElement('span')
    leftArrow.textContent = '<'
    const rightArrow = document.createElement('span')
    rightArrow.textContent = '>'

    pagination.appendChild(leftArrow)

    tasks.forEach((_, index) => {
      const pageNumber = document.createElement('span')
      pageNumber.id = `or_task_${index}`
      pageNumber.textContent = (index + 1).toString()
      pagination.appendChild(pageNumber)
    })

    pagination.appendChild(rightArrow)

    // Task content
    const taskText = document.createElement('div')
    Object.assign(taskText.style, taskTextStyle)

    const taskDescription = document.createElement('div')
    Object.assign(taskDescription.style, taskDescriptionStyle)

    // Task buttons
    const taskButtons = document.createElement('div')
    const closePanelButton = document.createElement('button')
    closePanelButton.textContent = 'Collapse panel'
    Object.assign(closePanelButton.style, taskButtonStyle)

    const nextButton = document.createElement('button')
    nextButton.textContent = 'Done, next'
    nextButton.onclick = () => {
      if (currentTaskIndex < tasks.length - 1) {
        currentTaskIndex++
        updateTaskContent()
        const activeTaskEl = document.getElementById(`or_task_${currentTaskIndex}`)
        if (activeTaskEl) {
          Object.assign(activeTaskEl.style, taskNumberActive)
        }
        for (let i = 0; i < currentTaskIndex; i++) {
          const taskEl = document.getElementById(`or_task_${i}`)
          if (taskEl) {
            Object.assign(taskEl.style, taskNumberDone)
          }
        }
      }
    }
    Object.assign(nextButton.style, taskButtonStyle)

    taskButtons.appendChild(closePanelButton)
    taskButtons.appendChild(nextButton)

    content.appendChild(pagination)
    content.appendChild(taskText)
    content.appendChild(taskDescription)
    content.appendChild(taskButtons)

    section.appendChild(titleContainer)
    section.appendChild(content)

    // Toggle logic
    const hideTasks = () => {
      Object.assign(content.style, {
        display: 'none',
      })
      this.widgetTasksVisible = false
      return false
    }
    this.hideTaskSection = hideTasks

    const showTasks = () => {
      Object.assign(content.style, contentStyle)
      this.widgetTasksVisible = true
      return true
    }
    this.showTaskSection = showTasks

    closePanelButton.onclick = () => hideTasks()
    titleContainer.onclick = () => {
      if (this.widgetTasksVisible) {
        hideTasks()
      } else {
        showTasks()
      }
    }

    updateTaskContent()
    setTimeout(() => {
      const firstTaskEl = document.getElementById('or_task_0')
      if (firstTaskEl) {
        Object.assign(firstTaskEl.style, taskNumberActive)
      }
    }, 1)
    return section
  }

  hideTaskSection = () => false
  showTaskSection = () => true
}

// Styles
const bgStyle = {
  width: '100vw',
  height: '100vh',
  background: 'rgba(0, 0, 0, 0.40)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const containerStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  alignItems: 'center',
  padding: '1.5rem',
  borderRadius: '0.375rem',
  border: '1px solid #D9D9D9',
  background: '#FFF',
  width: '29rem',
}
const containerWidgetStyle = {
  display: 'flex',
  'flex-direction': 'column',
  gap: '8px',
  'align-items': 'center',
  padding: '1rem',
  'border-radius': '0.375rem',
  border: '1px solid #D9D9D9',
  background: '#FFF',
  width: '29rem',
}

const titleStyle = {
  fontFamily: 'Roboto',
  fontSize: '1.25rem',
  fontStyle: 'normal',
  fontWeight: '500',
  lineHeight: '1.75rem',
  color: 'rgba(0, 0, 0, 0.85)',
}

const descriptionStyle = {
  borderTop: '1px solid rgba(0, 0, 0, 0.06)',
  borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
  padding: '1.25rem 0rem',
  color: 'rgba(0, 0, 0, 0.85)',
  fontFamily: 'Roboto',
  fontSize: '1rem',
  fontStyle: 'normal',
  fontWeight: '400',
  lineHeight: '1.5rem',
}

const noticeStyle = {
  color: 'rgba(0, 0, 0, 0.85)',
  fontFamily: 'Roboto',
  fontSize: '0.875rem',
  fontStyle: 'normal',
  fontWeight: '400',
  lineHeight: '1.375rem',
}

const buttonStyle = {
  display: 'flex',
  padding: '0.4rem 0.9375rem',
  justifyContent: 'center',
  alignItems: 'center',
  gap: '0.625rem',
  borderRadius: '0.25rem',
  border: '1px solid #394EFF',
  background: '#394EFF',
  boxShadow: '0px 2px 0px 0px rgba(0, 0, 0, 0.04)',
  color: '#FFF',
  textAlign: 'center',
  fontFamily: 'Roboto',
  fontSize: '1rem',
  fontStyle: 'normal',
  fontWeight: '500',
  lineHeight: '1.5rem',
}

const descrtitleStyle = {
  fontFamily: 'Verdana, sans-serif',
  fontSize: '0.875rem',
  fontWeight: '500',
  lineHeight: '1.375rem',
  display: 'flex',
  justifyContent: 'space-between',
  width: '100%',
  cursor: 'pointer',
}

const contentStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: '0.625rem',
}

// New widget styles
const titleWidgetStyle = {
  padding: '0.5rem',
  gap: '0.5rem',
  fontFamily: 'Verdana, sans-serif',
  fontSize: '1.25rem',
  fontStyle: 'normal',
  fontWeight: '500',
  lineHeight: '1.75rem',
  color: 'white',
  display: 'flex',
  alignItems: 'center',
  width: '100%',
  borderRadius: '0.375rem',
  background: 'rgba(0, 0, 0, 0.60)',
  boxSizing: 'border-box',
}

const descriptionWidgetStyle = {
  boxSizing: 'border-box',
  width: '100%',
  borderRadius: '0.375rem',
  border: '1px solid #D9D9D9',
  background: '#FFF',
  padding: '0.625rem 1rem',
  alignSelf: 'stretch',
  color: '#000',
  fontFamily: 'Verdana, sans-serif',
  fontSize: '0.875rem',
  fontStyle: 'normal',
  fontWeight: '400',
  lineHeight: '1.375rem',
}

const buttonWidgetStyle = {
  display: 'flex',
  padding: '0.4rem 0.9375rem',
  justifyContent: 'center',
  alignItems: 'center',
  gap: '0.625rem',
  borderRadius: '0.25rem',
  border: '1px solid #394EFF',
  background: '#394EFF',
  boxShadow: '0px 2px 0px 0px rgba(0, 0, 0, 0.04)',
  color: '#FFF',
  textAlign: 'center',
  fontFamily: 'Verdana, sans-serif',
  fontSize: '1rem',
  fontStyle: 'normal',
  fontWeight: '500',
  lineHeight: '1.5rem',
  width: '100%',
  boxSizing: 'border-box',
  cursor: 'pointer',
}

const stopWidgetStyle = {
  marginTop: '2rem',
  cursor: 'pointer',
}

const paginationStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '1rem',
  padding: '0.5rem',
  width: '100%',
  boxSizing: 'border-box',
}

const taskNumberActive = {
  display: 'flex',
  padding: '0.0625rem 0.5rem',
  flexDirection: 'column',
  alignItems: 'center',
  borderRadius: '6.25em',
  outline: '1px solid #394EFF',
}
const taskNumberDone = {
  display: 'flex',
  padding: '0.0625rem 0.5rem',
  flexDirection: 'column',
  alignItems: 'center',
  borderRadius: '6.25em',
  outline: '1px solid #D2DFFF',
  boxShadow: '0px 2px 0px 0px rgba(0, 0, 0, 0.04)',
  background: '#D2DFFF',
}

const taskDescriptionCard = {
  borderRadius: '0.375rem',
  border: '1px solid rgba(0, 0, 0, 0.06)',
  background: '#F5F7FF',
  boxShadow: '0px 2px 0px 0px rgba(0, 0, 0, 0.04)',
  display: 'flex',
  padding: '0.625rem 0.9375rem',
  justifyContent: 'center',
  alignItems: 'flex-start',
  gap: '0.625rem',
  alignSelf: 'stretch',
}

const taskTextStyle = {
  fontWeight: 'bold',
}

const taskDescriptionStyle = {
  color: 'rgba(0, 0, 0, 0.85)',
}

const taskButtonStyle = {
  marginRight: '0.5rem',
  cursor: 'pointer',
}

// Usage
const manager = new UserTestManager()
manager.createGreeting('Test name goes here', true, true)
