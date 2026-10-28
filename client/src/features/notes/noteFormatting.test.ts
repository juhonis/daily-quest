import { describe, expect, it } from 'vitest'
import { applyBlockFormat, applyInlineFormat, continueMarkdownList, linePrefix } from './noteFormatting'

describe('note formatting', () => {
  it('wraps the selection and toggles an existing inline wrapper', () => {
    const bold = applyInlineFormat('hello', 0, 5, '**', '**', 'text')
    expect(bold).toEqual({ text: '**hello**', newStart: 2, newEnd: 7 })
    expect(applyInlineFormat(bold.text, bold.newStart, bold.newEnd, '**', '**', 'text')).toEqual({ text: 'hello', newStart: 0, newEnd: 5 })
    expect(applyInlineFormat('**hello**', 0, 9, '**', '**', 'text').text).toBe('hello')
  })
  it('selects a useful placeholder when there is no text selected', () => {
    expect(applyInlineFormat('', 0, 0, '`', '`', 'code')).toEqual({ text: '`code`', newStart: 1, newEnd: 5 })
  })
  it('converts bullets to sequential numbering and toggles numbered lists', () => {
    const numbered = applyBlockFormat('- One\n- Two\n- Three', 0, 20, '1. ', 'Item')
    expect(numbered.text).toBe('1. One\n2. Two\n3. Three')
    expect(applyBlockFormat(numbered.text, 0, numbered.text.length, '1. ', 'Item').text).toBe('One\nTwo\nThree')
  })
  it('does not format the following line when a selection ends at a newline', () => {
    expect(applyBlockFormat('One\nTwo', 0, 4, '- ', 'Item').text).toBe('- One\nTwo')
  })
  it('formats the first empty line without changing the next line', () => {
    expect(applyBlockFormat('\nNext', 0, 0, '## ', 'Heading').text).toBe('## Heading\nNext')
    expect(linePrefix('\n- Next', 0)).toBeNull()
  })
  it('continues numbered and indented lists and exits an empty list', () => {
    expect(continueMarkdownList('9. Item', 7, 7)?.text).toBe('9. Item\n10. ')
    expect(continueMarkdownList('  - Item', 8, 8)?.text).toBe('  - Item\n  - ')
    expect(continueMarkdownList('- ', 2, 2)).toEqual({ text: '', newStart: 0, newEnd: 0 })
  })
  it('continues quotes but leaves headings and ordinary Enter to the textarea', () => {
    expect(continueMarkdownList('> Quote', 7, 7)?.text).toBe('> Quote\n> ')
    expect(continueMarkdownList('## Heading', 10, 10)).toBeNull()
    expect(continueMarkdownList('Paragraph', 9, 9)).toBeNull()
  })
})
