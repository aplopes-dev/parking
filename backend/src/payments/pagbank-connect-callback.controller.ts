import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { PagbankConnectService } from './pagbank-connect.service';

@ApiTags('payments-pagbank-connect')
@Controller('payments/pagbank/connect')
export class PagbankConnectCallbackController {
  constructor(private readonly connect: PagbankConnectService) {}

  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    if (error || !code) {
      res.status(400).send(this.htmlPage('Autorização cancelada ou inválida.', false));
      return;
    }

    try {
      const result = await this.connect.handleOAuthCallback(code, state);
      res.send(
        this.htmlPage(
          `Conta PagBank conectada com sucesso (${result.pagbankAccountId ?? result.accountId}). Você pode fechar esta janela.`,
          true,
        ),
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao conectar conta';
      res.status(400).send(this.htmlPage(msg, false));
    }
  }

  private htmlPage(message: string, ok: boolean): string {
    const color = ok ? '#066b57' : '#b42318';
    return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"/><title>PagBank Connect</title></head>
<body style="font-family:system-ui;padding:2rem;max-width:32rem;margin:auto;color:${color}">
<h1>PagBank Connect</h1><p>${message}</p></body></html>`;
  }
}
