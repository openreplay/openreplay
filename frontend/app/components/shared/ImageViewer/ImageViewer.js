import React, { useState } from 'react'
import { Button } from 'UI';

export default function ImageViewer(
  { source, activeIndex, onClose }
) {  
  const [currentIndex, setCurrentIndex] = useState(activeIndex)
  const onPrevClick = () => {
    setCurrentIndex(currentIndex - 1);
  }
  const onNextClick = () => {
    setCurrentIndex(currentIndex + 1);
  }
  return (
    <div className="absolute bg-gray-light inset-0 z-50">     
      <div className="flex justify-between absolute bottom-0 left-0 right-0 p-3 border-t bg-white">
        <Button variant="outline" onClick={onPrevClick} disabled={currentIndex === 0}>
          Prev
        </Button>
        <Button variant="outline" onClick={onClose}>
          CLOSE
        </Button>
        <Button variant="outline" onClick={onNextClick} disabled={currentIndex === source.length - 1}>
          Next
        </Button>
      </div>
      <img src={source[currentIndex]} className="border p-3"/>
    </div>
  )
}
