// @ts-nocheck

export default function attachDND(element, dragTarget) {
  dragTarget.onmousedown = function (event) {
    const clientRect = element.getBoundingClientRect()
    const shiftX = event.clientX - clientRect.left
    const shiftY = event.clientY - clientRect.top

    element.style.position = 'fixed'
    element.style.zIndex = 99999999999999

    moveAt(event.pageX, event.pageY)

    function moveAt(pageX, pageY) {
      let leftC = pageX - shiftX
      let topC = pageY - shiftY

      if (leftC <= 5) leftC = 5
      if (topC <= 5) topC = 5
      if (leftC >= window.innerWidth - clientRect.width)
        leftC = window.innerWidth - clientRect.width
      if (topC >= window.innerHeight - clientRect.height)
        topC = window.innerHeight - clientRect.height

      element.style.left = `${leftC}px`
      element.style.top = `${topC}px`
    }

    function onMouseMove(event) {
      moveAt(event.pageX, event.pageY)
    }

    document.addEventListener('mousemove', onMouseMove)

    dragTarget.onmouseup = function () {
      document.removeEventListener('mousemove', onMouseMove)
      dragTarget.onmouseup = null
    }

    // dragTarget.onmouseleave = function () {
    //   document.removeEventListener('mousemove', onMouseMove)
    //   dragTarget.onmouseleave = null
    // }

    const onMouseOut = () => {
      document.removeEventListener('mousemove', onMouseMove)
      window?.removeEventListener('mouseout', onMouseOut)
    }

    window?.addEventListener('mouseout', onMouseOut)
  }

  dragTarget.ondragstart = function () {
    return false
  }
}
