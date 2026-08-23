"use client"

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import { TextStyle } from '@tiptap/extension-text-style'
import FontFamily from '@tiptap/extension-font-family'
import { Extension } from '@tiptap/core'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
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
import { useState, useEffect } from 'react'
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
  RotateCcw,
  AlignCenter,
  Space,
  Table as TableIcon,
  Plus,
  Minus,
  Trash2
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
      Table.configure({
        resizable: false,
        HTMLAttributes: {
          class: 'editor-table',
        },
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[300px] p-4 article-content-wrapper',
      },
    },
    immediatelyRender: false, // Fix SSR hydration mismatch
  })

  /**
   * Pull content in from the prop — but only when the writer is not typing.
   *
   * `setContent` replaces the whole document. Doing that while the editor has
   * focus throws away the selection, so the caret jumps to the top and the next
   * keystroke lands somewhere else. Repeated often enough the editor stops
   * responding to typing altogether, which is what "I can't add a space" looks
   * like from the outside.
   *
   * That was reachable because the guard compared the prop against the editor's
   * own serialisation on every change: any difference at all -- and a document
   * does not always serialise back byte-identically -- meant a full replacement
   * on a 100ms timer, keystroke after keystroke. The old "use a timeout to
   * prevent infinite loops" comment was the symptom of it.
   *
   * While the editor is focused it is the source of truth, so nothing is pulled
   * in. The prop still loads normally on mount and whenever focus is elsewhere,
   * which is the case this was written for -- opening an existing article.
   */
  useEffect(() => {
    if (!editor || !content) return
    if (editor.isFocused) return
    if (content === editor.getHTML()) return

    const timeoutId = setTimeout(() => {
      // Re-check: focus can arrive during the wait.
      if (editor.isFocused || content === editor.getHTML()) return
      editor.commands.setContent(content, { emitUpdate: false })
    }, 100)

    return () => clearTimeout(timeoutId)
  }, [content, editor])

  const handleImageSelect = (url: string) => {
    if (editor) {
      editor.chain().focus().setImage({ src: url }).run()
    }
    setShowImageUploader(false)
  }

  /**
   * Every image in the article, with wherever it sits and whatever credit it
   * carries.
   *
   * Listing them beats crediting whichever one happens to be selected: the
   * writer can fill in all of them in one pass, and — more usefully — see at a
   * glance which ones are still missing a credit, which is the actual job.
   *
   * The credit is the image's own `title` attribute, which the Image extension
   * has always had. No custom node, no schema change, and a saved article is
   * still just an <img>; the caption is built at render time.
   */
  const bodyImages: { pos: number; src: string; credit: string }[] = []
  if (editor) {
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === 'image') {
        bodyImages.push({ pos, src: node.attrs.src || '', credit: node.attrs.title || '' })
      }
    })
  }

  /**
   * Writes a credit onto one specific image, addressed by position.
   *
   * By position rather than by selection, so nothing depends on what the writer
   * happens to have clicked and editing one image can never touch another.
   */
  const setCreditAt = (pos: number, credit: string) => {
    if (!editor) return
    const trimmed = credit.trim()
    editor
      .chain()
      .command(({ tr }) => {
        const node = tr.doc.nodeAt(pos)
        if (!node || node.type.name !== 'image') return false
        tr.setNodeMarkup(pos, undefined, { ...node.attrs, title: trimmed || null })
        return true
      })
      .run()
  }

  if (!editor) {
    return (
      <div className="border rounded-lg p-4 bg-gray-50">
        <p className="text-gray-500">Loading editor...</p>
      </div>
    )
  }

  return (
    <div className="border rounded-lg">
      {/* Custom styles for better preview */}
      <style jsx>{`
        .ProseMirror {
          font-size: 18px;
        }
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
        /* Table styles */
        .ProseMirror table,
        .editor-table {
          border-collapse: collapse;
          margin: 1.5rem 0;
          width: 100%;
          overflow: hidden;
        }
        .ProseMirror table td,
        .ProseMirror table th {
          border: 2px solid #d1d5db;
          padding: 0.5rem 0.75rem;
          vertical-align: top;
          min-width: 80px;
          position: relative;
        }
        .ProseMirror table th {
          background: #f3f4f6;
          font-weight: 600;
          text-align: left;
        }
        .ProseMirror table tr:nth-child(even) td {
          background: #f9fafb;
        }
        .ProseMirror table .selectedCell:after {
          background: rgba(59, 130, 246, 0.15);
          content: "";
          left: 0; right: 0; top: 0; bottom: 0;
          pointer-events: none;
          position: absolute;
          z-index: 2;
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

        {/* Paragraph Spacing Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            // Insert a paragraph with proper spacing
            editor.chain().focus().insertContent('<p><br></p>').run()
          }}
          title="Add paragraph spacing"
        >
          <Space className="h-4 w-4" />
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

        {/* Table Buttons */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          title="Insert table"
        >
          <TableIcon className="h-4 w-4" />
        </Button>

        {editor.isActive('table') && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().addColumnAfter().run()}
              title="Add column"
            >
              <Plus className="h-3 w-3" />
              <span className="text-xs ml-0.5">Col</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().addRowAfter().run()}
              title="Add row"
            >
              <Plus className="h-3 w-3" />
              <span className="text-xs ml-0.5">Row</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().deleteColumn().run()}
              title="Delete column"
            >
              <Minus className="h-3 w-3" />
              <span className="text-xs ml-0.5">Col</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().deleteRow().run()}
              title="Delete row"
            >
              <Minus className="h-3 w-3" />
              <span className="text-xs ml-0.5">Row</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().deleteTable().run()}
              title="Delete table"
            >
              <Trash2 className="h-3 w-3 text-red-500" />
            </Button>
          </>
        )}

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

      {/* Photo credits — one row per image in the article, so they can all be
          filled in at once and the missing ones are obvious. Appears only when
          the article has images, and never gets between choosing a file and
          seeing it land. */}
      {bodyImages.length > 0 && !isPreviewMode && (
        <div className="border-t bg-gray-50 px-3 py-3">
          <p className="text-sm font-medium text-gray-700 mb-2">
            Photo credits
            <span className="ml-2 font-normal text-gray-500">
              {bodyImages.filter(i => !i.credit).length === 0
                ? 'all images credited'
                : `${bodyImages.filter(i => !i.credit).length} of ${bodyImages.length} still missing`}
            </span>
          </p>

          <div className="space-y-2">
            {bodyImages.map((image, index) => (
              <div key={`${image.pos}-${image.src}`} className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.src}
                  alt=""
                  className="h-10 w-14 shrink-0 rounded border bg-white object-cover"
                />
                <input
                  // Uncontrolled, committed on blur: a transaction per keystroke
                  // would put an undo step between every character.
                  defaultValue={image.credit}
                  onBlur={(e) => {
                    if (e.target.value.trim() !== image.credit) {
                      setCreditAt(image.pos, e.target.value)
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur() }
                  }}
                  placeholder={`Image ${index + 1} — credit, e.g. City of Edmonton`}
                  className={`flex-1 rounded-md border px-2 py-1 text-sm ${
                    image.credit ? 'border-gray-300' : 'border-amber-300 bg-amber-50'
                  }`}
                />
              </div>
            ))}
          </div>

          <p className="mt-2 text-xs text-gray-500">
            Shown as small grey text under the image on the published article. Leave blank if the
            photo is ours.
          </p>
        </div>
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
