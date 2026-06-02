export class TemplateRenderer {
  /**
   * Interpolates {{variableName}} placeholders in a template string.
   * Unknown placeholders are left unchanged.
   */
  static render(template: string, variables: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
      return variables[key] ?? `{{${key}}}`;
    });
  }

  /**
   * Renders both subject and body from a template record.
   */
  static renderNotification(
    subjectTemplate: string | null,
    bodyTemplate: string,
    variables: Record<string, string>
  ): { subject: string | null; body: string } {
    return {
      subject: subjectTemplate
        ? TemplateRenderer.render(subjectTemplate, variables)
        : null,
      body: TemplateRenderer.render(bodyTemplate, variables),
    };
  }

  /**
   * Validates that all required variables are present.
   * Returns an array of missing variable names.
   */
  static validateVariables(
    required: string[],
    provided: Record<string, string>
  ): string[] {
    return required.filter((v) => !(v in provided));
  }
}
