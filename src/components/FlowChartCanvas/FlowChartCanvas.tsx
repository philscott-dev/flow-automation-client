import {
  GetWorkflow_workflow_workflowNodes as WorkflowNode,
  GetWorkflow,
  GetWorkflowVariables,
} from 'graphql/queries/__generated__/GetWorkflow'
import { GetWorkflow_workflow as Workflow } from 'graphql/queries/__generated__/GetWorkflow'
import styled from '@emotion/styled'
import { useDrawCallback, useResize } from 'hooks'
import { Point } from 'types'
import { pointInRect } from 'utils/math'
import { zoom } from 'utils/zoom'
import { getCanvasPoint } from 'helpers/canvas'
import { useApolloClient } from '@apollo/client'
import { useUpdateNodePosition } from 'graphql/mutations/updateWorkflowNodePosition'
import { GET_WORKFLOW } from 'graphql/queries'
import {
  useState,
  forwardRef,
  WheelEvent,
  MouseEvent,
  DragEvent,
  useEffect,
} from 'react'
import { getConnectorPoint, getConnectorRect } from 'utils/node'
import { useUpdateNodeParent } from 'graphql/mutations/updateWorkflowNodeParent'
import { ICON_HEIGHT, ICON_WIDTH } from 'constants/canvas'

interface FlowChartCanvasProps {
  className?: string
  canvas: HTMLCanvasElement | null
  ctx: CanvasRenderingContext2D | null
  workflowId: any
  workflow?: Workflow
  nodes?: WorkflowNode[]
  activeId?: string
  translateOffset: Point
  scale: number
  origin: Point
  isDragging: boolean
  onDragging: (isDragging: boolean) => void
  onDrop: (e: DragEvent) => void
  onClickNode: (id: string) => void
  onTranslate: (point: Point) => void
  onScale: (factor: number) => void
  onOrigin: (pt: Point) => void
  onNodePlayClick: () => void
  onNodeSettingsClick: () => void
  onNodeTrashClick: () => void
}
const FlowChartCanvas = forwardRef<HTMLCanvasElement, FlowChartCanvasProps>(
  (
    {
      className,
      canvas,
      ctx,
      nodes = [],
      activeId,
      translateOffset,
      scale,
      origin,
      isDragging,
      workflowId,
      workflow,
      onDrop,
      onDragging,
      onClickNode,
      onTranslate,
      onScale,
      onOrigin,
      onNodePlayClick,
      onNodeSettingsClick,
      onNodeTrashClick,
    },
    canvasRef,
  ) => {
    const apolloClient = useApolloClient()
    const { mutate: updateNodePosition } = useUpdateNodePosition(workflowId)
    const { mutate: updateNodeParent } = useUpdateNodeParent(workflowId)
    const [hasLoaded, setHasLoaded] = useState(false)
    const [dragId, setDragId] = useState<string>()
    const [clickOffset, setClickOffset] = useState<Point>() // probably needs renaming
    const [connectorDrag, setConnectorDrag] = useState<Point>()
    const [isConnecting, setConnecting] = useState(false)
    const [hoverId, setHoverId] = useState<string>()
    const draw = useDrawCallback(
      ctx,
      translateOffset,
      scale,
      nodes,
      activeId,
      hoverId,
      connectorDrag,
      dragId,
    )

    //draw once
    useEffect(() => {
      if (canvas && !hasLoaded) {
        setHasLoaded(true)
        draw()
      }
    }, [hasLoaded, draw, canvas])

    //fire on window resize
    useResize(canvas, draw)

    const onMouseDown = (
      e: MouseEvent<HTMLCanvasElement, globalThis.MouseEvent>,
    ) => {
      if (canvas) {
        // always set these both
        document.body.style.userSelect = 'none'
        onDragging(true)

        const point = getCanvasPoint(e, canvas)
        const x = point.x / scale
        const y = point.y / scale

        // find a node
        handleNodeClick(x, y)

        // handle any control clicks
        if (activeId) {
          const activeNode = nodes.find((n) => n.id === activeId)
          if (activeNode) {
            handlePlayClick(x, y, activeNode)
            handleSettingsClick(x, y, activeNode)
            handleTrashClick(x, y, activeNode)
          }
        }
      }
    }

    const onMouseMove = (
      e: MouseEvent<HTMLCanvasElement, globalThis.MouseEvent>,
    ) => {
      if (!canvas) return
      const point = getCanvasPoint(e, canvas)
      const x = point.x / scale
      const y = point.y / scale
      if (isDragging) {
        const dragX = x - (clickOffset?.x ?? 0)
        const dragY = y - (clickOffset?.y ?? 0)

        canvas.style.cursor = 'grabbing'
        // handle moving a connector
        if (isConnecting) {
          handleDragConnector(x - translateOffset.x, y - translateOffset.y)
        }
        // move the node if we've clicked a node
        else if (isDragging && dragId !== undefined) {
          handleDragNode(dragX, dragY)
        }
        // otherwise move the canvas
        else if (isDragging && clickOffset) {
          handleDragCanvas(dragX, dragY)
          //set the position
          setClickOffset({ x, y })
        }
      } else {
        // if not dragging, check for hover effects
        const mouseX = x - translateOffset.x
        const mouseY = y - translateOffset.y

        for (const node of nodes) {
          const connectorPoint = getConnectorPoint(node)
          const connectorRect = getConnectorRect(connectorPoint)
          const isConnectorHovered = pointInRect(mouseX, mouseY, connectorRect)
          if (pointInRect(mouseX, mouseY, node) || isConnectorHovered) {
            setHoverId(node.id)
            canvas.style.cursor = isConnectorHovered ? 'grab' : 'pointer'
            break // break out early if we find a node
          } else {
            canvas.style.cursor = 'default'
            setHoverId(undefined)
          }
        }

        // if theres an active node, check for control hovers
        if (activeId) {
          const activeNode = nodes.find((n) => n.id === activeId)
          if (activeNode) {
            handleIconHover(mouseX, mouseY, activeNode)
          }
        }
      }
    }

    const onMouseUp = (
      e: MouseEvent<HTMLCanvasElement, globalThis.MouseEvent>,
    ) => {
      // TODO: needs to be a helper
      if (canvas) {
        canvas.style.cursor = hoverId ? 'pointer' : 'default'

        // get initial data
        const point = getCanvasPoint(e, canvas)
        const x = point.x / scale
        const y = point.y / scale

        if (isConnecting && dragId) {
          // get the ID of the node released over
          //const id = undefined

          for (const node of nodes) {
            const isDropped = pointInRect(
              x - translateOffset.x,
              y - translateOffset.y,
              node,
            )

            // "&& !node.parentId" was controlling keeping nodes separated
            if (isDropped && node.id !== dragId) {
              updateNodeParent({
                variables: {
                  input: { workflowId, id: node.id, parentId: dragId },
                },
              })
            }
          }
        } else if (
          !isConnecting &&
          isDragging &&
          dragId !== undefined &&
          clickOffset
        ) {
          const index = nodes.findIndex((n) => n.id === dragId)
          if (index > -1) {
            const dragX = x - clickOffset.x
            const dragY = y - clickOffset.y
            updateNodePosition({
              variables: {
                input: {
                  workflowId,
                  id: dragId,
                  x: dragX,
                  y: dragY,
                },
              },
            })
          }
        }
      }

      // unset everything
      document.body.style.userSelect = 'inherit'
      onDragging(false)
      setDragId(undefined)
      setClickOffset(undefined)

      // connectors
      setConnecting(false)
      setConnectorDrag(undefined)
    }

    const onWheel = (e: WheelEvent<HTMLCanvasElement>) => {
      if (canvas) {
        const x = zoom(canvas, scale, origin, translateOffset, e)
        onTranslate(x.translate)
        onScale(x.factor)
        onOrigin(x.origin)
        draw()
      }
    }

    const handleDragConnector = (dragX: number, dragY: number) => {
      setConnectorDrag({ x: dragX, y: dragY })
    }

    const handleDragNode = (dragX: number, dragY: number) => {
      const index = nodes.findIndex((n) => n.id === dragId)
      if (index > -1) {
        const node = nodes[index]
        const dragNode = {
          ...node,
          x: dragX,
          y: dragY,
        }

        //write to the apollo cache
        if (workflow) {
          apolloClient.cache.writeQuery<GetWorkflow, GetWorkflowVariables>({
            query: GET_WORKFLOW,
            variables: { id: parseInt(workflow.id, 10) },
            data: {
              workflow: {
                ...workflow,
                workflowNodes: [
                  ...nodes.slice(0, index),
                  dragNode,
                  ...nodes.slice(index + 1),
                ],
              },
            },
          })
        }
      }
    }

    const handleDragCanvas = (dragX: number, dragY: number) => {
      //accumulate the translate
      onTranslate({
        x: translateOffset.x + dragX,
        y: translateOffset.y + dragY,
      })
    }

    const handleNodeClick = (x: number, y: number) => {
      const clickPoint = {
        x: x - translateOffset.x,
        y: y - translateOffset.y,
      }
      for (const node of nodes) {
        const connectorPoint = getConnectorPoint(node) // no translateOffset. idk why?
        const connectorRect = getConnectorRect(connectorPoint) // no translateOffset?
        const isNodeClick = pointInRect(clickPoint.x, clickPoint.y, node)
        const isConnectorClick = pointInRect(
          clickPoint.x,
          clickPoint.y,
          connectorRect,
        )

        if (isConnectorClick) {
          if (canvas) {
            canvas.style.cursor = 'dragging'
          }
          setConnecting(true)
          setDragId(node.id)
          setClickOffset({ x, y })
          return
        }

        if (isNodeClick) {
          setDragId(node.id)
          setClickOffset({
            x: x - node.x,
            y: y - node.y,
          })
          onClickNode(node.id)
          return
        }
      }

      // finally set offset for canvas drag
      setClickOffset({ x, y })
    }

    const handlePlayClick = (
      x: number,
      y: number,
      workflowNode: WorkflowNode,
    ) => {
      const clickX = x - translateOffset.x
      const clickY = y - translateOffset.y
      const iconX = workflowNode.x + 8
      const iconY = workflowNode.y + workflowNode.height + 10
      const isClicked = pointInRect(clickX, clickY, {
        x: iconX,
        y: iconY,
        width: ICON_WIDTH,
        height: ICON_HEIGHT,
      })
      if (isClicked) {
        onNodePlayClick()
      }
    }

    const handleSettingsClick = (
      x: number,
      y: number,
      workflowNode: WorkflowNode,
    ) => {
      const clickX = x - translateOffset.x
      const clickY = y - translateOffset.y
      const iconX = workflowNode.x - 56 + workflowNode.width
      const iconY = workflowNode.y + workflowNode.height + 11
      const isClicked = pointInRect(clickX, clickY, {
        x: iconX,
        y: iconY,
        width: ICON_WIDTH,
        height: ICON_HEIGHT,
      })
      if (isClicked) {
        onNodeSettingsClick()
      }
    }

    const handleTrashClick = (
      x: number,
      y: number,
      workflowNode: WorkflowNode,
    ) => {
      const clickX = x - translateOffset.x
      const clickY = y - translateOffset.y
      const iconX = workflowNode.x + workflowNode.width - 28
      const iconY = workflowNode.y + workflowNode.height + 12
      const isClicked = pointInRect(clickX, clickY, {
        x: iconX,
        y: iconY,
        width: ICON_WIDTH,
        height: ICON_HEIGHT,
      })
      if (isClicked) {
        onNodeTrashClick()
      }
    }

    const handleIconHover = (
      mouseX: number,
      mouseY: number,
      activeNode: WorkflowNode,
    ) => {
      if (!canvas) return
      const playX = activeNode.x + 8
      const playY = activeNode.y + activeNode.height + 10
      const isPlayHovered = pointInRect(mouseX, mouseY, {
        x: playX,
        y: playY,
        width: ICON_WIDTH,
        height: ICON_HEIGHT,
      })
      if (isPlayHovered) {
        return (canvas.style.cursor = 'pointer')
      }

      const settingsX = activeNode.x - 56 + activeNode.width
      const settingsY = activeNode.y + activeNode.height + 11
      const isSettingsHovered = pointInRect(mouseX, mouseY, {
        x: settingsX,
        y: settingsY,
        width: ICON_WIDTH,
        height: ICON_HEIGHT,
      })
      if (isSettingsHovered) {
        return (canvas.style.cursor = 'pointer')
      }

      const trashX = activeNode.x + activeNode.width - 28
      const trashY = activeNode.y + activeNode.height + 12
      const isTrashHovered = pointInRect(mouseX, mouseY, {
        x: trashX,
        y: trashY,
        width: ICON_WIDTH,
        height: ICON_HEIGHT,
      })
      if (isTrashHovered) {
        return (canvas.style.cursor = 'pointer')
      }
    }

    return (
      <canvas
        ref={canvasRef}
        className={className}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onMouseMove={onMouseMove}
        onWheel={onWheel}
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
      />
    )
  },
)

export default styled(FlowChartCanvas)``
