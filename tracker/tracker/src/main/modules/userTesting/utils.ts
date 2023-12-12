import { spinnerStyles } from './styles.js'

export function generateGrid() {
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

export function generateChevron() {
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

export function addKeyframes() {
  const styleSheet = document.createElement('style')
  styleSheet.type = 'text/css'
  styleSheet.innerText = `@keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }`
  document.head.appendChild(styleSheet)
}

export function createSpinner() {
  addKeyframes()
  const spinner = document.createElement('div')
  spinner.classList.add('spinner')

  Object.assign(spinner.style, spinnerStyles)

  return spinner
}

export function createElement(
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

export const TEST_START = 'or_uxt_test_start'
export const TASK_IND = 'or_uxt_task_index'
export const SESSION_ID = 'or_uxt_session_id'
export const TEST_ID = 'or_uxt_test_id'
