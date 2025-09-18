// src/ari/ari.module.ts
import { Module, Global } from '@nestjs/common';
import Ari from 'ari-client';

export const ARI_CLIENT = 'ARI_CLIENT';

@Global()
@Module({
  providers: [
    {
      provide: ARI_CLIENT,
      useFactory: async () => {
        const client = await Ari.connect(
          'http://127.0.0.1:8088',
          'asterisk',
          'asterisk',
        );
        client.start(process.env.ARI_APP as string);
        return client;
      },
    },
  ],
  exports: [ARI_CLIENT],
})
export class AriModule { }

