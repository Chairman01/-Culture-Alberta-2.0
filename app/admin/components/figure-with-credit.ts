import { Node, mergeAttributes } from '@tiptap/core'

/**
 * An in-body image that carries its own credit line.
 *
 * The plain Image extension inserts a bare <img>, so a photo credit could only
 * be typed as an ordinary paragraph underneath -- which drifts away from the
 * picture the moment anyone edits around it, and reads as body copy on the
 * published page. This binds the two together as one block: move it, delete it,
 * or drag it, and the credit goes with the photo.
 *
 * The caption is `inline*` rather than an attribute so it is edited in place,
 * where the writer can see what the credit actually says. Zero-length is legal,
 * so an uncredited image is still valid -- it just renders no caption.
 *
 * Serialises to <figure><img><figcaption>, which needs no special handling on
 * the public page: the article renderer passes both through untouched, and
 * globals.css styles the caption.
 */

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    figureWithCredit: {
      setFigureWithCredit: (options: {
        src: string
        alt?: string
        credit?: string
      }) => ReturnType
    }
  }
}

export const FigureWithCredit = Node.create({
  name: 'figureWithCredit',
  group: 'block',
  content: 'inline*',
  draggable: true,
  // Keeps editing inside the caption from merging the figure with neighbouring
  // blocks -- without it, backspacing at the start of a caption swallows the
  // image into the paragraph above.
  isolating: true,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'figure',
        // The figcaption is the node's editable content; the <img> is read off
        // into attributes rather than becoming a child node.
        contentElement: 'figcaption',
        getAttrs: (element) => {
          const img = (element as HTMLElement).querySelector('img')
          // Not our shape (a figure wrapping something else) -- let another
          // rule handle it rather than claiming it and losing the contents.
          if (!img) return false
          return {
            src: img.getAttribute('src'),
            alt: img.getAttribute('alt'),
          }
        },
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    const { src, alt, ...rest } = HTMLAttributes
    return [
      'figure',
      mergeAttributes(rest, { class: 'article-figure' }),
      ['img', { src, alt: alt ?? '', class: 'max-w-full h-auto rounded-lg' }],
      ['figcaption', { class: 'article-figure-credit' }, 0],
    ]
  },

  addCommands() {
    return {
      setFigureWithCredit:
        ({ src, alt, credit }) =>
        ({ chain }) =>
          chain()
            .insertContent({
              type: this.name,
              attrs: { src, alt: alt ?? null },
              content: credit?.trim() ? [{ type: 'text', text: credit.trim() }] : [],
            })
            .run(),
    }
  },
})
