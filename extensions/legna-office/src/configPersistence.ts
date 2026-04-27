import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { CONFIG_FILE_NAME, LAYOUT_FILE_DIR } from './constants.js';

interface LegnaOfficeConfig {
  externalAssetDirectories: string[];
}

const DEFAULT_CONFIG: LegnaOfficeConfig = {
  externalAssetDirectories: [],
};

function getConfigFilePath(): string {
  return path.join(os.homedir(), LAYOUT_FILE_DIR, CONFIG_FILE_NAME);
}

export function readConfig(): LegnaOfficeConfig {
  const filePath = getConfigFilePath();
  try {
    if (!fs.existsSync(filePath)) return { ...DEFAULT_CONFIG };
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<LegnaOfficeConfig>;
    return {
      externalAssetDirectories: Array.isArray(parsed.externalAssetDirectories)
        ? parsed.externalAssetDirectories.filter((d): d is string => typeof d === 'string')
        : [],
    };
  } catch (err) {
    console.error('[LegnaCode Office] Failed to read config file:', err);
    return { ...DEFAULT_CONFIG };
  }
}

export function writeConfig(config: LegnaOfficeConfig): void {
  const filePath = getConfigFilePath();
  const dir = path.dirname(filePath);
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const json = JSON.stringify(config, null, 2);
    const tmpPath = filePath + '.tmp';
    fs.writeFileSync(tmpPath, json, 'utf-8');
    fs.renameSync(tmpPath, filePath);
  } catch (err) {
    console.error('[LegnaCode Office] Failed to write config file:', err);
  }
}
