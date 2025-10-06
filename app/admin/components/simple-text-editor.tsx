"use client"

import { useState, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Quote,
  Undo,
  Redo
} from 'lucide-react'

interface SimpleTextEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
}

export function SimpleTextEditor({ content, onChange, placeholder = "Write your content here..." }: SimpleTextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [history, setHistory] = useState<string[]>([content])
  const [historyIndex, setHistoryIndex] = useState(0)

  const executeCommand = (command: string, value?: string) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = content.substring(start, end)
    let newText = content

    switch (command) {
      case 'bold':
        if (selectedText) {
          newText = content.substring(0, start) + `**${selectedText}**` + content.substring(end)
        } else {
          newText = content.substring(0, start) + '**bold text**' + content.substring(end)
        }
        break
      case 'italic':
        if (selectedText) {
          newText = content.substring(0, start) + `*${selectedText}*` + content.substring(end)
        } else {
          newText = content.substring(0, start) + '*italic text*' + content.substring(end)
        }
        break
      case 'list':
        const lines = content.split('\n')
        const currentLineIndex = content.substring(0, start).split('\n').length - 1
        lines[currentLineIndex] = lines[currentLineIndex].replace(/^/, '- ')
        newText = lines.join('\n')
        break
      case 'orderedList':
        const lines2 = content.split('\n')
        const currentLineIndex2 = content.substring(0, start).split('\n').length - 1
        lines2[currentLineIndex2] = lines2[currentLineIndex2].replace(/^/, '1. ')
        newText = lines2.join('\n')
        break
      case 'quote':
        if (selectedText) {
          newText = content.substring(0, start) + `> ${selectedText}` + content.substring(end)
        } else {
          newText = content.substring(0, start) + '> Quote text' + content.substring(end)
        }
        break
    }

    // Add to history
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(newText)
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
    
    onChange(newText)
    
    // Restore cursor position
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + (command === 'bold' ? 2 : command === 'italic' ? 1 : 0), end + (command === 'bold' ? 2 : command === 'italic' ? 1 : 0))
    }, 0)
  }

  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      onChange(history[newIndex])
    }
  }

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1
      setHistoryIndex(newIndex)
      onChange(history[newIndex])
    }
  }

  return (
    <div className="border rounded-lg">
      {/* Toolbar */}
      <div className="border-b p-2 flex flex-wrap gap-1 bg-gray-50">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => executeCommand('bold')}
          className="h-8 w-8 p-0"
        >
          <Bold className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => executeCommand('italic')}
          className="h-8 w-8 p-0"
        >
          <Italic className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        <Button
          variant="ghost"
          size="sm"
          onClick={() => executeCommand('list')}
          className="h-8 w-8 p-0"
        >
          <List className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => executeCommand('orderedList')}
          className="h-8 w-8 p-0"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => executeCommand('quote')}
          className="h-8 w-8 p-0"
        >
          <Quote className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        <Button
          variant="ghost"
          size="sm"
          onClick={undo}
          disabled={historyIndex <= 0}
          className="h-8 w-8 p-0"
        >
          <Undo className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={redo}
          disabled={historyIndex >= history.length - 1}
          className="h-8 w-8 p-0"
        >
          <Redo className="h-4 w-4" />
        </Button>
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full min-h-[200px] p-4 border-0 resize-none focus:outline-none"
        style={{ fontFamily: 'inherit' }}
      />
      
      {/* Help text */}
      <div className="border-t p-2 bg-gray-50 text-xs text-gray-600">
        Use **bold**, *italic*, - for lists, 1. for numbered lists, {'>'} for quotes
      </div>
    </div>
  )
}
