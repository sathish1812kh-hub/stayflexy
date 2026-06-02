import type { Logger } from '@stayflexi/shared-logger'
import { BadRequestError } from '@stayflexi/shared-errors'
import type { INotificationProvider } from './INotificationProvider'
import { EmailProvider } from './EmailProvider'
import { SmsProvider } from './SmsProvider'
import { WhatsAppProvider } from './WhatsAppProvider'
import { PushProvider } from './PushProvider'

export class ProviderFactory {
  private readonly providers: Map<string, INotificationProvider>

  constructor(logger: Logger) {
    const email = new EmailProvider(logger)
    const sms = new SmsProvider(logger)
    const whatsApp = new WhatsAppProvider(logger)
    const push = new PushProvider(logger)

    this.providers = new Map<string, INotificationProvider>([
      ['EMAIL', email],
      ['SMS', sms],
      ['WHATSAPP', whatsApp],
      ['IN_APP', push],
      ['PUSH', push],
    ])
  }

  getProvider(channelType: string): INotificationProvider {
    const provider = this.providers.get(channelType)
    if (!provider) {
      throw new BadRequestError(`Unsupported notification channel: ${channelType}`)
    }
    return provider
  }

  getSupportedChannels(): string[] {
    return [...new Set(this.providers.keys())]
  }
}
