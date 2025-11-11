import { Injectable } from '@nestjs/common';
import { SmppProvider } from 'src/utils/providers/smpp/smpp.service';

@Injectable()
export class SmppService {
  constructor(private smppConnection: SmppProvider) { }
  sendSmppRequest(number: string, content: string) {
    // console.log(number, content)
    // const data = this.smppConnection.sendSMPPtransceiverrequest({
    //   number,
    //   content
    // });
    // return data;
  }
}
