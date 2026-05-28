import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PagbankWebhooksService } from './pagbank-webhooks.service';

@ApiTags('payments-pagbank-webhooks')
@Controller('payments/pagbank/webhooks')
export class PagbankWebhooksController {
  constructor(private readonly webhooks: PagbankWebhooksService) {}

  /** Endpoint público para notificações PagBank (sem JWT). */
  @Post()
  @HttpCode(200)
  receive(@Body() body: Record<string, unknown>) {
    return this.webhooks.handleNotification(body ?? {});
  }
}
