export interface NotificationTemplateProps {
  id: string
  templateName: string
  templateType: string
  subjectTemplate: string | null
  bodyTemplate: string
  variables: string[]
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export class NotificationTemplate {
  constructor(private readonly props: NotificationTemplateProps) {}

  get id(): string { return this.props.id }
  get templateName(): string { return this.props.templateName }
  get templateType(): string { return this.props.templateType }
  get subjectTemplate(): string | null { return this.props.subjectTemplate }
  get bodyTemplate(): string { return this.props.bodyTemplate }
  get variables(): string[] { return this.props.variables }
  get isActive(): boolean { return this.props.isActive }
  get createdAt(): Date { return this.props.createdAt }
  get updatedAt(): Date { return this.props.updatedAt }

  toJSON(): NotificationTemplateProps {
    return { ...this.props }
  }
}
