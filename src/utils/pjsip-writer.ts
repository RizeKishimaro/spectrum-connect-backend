import { appendFile } from 'fs/promises';
import { exec } from 'child_process';
import * as path from 'path';
import { readFile, readFileSync, writeFile, writeFileSync } from 'fs';

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

export async function deleteAgentFromPJSIP(sipUname?: string) {
  try {
    // const content = readFileSync(CONFIG_PATH, 'utf-8');

    // const blockRegex = new RegExp(
    //   `(\\n|\\r|\\r\\n)?\\[${sipUname}\\][\\s\\S]*?(?=\\n\\[|\\r\\n\\[|$)|` +
    //   `(\\n|\\r|\\r\\n)?\\[${sipUname}-auth\\][\\s\\S]*?(?=\\n\\[|\\r\\n\\[|$)`,
    //   'g'
    // );

    // const newContent = content.replace(blockRegex, '');

    // writeFileSync(CONFIG_PATH, newContent.trim() + '\n', 'utf-8');

    exec('asterisk -rx "pjsip reload"', (err, stdout, stderr) => {
      if (err) {
        console.error('❌ Failed to reload Asterisk PJSIP:', err);
      } else {
        console.log('💫 Asterisk PJSIP reloaded after delete:\n', stdout);
      }
    });
  } catch (err) {
    console.error('💥 Error while deleting agent from pjsip.conf:', err);
  }
}
