
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import ManagerFactory = require('asterisk-manager');


@Injectable()
export class AMIProvider implements OnModuleInit {
  private amiConnection;
  onModuleInit() {
    console.log("💖 AMIProvider instantiated ONCE uwu~");

    const port = Number(process.env.AMI_PORT || 5038);
    const host = process.env.AMI_HOST || '127.0.0.1';
    const username = process.env.AMI_USERNAME || 'admin';
    const password = process.env.AMI_SECRET || 'password';

    this.amiConnection = ManagerFactory(port, host, username, password, true);
    this.amiConnection.keepConnected();

    this.amiConnection.on('error', (err: any) => {
      console.error('AMI Error:', err);
    });

  }

  async action(action: Record<string, any>, keepAlive?: boolean): Promise<any> {
    console.log("sending action")
    return new Promise((resolve, reject) => {
      this.amiConnection.action(action, (err: any, res: any) => {
        if (err) {
          console.error('AMI Action Error:', err);
          reject(err);
        } else {
          resolve(res);
        }
      });
    });
  }

  // Add event listener 🌟
  on(eventName: string, callback: (event: any) => void) {
    this.amiConnection.on(eventName, callback);
  }

  // Remove event listener 💨
  off(eventName: string, callback: (event: any) => void) {
    this.amiConnection.removeListener(eventName, callback);
  }

  // Disconnect gracefully 💤
  async disconnect(): Promise<void> {
    if (this.amiConnection) {
      this.amiConnection.disconnect();
    }
  }

}
