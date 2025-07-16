
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { IVRTree } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

export interface IvrNode {
  id: string;
  name: string;
  application: string;
  parameters: Record<string, any>;
  dtmfKey?: string;
  children?: IvrNode[];
}

function formatParameters(params: Record<string, any>): string {
  return Object.values(params).join(',');
}


function validateIvrNode(node: IvrNode, isRoot = true): string[] {
  const errors: string[] = [];

  if (!node.application) {
    errors.push(`Missing application in node "${node.name}" (${node.id})`);
  }

  if (isRoot && !node.dtmfKey) {
    errors.push(`Root IVR node "${node.name}" must have a DTMF key (extension number), or Asterisk will cry! 😿`);
  }

  if (node.children?.length) {
    for (const child of node.children) {
      errors.push(...validateIvrNode(child, false));
    }
  }

  return errors;
}


// --- Parsing extensions.conf to find existing extensions and contexts ---
interface ExistingExtension {
  context: string;
  extension: string;
}

function parseExtensionsConf(filePath: string): ExistingExtension[] {
  const data = fs.readFileSync(filePath, 'utf-8');
  const lines = data.split(/\r?\n/);

  const extensions: ExistingExtension[] = [];
  let currentContext = '';

  for (const line of lines) {
    const trimmed = line.trim();

    // Match context headers like [context-name]
    const contextMatch = trimmed.match(/^\[(.+?)\]$/);
    if (contextMatch) {
      currentContext = contextMatch[1];
      continue;
    }

    // Match extension lines like: exten => 1,1,Answer()
    const extMatch = trimmed.match(/^exten\s*=>\s*([^,]+),/);
    if (extMatch && currentContext) {
      extensions.push({ context: currentContext, extension: extMatch[1] });
    }
  }

  return extensions;
}

// --- Check for duplicates and missing contexts with existing extensions.conf ---

function findConflicts(
  existing: ExistingExtension[],
  newRoot: IvrNode,
  newContext: string,
  requireExistingContext = false // 🧠 add flag!
): string[] {
  const errors: string[] = [];

  if (!newContext || newContext.trim() === '') {
    errors.push("Context name can't be empty! Please provide a valid context name!");
  }

  const existingInContext = existing.filter(e => e.context === newContext);
  const newExtensions = new Set<string>();

  function gatherNewExts(node: IvrNode) {
    if (node.dtmfKey) newExtensions.add(node.dtmfKey);
    if (node.children?.length) {
      node.children.forEach(gatherNewExts);
    }
  }
  gatherNewExts(newRoot);

  for (const ext of newExtensions) {
    if (existingInContext.some(e => e.extension === ext)) {
      errors.push(`Duplicate extension "${ext}" found in existing extensions.conf under context "${newContext}"!`);
    }
  }

  const contextExists = existing.some(e => e.context === newContext);
  if (requireExistingContext && !contextExists) {
    errors.push(`Context name "${newContext}" not found in existing extensions.conf!`);
  }

  return errors;
}
export function generateDialplan(root: IvrNode, contextName = 'ivr-main'): string {
  const errors = validateIvrNode(root, true);
  if (errors.length > 0) {
    console.error("（；へ：） Oh nooo~ Something's wrong in the IVR!");
    errors.forEach(err => console.error("❌", err));
    throw new BadRequestException(errors[0])
  }

  let dialplan = `[${contextName}]\n`;

  function processNode(node: IvrNode, useExten = false): string {
    let result = '';
    const directive = node.dtmfKey && useExten
      ? `exten => ${node.dtmfKey},1`
      : `same => n`;

    const paramStr = formatParameters(node.parameters);
    result += `${directive},${node.application}(${paramStr})\n`;

    if (node.children?.length) {
      for (const child of node.children) {
        const childUseExten = !!child.dtmfKey;
        result += processNode(child, childUseExten);
      }
    } else if (node.application !== 'Hangup') {
      result += `same => n,Hangup()\n`;
    }

    return result;
  }

  dialplan += processNode(root, true);
  return dialplan;
}

// --- Write dialplan to file ---
export function writeDialplanToFile(content: string) {
  const filePath = path.join(path.join("/etc/asterisk", "extensions_custom.conf"));
  fs.appendFileSync(filePath, '\n' + content);
  console.log(`📁 Dialplan saved to ${filePath} ~ UwU`);
}

export function saveIvrDialplan(rootIvrNode: IvrNode, contextName = 'ivr-main') {
  try {
    const extensionsConfPath = path.join("/etc", "asterisk", "extensions_custom.conf");
    const existingExts = parseExtensionsConf(extensionsConfPath);
    console.log(existingExts, extensionsConfPath)


    const conflicts = findConflicts(existingExts, rootIvrNode, contextName, false); // context may be new!

    if (conflicts.length) {
      conflicts.forEach(err => console.error("❌", err));
      throw new BadRequestException("Conflicts detected in extensions.conf! Fix them before saving, nya~!");
    }
    console.log(conflicts)

    const dialplanContent = generateDialplan(rootIvrNode, contextName);
    writeDialplanToFile(dialplanContent);

  } catch (err) {
    console.error("⚠️ Error saving IVR dialplan:", err);
    throw new InternalServerErrorException("Something went wrong while saving IVR")
  }
}
export async function deleteIVRTree(IVR: IVRTree) {

  const contextName = IVR.name;
  const filePath = path.join("/etc/asterisk/extensions_custom.conf");

  const content = fs.readFileSync(filePath, "utf-8");
  const regex = new RegExp(`\\[${contextName}\\][\\s\\S]*?(?=\\n\\[|$)`, "g");

  const newContent = content.replace(regex, '').trim();

  fs.writeFileSync(filePath, newContent + "\n");
  return {
    status: "success",
    message: `IVR "${contextName}" has been erased from time and space~ 💣🩷`,
  };
}



