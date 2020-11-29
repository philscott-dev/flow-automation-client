import { GetWorkflow_workflow_workflowNodes as WorkflowNode } from 'graphql/queries/__generated__/GetWorkflow'
import styled from '@emotion/styled'
import { PivotQueue, QueueFunctionType } from 'components/PivotQueue'
import { FC } from 'react'
import Heading from './Heading'
import ServiceLinkEmpty from 'components/ServiceLinkList/ServiceLinkEmpty'

interface FlowChartDataLinkSidebarProps {
  className?: string
  childNodes?: WorkflowNode[] | undefined
  activeNode?: WorkflowNode
}
const FlowChartDataLinkSidebar: FC<FlowChartDataLinkSidebarProps> = ({
  className,
  childNodes,
  activeNode,
}) => {
  const handleSelectValue: QueueFunctionType = (value, parentId, childId) => {
    console.log(value)
  }
  const handleRemoveValue: QueueFunctionType = (value, parentId, childId) => {
    console.log(value, parentId, childId)
  }
  return (
    <div className={className}>
      <Heading serviceCount={childNodes?.length ?? 0} />
      {childNodes?.length ? (
        childNodes.map((node) => (
          <PivotQueue
            key={node.id}
            parentId={activeNode?.id}
            childId={node.id}
            title={node.displayName}
            subtitle={'subroute'}
            color={node.colorPrimary}
            onSelectValue={handleSelectValue}
            onRemoveValue={handleRemoveValue}
          />
        ))
      ) : (
        <ServiceLinkEmpty />
      )}
    </div>
  )
}

export default styled(FlowChartDataLinkSidebar)`
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  min-width: 336px;
  max-width: 336px;
  background: #202124;
  overflow-y: auto;
  padding: 0 24px;
`
