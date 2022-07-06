/*
  Here implemented the case when both dragArea and dropArea
  are located inside the document of the dragging iframe.
  Thus, all the events belong and relate to that inside document.
*/
export default function attachDND(
  movingEl: HTMLIFrameElement,
  dragArea: Element, 
  dropArea: Element,
) {

  dragArea.addEventListener('pointerdown', userPressed, { passive: true, })

  let bbox, 
    startX, startY, 
    raf, 
    deltaX = 0, deltaY = 0

  function userPressed(event) {
    startX = event.clientX
    startY = event.clientY
    bbox = movingEl.getBoundingClientRect()
    dropArea.addEventListener('pointermove', userMoved, { passive: true, })
    dropArea.addEventListener('pointerup', userReleased, { passive: true, })
    dropArea.addEventListener('pointercancel', userReleased, { passive: true, })
  };

  /* 
    In case where the dropArea moves along with the dragging object
    we can only append deltas, but not to define each time it moves.
  */
  function userMoved(event) {
    if (!raf) {
      deltaX += event.clientX - startX
      deltaY += event.clientY - startY
      deltaX = Math.min(
        Math.max(deltaX, -bbox.left),
        window.innerWidth - bbox.right,
      )
      deltaY = Math.min(
        Math.max(deltaY, -bbox.top),
        window.innerHeight - bbox.bottom,
      )
      raf = requestAnimationFrame(userMovedRaf)
    }
  }

  function userMovedRaf() {
    movingEl.style.transform = 'translate3d('+deltaX+'px,'+deltaY+'px, 0px)'
    raf = null
  }

  function userReleased() {
    dropArea.removeEventListener('pointermove', userMoved)
    dropArea.removeEventListener('pointerup', userReleased)
    dropArea.removeEventListener('pointercancel', userReleased)
    if (raf) {
      cancelAnimationFrame(raf)
      raf = null
    }
    movingEl.style.left = bbox.left + deltaX + 'px'
    movingEl.style.top = bbox.top + deltaY + 'px'
    movingEl.style.transform = 'translate3d(0px,0px,0px)'
    deltaX = deltaY = 0
  }
}