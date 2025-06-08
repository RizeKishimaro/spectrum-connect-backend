
import { appendFile } from 'fs/promises';
import { exec } from 'child_process';
import { readFileSync, writeFile, writeFileSync } from 'fs';
import { AgentPJSIPDTO, PJSIPSectionDto } from './dto/pjsip/pjsip-webrtc.dto';

const CONFIG_PATH = '/etc/asterisk/pjsip-agent.conf';

function formatBlock(name: string, config: Record<string, any>): string {
  const lines = Object.entries(config)
    .filter(([key]) => key !== 'name')
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  return `\n[${name}]\n${lines}\n`;
}

function buildPJSIPBlock(dto: AgentPJSIPDTO): string {
  return (
    formatBlock(dto.endpoint.name, dto.endpoint.config) +
    formatBlock(dto.auth.name, dto.auth.config) +
    formatBlock(dto.aor.name, dto.aor.config)
  );
}

export async function writeAgentToPJSIP(dto: AgentPJSIPDTO) {
  const configBlock = buildPJSIPBlock(dto);
  await appendFile(CONFIG_PATH, configBlock, 'utf-8');
}

export async function deleteAgentFromPJSIP(agentNames: string[]) {
  try {
    const content = readFileSync(CONFIG_PATH, 'utf-8');

    const blockRegexes = agentNames.map(
      (name) =>
        new RegExp(`(\\n|\\r|\\r\\n)?\\[${name}\\][\\s\\S]*?(?=\\n\\[|\\r\\n\\[|$)`, 'g')
    );

    let newContent = content;
    for (const regex of blockRegexes) {
      newContent = newContent.replace(regex, '');
    }

    writeFileSync(CONFIG_PATH, newContent.trim() + '\n', 'utf-8');
  } catch (err) {
    console.error('💥 Error while deleting agent from pjsip.conf:', err);
  }
}

export async function writeProviderToPJSIP(config: {
  endpoint: PJSIPSectionDto;
  auth: PJSIPSectionDto;
  aor: PJSIPSectionDto;
  identify: PJSIPSectionDto;
  contact: PJSIPSectionDto;
}) {
  const confPath = '/etc/asterisk/pjsip-provider.conf';
  const sections = [config.endpoint, config.auth, config.aor, config.identify, config.contact];

  const fileContent = sections
    .map(section => {
      const lines = [`[${section.name}]`];
      for (const [key, value] of Object.entries(section.config)) {
        lines.push(`${key}=${value}`);
      }
      return lines.join('\n');
    })
    .join('\n\n');

  writeFileSync(confPath, fileContent);
}


