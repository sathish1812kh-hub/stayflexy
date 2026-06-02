import { TemplateRenderer } from '../../templates/TemplateRenderer'

describe('TemplateRenderer', () => {
  let renderer: TemplateRenderer

  beforeEach(() => {
    renderer = new TemplateRenderer()
  })

  it('renders template with variables correctly', () => {
    const template = 'Hello {{name}}, your booking at {{hotel}} is confirmed.'
    const result = renderer.render(template, { name: 'Alice', hotel: 'Grand Plaza' })
    expect(result).toBe('Hello Alice, your booking at Grand Plaza is confirmed.')
  })

  it('leaves unreplaced placeholder if variable is missing', () => {
    const template = 'Hello {{name}}, room {{roomNumber}} is ready.'
    const result = renderer.render(template, { name: 'Bob' })
    // roomNumber is missing — should remain as {{roomNumber}}
    expect(result).toBe('Hello Bob, room {{roomNumber}} is ready.')
  })

  it('renders subject template correctly', () => {
    const body = 'Your reservation {{id}} is confirmed.'
    const subject = 'Reservation {{id}} — {{hotel}}'
    const vars = { id: 'RES-123', hotel: 'Ocean View' }
    const result = renderer.renderNotification(body, subject, vars)
    expect(result.subject).toBe('Reservation RES-123 — Ocean View')
    expect(result.body).toBe('Your reservation RES-123 is confirmed.')
  })

  it('returns null subject when subjectTemplate is null', () => {
    const result = renderer.renderNotification('Body text', null, {})
    expect(result.subject).toBeNull()
    expect(result.body).toBe('Body text')
  })

  it('validateVariables returns names of missing variables', () => {
    const template = 'Dear {{firstName}} {{lastName}}, check in on {{checkIn}}.'
    const provided = { firstName: 'Jane' }
    const missing = renderer.validateVariables(template, provided)
    expect(missing).toContain('lastName')
    expect(missing).toContain('checkIn')
    expect(missing).not.toContain('firstName')
  })

  it('handles empty variables record without crashing', () => {
    const template = 'Static message with no placeholders.'
    const result = renderer.render(template, {})
    expect(result).toBe('Static message with no placeholders.')
  })
})
