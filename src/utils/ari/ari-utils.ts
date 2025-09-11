import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as querystring from 'querystring';
import WebSocket from 'ws';

interface AriOpts {
  url: string; // e.g. http://127.0.0.1:8088/ari
  username: string;
  password: string;
  app: string; // e.g. 'dialer-app'
}


export type AriEventHandler = (event: any) => void;


@Injectable()
export class AriClient implements OnModuleInit {
  private readonly log = new Logger(AriClient.name);
  private opts!: AriOpts;
  private ws?: WebSocket;
  private handlers: AriEventHandler[] = [];


  onModuleInit() {
    this.opts = {
      url: process.env.ARI_URL || 'http://127.0.0.1:8088/ari',
      username: process.env.ARI_USERNAME || 'asterisk',
      password: process.env.ARI_PASSWORD || 'asterisk',
      app: process.env.ARI_APP || 'dialer-app',
    };
    this.connect();
  }


  private connect() {
    const qs = querystring.stringify({ api_key: `${this.opts.username}:${this.opts.password}`, app: this.opts.app });
    const wsUrl = this.opts.url.replace(/^http/, 'ws') + '/events?' + qs;
    this.ws = new WebSocket(wsUrl);
    this.ws.on('open', () => this.log.log('ARI WS connected'));
    this.ws.on('message', (msg: WebSocket.RawData) => {
      try { const ev = JSON.parse(msg.toString()); this.handlers.forEach(h => h(ev)); }
      catch (e) { this.log.error('Bad ARI message', e as any); }
    });
    this.ws.on('close', () => { this.log.warn('ARI WS closed, reconnecting in 2s'); setTimeout(() => this.connect(), 2000); });
    this.ws.on('error', (e) => this.log.error('ARI WS error', e as any));
  }


  onEvent(handler: AriEventHandler) { this.handlers.push(handler); }


  // Minimal ARI REST helpers using fetch
  private async ariFetch(path: string, init?: RequestInit) {
    const url = `${this.opts.url}${path}`;
    const headers = new Headers(init?.headers);
    const auth = Buffer.from(`${this.opts.username}:${this.opts.password}`).toString('base64');
    headers.set('Authorization', `Basic ${auth}`);
    return fetch(url, { ...init, headers });
  }


  async originateToEndpoint(endpoint: string, variables: Record<string, string> = {}, callerId?: string) {

    const params = new URLSearchParams({
      endpoint,
      app: this.opts.app,
      ...Object.fromEntries(
        Object.entries(variables ?? {}).map(([k, v]) => [k, String(v)])
      ),
      ...(callerId ? { callerId } : {}), // only include if defined
    });

    const res = await this.ariFetch(`/channels?${params.toString()}`, { method: 'POST' });
    if (!res.ok) throw new Error(`ARI originate failed: ${res.status}`);
  }


  async createBridge(type: 'mixing' | 'holding' = 'mixing') {
    const res = await this.ariFetch(`/bridges`, { method: 'POST', body: new URLSearchParams({ type }) });
    if (!res.ok) throw new Error('createBridge failed');
    return (await res.json()).id as string;
  }


  async addChannelsToBridge(bridgeId: string, channels: string[]) {
    const params = new URLSearchParams({ channel: channels.join(',') });
    const res = await this.ariFetch(`/bridges/${bridgeId}/addChannel?${params.toString()}`, { method: 'POST' });
    if (!res.ok) throw new Error('addChannel failed');
  }


  async ringAndAnswerAgent(agentEndpoint: string, vars: Record<string, string>, timeoutSec: number) {
    await this.originateToEndpoint(agentEndpoint, vars);
    // ARI will emit events; DialerService should match and bridge on answer.
  }


  async hangupChannel(channelId: string) {
    await this.ariFetch(`/channels/${channelId}`, { method: 'DELETE' });
  }
}
