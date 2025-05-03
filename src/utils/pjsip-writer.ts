import { appendFile } from 'fs/promises';
import { exec } from 'child_process';
import * as path from 'path';

const CONFIG_PATH = '/etc/asterisk/pjsip.conf';

export async function writeAgentToPJSIP(agent: {
  sipUname: string;
  sipPassword: string;
}) {
  const { sipUname, sipPassword } = agent;

  const configBlock = `

[${sipUname}]
type=endpoint
transport=transport-ws
context=outbound
disallow=all
allow=ulaw,alaw
auth=${sipUname}-auth
aors=${sipUname}
webrtc=yes

[${sipUname}-auth]
type=auth
auth_type=userpass
username=${sipUname}
password=${sipPassword}

[${sipUname}]
type=aor
max_contacts=1
`;

  await appendFile(CONFIG_PATH, configBlock, 'utf-8');

  exec('asterisk -rx "pjsip reload"', (err, stdout, stderr) => {
    if (err) throw new Error(err.message || "Unknown Error")
    else console.log('💫 Asterisk PJSIP reloaded:\n', stdout);
  });
}

