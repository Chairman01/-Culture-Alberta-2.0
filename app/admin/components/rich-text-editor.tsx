"use client"

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import { TextStyle } from '@tiptap/extension-text-style'
import FontFamily from '@tiptap/extension-font-family'
import { Extension } from '@tiptap/core'
import { Button } from "@/components/ui/button"

// Custom FontSize extension
const FontSize = Extension.create({
  name: 'fontSize',

  addOptions() {
    return {
      types: ['textStyle'],
    }
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: element => element.style.fontSize.replace(/['"]+/g, ''),
            renderHTML: attributes => {
              if (!attributes.fontSize) {
                return {}
              }
              return {
                style: `font-size: ${attributes.fontSize}`,
              }
            },
          },
        },
      },
    ]
  },

  addCommands() {
    return {
      setFontSize: size => ({ chain }) => {
        return chain()
          .setMark('textStyle', { fontSize: size })
          .run()
      },
      unsetFontSize: () => ({ chain }) => {
        return chain()
          .setMark('textStyle', { fontSize: null })
          .removeEmptyTextStyle()
          .run()
      },
    }
  },
})
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ImageUploader } from './image-uploader'
import { useState } from 'react'
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Quote, 
  Image as ImageIcon,
  Undo,
  Redo,
  Eye,
  Edit3,
  Type,
  RotateCcw
} from 'lucide-react'

interface RichTextEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
}

export function RichTextEditor({ content, onChange, placeholder = "Write your article content here..." }: RichTextEditorProps) {
  const [showImageUploader, setShowImageUploader] = useState(false)
  const [isPreviewMode, setIsPreviewMode] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      FontFamily.configure({
        types: ['textStyle'],
      }),
      FontSize,
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg my-4',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[300px] p-4',
      },
    },
    immediatelyRender: false, // Fix SSR hydration mismatch
  })

  const handleImageSelect = (url: string) => {
    if (editor) {
      editor.chain().focus().setImage({ src: url }).run()
    }
    setShowImageUploader(false)
  }

  if (!editor) {
    return null
  }

  return (
    <div className="border rounded-lg">
      {/* Custom styles for better preview */}
      <style jsx>{`
        .ProseMirror ul {
          list-style: none;
          margin: 1rem 0;
          padding: 0;
        }
        .ProseMirror ol {
          list-style: none;
          margin: 1rem 0;
          padding: 0;
        }
        .ProseMirror h1, .ProseMirror h2, .ProseMirror h3, .ProseMirror h4 {
          font-weight: 600;
          color: #111827;
          margin: 1.5rem 0 0.5rem 0;
        }
        .ProseMirror h1 { font-size: 1.875rem; }
        .ProseMirror h2 { font-size: 1.5rem; }
        .ProseMirror h3 { font-size: 1.25rem; }
        .ProseMirror h4 { font-size: 1.125rem; }
        .ProseMirror li {
          display: flex;
          align-items: flex-start;
          margin: 0.5rem 0;
          color: #374151;
          line-height: 1.6;
        }
        .ProseMirror li::before {
          content: "•";
          color: #3b82f6;
          margin-right: 0.5rem;
          margin-top: 0.125rem;
          flex-shrink: 0;
        }
        .ProseMirror blockquote {
          border-left: 4px solid #3b82f6;
          padding-left: 1.5rem;
          padding-top: 1rem;
          padding-bottom: 1rem;
          margin: 1.5rem 0;
          background: linear-gradient(to right, #eff6ff, #dbeafe);
          border-radius: 0 0.5rem 0.5rem 0;
          font-style: italic;
          color: #1e40af;
        }
        .ProseMirror strong {
          font-weight: 600;
          color: #111827;
        }
        .ProseMirror em {
          font-style: italic;
          color: #1f2937;
        }
        .ProseMirror p {
          margin: 1rem 0;
          line-height: 1.7;
          color: #374151;
        }
        .ProseMirror img {
          border-radius: 0.5rem;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
          margin: 2rem 0;
          max-width: 100%;
          height: auto;
        }
        .ProseMirror span[style*="font-family"] {
          font-family: inherit;
        }
        /* Remove any conflicting font-size overrides */
        .ProseMirror span[style*="font-size"] {
          /* Let the inline style take precedence */
        }
        /* Preview mode font size preservation */
        .prose span[style*="font-size"] {
          /* Let the inline style take precedence */
        }
      `}</style>
      
      {/* Toolbar - Sticky */}
      <div className="sticky top-0 z-10 bg-white border-b p-2 flex flex-wrap gap-1 shadow-sm">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? 'bg-muted' : ''}
        >
          <Bold className="h-4 w-4" />
        </Button>
        
         <Button
           variant="ghost"
           size="sm"
           onClick={() => editor.chain().focus().toggleItalic().run()}
           className={editor.isActive('italic') ? 'bg-muted' : ''}
         >
           <Italic className="h-4 w-4" />
         </Button>

         <div className="w-px h-6 bg-border mx-1" />

         {/* Font Family Dropdown */}
         <Select onValueChange={(value) => {
           if (editor) {
             editor.chain().focus().setFontFamily(value).run()
           }
         }}>
           <SelectTrigger className="w-32 h-8 text-xs">
             <SelectValue placeholder="Font" />
           </SelectTrigger>
           <SelectContent>
             <SelectItem value="Inter, sans-serif">Inter</SelectItem>
             <SelectItem value="Georgia, serif">Georgia</SelectItem>
             <SelectItem value="Times New Roman, serif">Times</SelectItem>
             <SelectItem value="Arial, sans-serif">Arial</SelectItem>
             <SelectItem value="Helvetica, sans-serif">Helvetica</SelectItem>
             <SelectItem value="Courier New, monospace">Courier</SelectItem>
             <SelectItem value="Verdana, sans-serif">Verdana</SelectItem>
             <SelectItem value="Trebuchet MS, sans-serif">Trebuchet</SelectItem>
           </SelectContent>
         </Select>

         {/* Font Size Dropdown */}
         <Select onValueChange={(value) => {
           if (editor) {
             if (value === 'default') {
               editor.chain().focus().unsetFontSize().run()
             } else {
               editor.chain().focus().setFontSize(value).run()
             }
           }
         }}>
           <SelectTrigger className={`w-20 h-8 text-xs ${editor.getAttributes('textStyle').fontSize ? 'bg-muted' : ''}`}>
             <SelectValue placeholder="Size">
               {editor.getAttributes('textStyle').fontSize || 'Size'}
             </SelectValue>
           </SelectTrigger>
           <SelectContent>
             <SelectItem value="default">Default</SelectItem>
             <SelectItem value="12px">12px</SelectItem>
             <SelectItem value="14px">14px</SelectItem>
             <SelectItem value="16px">16px</SelectItem>
             <SelectItem value="18px">18px</SelectItem>
             <SelectItem value="20px">20px</SelectItem>
             <SelectItem value="24px">24px</SelectItem>
             <SelectItem value="28px">28px</SelectItem>
             <SelectItem value="32px">32px</SelectItem>
             <SelectItem value="36px">36px</SelectItem>
             <SelectItem value="48px">48px</SelectItem>
           </SelectContent>
         </Select>

         {/* Font Size Reset Button */}
         <Button
           variant="ghost"
           size="sm"
           onClick={() => editor.chain().focus().unsetFontSize().run()}
           className={editor.getAttributes('textStyle').fontSize ? 'bg-muted' : ''}
           title="Reset font size to default"
         >
           <RotateCcw className="h-4 w-4" />
         </Button>

         <div className="w-px h-6 bg-border mx-1" />

        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive('bulletList') ? 'bg-muted' : ''}
        >
          <List className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive('orderedList') ? 'bg-muted' : ''}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={editor.isActive('blockquote') ? 'bg-muted' : ''}
        >
          <Quote className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowImageUploader(true)}
        >
          <ImageIcon className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
        >
          <Undo className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
        >
          <Redo className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsPreviewMode(!isPreviewMode)}
          className={isPreviewMode ? 'bg-muted' : ''}
        >
          {isPreviewMode ? <Edit3 className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      </div>

      {/* Editor Content or Preview */}
      {isPreviewMode ? (
        <div 
          className="prose prose-lg max-w-none p-4 min-h-[300px]"
           dangerouslySetInnerHTML={{ 
             __html: content
               .replace(/<ul>/g, '<ul class="space-y-2 mb-6">')
               .replace(/<ol>/g, '<ol class="space-y-2 mb-6">')
               .replace(/<li>/g, '<li class="flex items-start text-gray-700 leading-relaxed"><span class="text-blue-600 mr-2 mt-1 flex-shrink-0">•</span><span class="flex-1">')
               .replace(/<\/li>/g, '</span></li>')
               .replace(/<blockquote>/g, '<blockquote class="border-l-4 border-blue-500 pl-6 py-4 my-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-r-lg">')
               .replace(/<p>/g, '<p class="mb-6 leading-relaxed text-gray-700 text-lg">')
               .replace(/<strong>/g, '<strong class="font-semibold text-gray-900">')
               .replace(/<em>/g, '<em class="italic text-gray-800">')
               .replace(/<img([^>]*)>/g, '<img$1 class="rounded-lg shadow-lg my-8 max-w-full h-auto">')
               .replace(/<span style="font-family:([^"]+)"/g, '<span style="font-family:$1"')
               .replace(/<span style="font-size:([^"]+)"/g, '<span style="font-size:$1"')
           }}
        />
      ) : (
        <EditorContent editor={editor} />
      )}

      {/* Image Uploader Modal */}
      {showImageUploader && (
        <ImageUploader 
          onSelect={handleImageSelect} 
          onClose={() => setShowImageUploader(false)} 
        />
      )}
    </div>
  )
}
