export class TemplateRenderer {
  render(template: string, variables: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
      return variables[key] ?? `{{${key}}}`
    })
  }

  renderNotification(
    bodyTemplate: string,
    subjectTemplate: string | null,
    variables: Record<string, string>,
  ): { body: string; subject: string | null } {
    return {
      body: this.render(bodyTemplate, variables),
      subject: subjectTemplate !== null ? this.render(subjectTemplate, variables) : null,
    }
  }

  /**
   * Returns the list of variable names that are required by the template
   * but not present in the provided variables record.
   */
  validateVariables(template: string, provided: Record<string, string>): string[] {
    const matches = [...template.matchAll(/\{\{(\w+)\}\}/g)]
    const required = matches.map((m) => m[1] ?? '').filter((v) => v.length > 0)
    return required.filter((v) => !(v in provided))
  }
}
