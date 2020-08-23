/** @jsx jsx */
import styled from '@emotion/styled'
import { FC, useRef, useState, useEffect } from 'react'
import { jsx, css } from '@emotion/react'
import { format } from 'date-fns'
import { initialValue } from './initialValue'
import Terminal from './Terminal'
import dynamic from 'next/dynamic'
const Editor = dynamic(() => import('@monaco-editor/react'), { ssr: false })
const dateFormat = 'HH:mm:ss'

interface FlowChartCodeEditorProps {
  className?: string
  isActive: boolean
}
const FlowChartCodeEditor: FC<FlowChartCodeEditorProps> = ({
  className,
  isActive,
}) => {
  const editorRef = useRef<{
    className: string
    wrapperClassName: string
    onDidChangeModelContent: (cb: () => void) => void
    getValue: () => void
  }>()

  const [outputValue, setOutputValue] = useState(
    `${format(new Date(), dateFormat)}:~$ Initialized \r\n`,
  )

  const handleEditorDidMount = (_: () => string, editor: any) => {
    console.log(editor)
    editorRef.current = editor
  }

  const handleEvalScript = () => {
    const date = format(new Date(), dateFormat)
    const editor = editorRef?.current ?? null
    if (editor) {
      const script = editor.getValue() as string | undefined
      if (script && script.length) {
        try {
          const result = new Function(script)
          const response = result.call(null, 1)
          console.log(response)
          setOutputValue(outputValue + `${date}:~$ Success \r\n`)
        } catch (err) {
          console.log(err)
          setOutputValue(outputValue + date + ':~$ ' + err + '\r\n')
        }
      }
    }
  }

  const listenEditorChanges = () => {
    const editor = editorRef?.current ?? null
    if (editor) {
      editor.onDidChangeModelContent(() => {
        console.log(editor.getValue())
      })
    }
  }

  return (
    <div className={className}>
      {isActive ? (
        <Editor
          loading={null}
          width="50%"
          height="100%"
          className="editor"
          wrapperClassName="editor-wrapper"
          value={initialValue}
          editorDidMount={handleEditorDidMount}
          language="javascript"
          theme="dark"
          options={{
            tabSize: 2,
            minimap: {
              enabled: false,
            },
          }}
          css={editorCss}
        />
      ) : null}
      <Terminal outputValue={outputValue} onEvalScript={handleEvalScript} />
    </div>
  )
}

export default styled(FlowChartCodeEditor)`
  display: flex;
  height: 100%;
  position: relative;
  background: #202124;
  box-sizing: border-box;
  transition: all 0.25s ease-in-out;
`

const editorCss = css`
  flex: 1;
  box-sizing: border-box;
  width: 200px;
  transition: all 0.25s ease-in-out;
`