import AnnotationCanvas from '../src/AnnotationCanvas'
import { describe, expect, test, it, jest, beforeEach, afterEach, } from '@jest/globals'


describe('AnnotationCanvas', () => {
  let annotationCanvas
  let documentBody
  let canvasMock
  let contextMock

  beforeEach(() => {
    canvasMock = {
      width: 0,
      height: 0,
      style: {},
      getContext: jest.fn(() => contextMock as unknown as HTMLCanvasElement),
      parentNode: document,
    }

    contextMock = {
      globalAlpha: 1.0,
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      lineWidth: 8,
      lineCap: 'round',
      lineJoin: 'round',
      strokeStyle: 'red',
      stroke: jest.fn(),
      globalCompositeOperation: '',
      fillStyle: '',
      fillRect: jest.fn(),
      clearRect: jest.fn(),
    }

    documentBody = document.body
    // @ts-ignore
    document['removeChild'] = (el) => jest.fn(el)
    // @ts-ignore
    document['createElement'] = () => canvasMock

    jest.spyOn(documentBody, 'appendChild').mockImplementation(jest.fn())
    jest.spyOn(documentBody, 'removeChild').mockImplementation(jest.fn())
    jest.spyOn(window, 'addEventListener').mockImplementation(jest.fn())
    jest.spyOn(window, 'removeEventListener').mockImplementation(jest.fn())
    annotationCanvas = new AnnotationCanvas()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should create a canvas element with correct styles when initialized', () => {
    const createElSpy = jest.spyOn(document, 'createElement')
    annotationCanvas = new AnnotationCanvas()
    expect(createElSpy).toHaveBeenCalledWith('canvas')
    expect(canvasMock.style.position).toBe('fixed')
    expect(canvasMock.style.left).toBe(0)
    expect(canvasMock.style.top).toBe(0)
    expect(canvasMock.style.pointerEvents).toBe('none')
    expect(canvasMock.style.zIndex).toBe(2147483647 - 2)
  })

  it('should resize the canvas when calling resizeCanvas method', () => {
    annotationCanvas.resizeCanvas()

    expect(canvasMock.width).toBe(window.innerWidth)
    expect(canvasMock.height).toBe(window.innerHeight)
  })

  it('should start painting and set the last position when calling start method', () => {
    const position = [10, 20,]

    annotationCanvas.start(position)

    expect(annotationCanvas.painting).toBe(true)
    expect(annotationCanvas.clrTmID).toBeNull()
    expect(annotationCanvas.lastPosition).toEqual(position)
  })

  it('should stop painting and call fadeOut method when calling stop method', () => {
    annotationCanvas.painting = true
    const fadeOutSpy = jest.spyOn(annotationCanvas, 'fadeOut')

    annotationCanvas.stop()

    expect(annotationCanvas.painting).toBe(false)
    expect(fadeOutSpy).toHaveBeenCalled()
  })

  it('should not stop painting or call fadeOut method when calling stop method while not painting', () => {
    annotationCanvas.painting = false
    const fadeOutSpy = jest.spyOn(annotationCanvas, 'fadeOut')
    annotationCanvas.stop()

    expect(fadeOutSpy).not.toHaveBeenCalled()
  })

  it('should draw a line on the canvas when calling move method', () => {
    annotationCanvas.painting = true
    annotationCanvas.ctx = contextMock
    const initialLastPosition = [0, 0,]
    const position = [10, 20,]

    annotationCanvas.move(position)

    expect(contextMock.globalAlpha).toBe(1.0)
    expect(contextMock.beginPath).toHaveBeenCalled()
    expect(contextMock.moveTo).toHaveBeenCalledWith(initialLastPosition[0], initialLastPosition[1])
    expect(contextMock.lineTo).toHaveBeenCalledWith(position[0], position[1])
    expect(contextMock.stroke).toHaveBeenCalled()
    expect(annotationCanvas.lastPosition).toEqual(position)
  })

  it('should not draw a line on the canvas when calling move method while not painting', () => {
    annotationCanvas.painting = false
    annotationCanvas.ctx = contextMock
    const position = [10, 20,]

    annotationCanvas.move(position)

    expect(contextMock.beginPath).not.toHaveBeenCalled()
    expect(contextMock.stroke).not.toHaveBeenCalled()
    expect(annotationCanvas.lastPosition).toEqual([0, 0,])
  })

  it('should fade out the canvas when calling fadeOut method', () => {
    annotationCanvas.ctx = contextMock
    jest.useFakeTimers()
    const timerSpy = jest.spyOn(window, 'setTimeout')
    annotationCanvas.fadeOut()

    expect(timerSpy).toHaveBeenCalledTimes(2)
    expect(contextMock.globalCompositeOperation).toBe('source-over')
    expect(contextMock.fillStyle).toBe('rgba(255, 255, 255, 0.1)')
    expect(contextMock.fillRect).toHaveBeenCalledWith(0, 0, canvasMock.width, canvasMock.height)
    jest.runOnlyPendingTimers()
    expect(contextMock.clearRect).toHaveBeenCalledWith(0, 0, canvasMock.width, canvasMock.height)
  })

  it('should remove the canvas element when calling remove method', () => {
    const spyOnRemove = jest.spyOn(document, 'removeChild')
    annotationCanvas.remove()

    expect(spyOnRemove).toHaveBeenCalledWith(canvasMock)
    expect(window.removeEventListener).toHaveBeenCalledWith('resize', annotationCanvas.resizeCanvas)
  })
})