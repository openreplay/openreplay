import React from 'react'
import stl from './circleNumber.module.css'

export default function CircleNumber({ text }) {
  return (
    <span className={stl.number}>{text}</span> 
  )
}
