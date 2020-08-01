/** @jsx jsx */
import { FC, useRef, useState, DragEvent } from 'react'
import { jsx } from '@emotion/react'
import styled from '@emotion/styled'
import Canvas from './Canvas'
import { Node, Point } from './types'
import { getCanvasPoint } from './helpers/helpers'
import useTransformRefs from './hooks/useTransformRefs'
import { NODE_HEIGHT, NODE_WIDTH } from './constants'
import { FlowChartUI } from './FlowChartUI'

interface FlowChartProps {
  className?: string
}
const FlowChart: FC<FlowChartProps> = ({ className }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { ctx } = useTransformRefs(canvasRef)
  const [nodes, setNodes] = useState<Node[]>([])
  const [dragStartOffset, setDragStartOffset] = useState<Point>({ x: 0, y: 0 })
  const [translateOffset, setTranslateOffset] = useState<Point>({ x: 0, y: 0 })
  const [scale, setScale] = useState<number>(1)
  const [color, setColor] = useState('')
  const [activeId, setActiveId] = useState<number>()
  const [isDragging, setDragging] = useState(false)

  //get initial mouse offset in dom object
  const handleDragStart = (e: DragEvent<HTMLDivElement>) => {
    const elem = e.currentTarget
    const { x: pX, y: pY } = getCanvasPoint(e, elem)
    const x = pX / scale
    const y = pY / scale
    setDragging(true)
    setDragStartOffset({ x, y })
    setColor(elem.getAttribute('color') || '')
  }

  const handleTranslate = (pt: Point) => {
    setTranslateOffset(pt)
  }

  const handleScale = (factor: number) => {
    setScale(factor)
  }

  const handleDropNewNode = (e: DragEvent) => {
    e.preventDefault()
    const { current: canvas } = canvasRef
    if (canvas) {
      const { x: pX, y: pY } = getCanvasPoint(e, canvas)
      const x = pX / scale
      const y = pY / scale
      const node: Node = {
        id: nodes.length,
        title: color,
        color,
        rect: {
          x: x - dragStartOffset.x - translateOffset.x,
          y: y - dragStartOffset.y - translateOffset.y,
          width: NODE_WIDTH,
          height: NODE_HEIGHT,
        },
      }
      setNodes([...nodes, node])
      setDragging(false)
    }
  }

  const handleClickNode = (id: number) => {
    setActiveId(id)
  }

  return (
    <div className={className}>
      <FlowChartUI onDragStart={handleDragStart} />
      <Canvas
        ref={canvasRef}
        canvas={canvasRef.current}
        ctx={ctx}
        translateOffset={translateOffset}
        scale={scale}
        nodes={nodes}
        activeId={activeId}
        isDragging={isDragging}
        onDragging={setDragging}
        onSetNodes={setNodes}
        onClickNode={handleClickNode}
        onDrop={handleDropNewNode}
        onTranslate={handleTranslate}
        onScale={handleScale}
      />
    </div>
  )
}

export default styled(FlowChart)`
  position: relative;
  min-height: -webkit-fill-available;
  display: flex;
`
