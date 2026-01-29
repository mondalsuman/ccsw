#!/usr/bin/env node

const { Command } = require('commander');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

const program = new Command();
const CONFIG_DIR = path.join(os.homedir(), '.ccsw');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

// Helper to ensure config exists
async function ensureConfig() {
    await fs.ensureDir(CONFIG_DIR);
    if (!await fs.pathExists(CONFIG_FILE)) {
        await fs.writeJson(CONFIG_FILE, {});
    }
}

// Helper to get config
async function getConfig() {
    await ensureConfig();
    return fs.readJson(CONFIG_FILE);
}

// Helper to save config
async function saveConfig(config) {
    await ensureConfig();
    await fs.writeJson(CONFIG_FILE, config);
}

program
    .name('ccsw')
    .description('CLI to manage GLM and AWS Bedrock settings for Claude Code')
    .version('1.0.0');

program
    .command('set-glm-key')
    .argument('<key>', 'GLM API Key')
    .description('Store the GLM API key securely locally')
    .action(async (key) => {
        try {
            const config = await getConfig();
            config.glmApiKey = key;
            await saveConfig(config);
            console.log('GLM API Key stored successfully.');
        } catch (error) {
            console.error('Error storing key:', error.message);
        }
    });

program
    .command('glm-on')
    .description('Configure settings.json for GLM support')
    .action(async () => {
        try {
            const config = await getConfig();
            const apiKey = config.glmApiKey;

            if (!apiKey) {
                console.error('Error: GLM API Key not found. Please run "ccsw set-glm-key [KEY]" first.');
                process.exit(1);
            }

            const claudeDir = path.join(process.cwd(), '.claude');
            const settingsFile = path.join(claudeDir, 'settings.json');

            await fs.ensureDir(claudeDir);

            let settings = {};
            if (await fs.pathExists(settingsFile)) {
                try {
                    settings = await fs.readJson(settingsFile);
                } catch (e) {
                    // file might be empty or invalid json, start fresh or proceed with empty object
                    settings = {};
                }
            }

            // Ensure env object exists
            if (!settings.env) {
                settings.env = {};
            }

            const newSettings = {
                "ANTHROPIC_BASE_URL": "https://api.z.ai/api/anthropic",
                "ANTHROPIC_AUTH_TOKEN": apiKey,
                "API_TIMEOUT_MS": "3000000",
                "ANTHROPIC_DEFAULT_SONNET_MODEL": "glm-4.7",
                "ANTHROPIC_DEFAULT_OPUS_MODEL": "glm-4.7",
                "ANTHROPIC_DEFAULT_HAIKU_MODEL": "glm-4.5-air",
                "IS_DEMO": "true"
            };

            Object.assign(settings.env, newSettings);

            await fs.writeJson(settingsFile, settings, { spaces: 2 });
            console.log('Created/Updated .claude/settings.json');

            // Add to .gitignore
            const gitignoreFile = path.join(process.cwd(), '.gitignore');
            const gitignoreEntry = '.claude/settings.json';

            let gitignoreContent = '';
            if (await fs.pathExists(gitignoreFile)) {
                gitignoreContent = await fs.readFile(gitignoreFile, 'utf8');
            }

            if (!gitignoreContent.includes(gitignoreEntry)) {
                const separator = gitignoreContent.length > 0 && !gitignoreContent.endsWith('\n') ? '\n' : '';
                await fs.appendFile(gitignoreFile, `${separator}${gitignoreEntry}\n`);
                console.log('Added .claude/settings.json to .gitignore');
            } else {
                console.log('.claude/settings.json already in .gitignore');
            }

        } catch (error) {
            console.error('Error running glm-on:', error.message);
        }
    });

program
    .command('glm-off')
    .description('Remove GLM configuration')
    .action(async () => {
        try {
            const claudeDir = path.join(process.cwd(), '.claude');
            const settingsFile = path.join(claudeDir, 'settings.json');

            if (!await fs.pathExists(settingsFile)) {
                console.log('.claude/settings.json does not exist. Nothing to do.');
                return;
            }

            let settings = await fs.readJson(settingsFile);

            if (settings.env) {
                const keysToRemove = [
                    "ANTHROPIC_BASE_URL",
                    "ANTHROPIC_AUTH_TOKEN",
                    "API_TIMEOUT_MS",
                    "ANTHROPIC_DEFAULT_SONNET_MODEL",
                    "ANTHROPIC_DEFAULT_OPUS_MODEL",
                    "ANTHROPIC_DEFAULT_HAIKU_MODEL",
                    "IS_DEMO"
                ];

                keysToRemove.forEach(key => delete settings.env[key]);

                // Use a more robust check for empty env
                if (Object.keys(settings.env).length === 0) {
                    delete settings.env;
                }
            }

            if (Object.keys(settings).length === 0) {
                await fs.remove(settingsFile);
                console.log('Removed .claude/settings.json as it became empty.');
            } else {
                await fs.writeJson(settingsFile, settings, { spaces: 2 });
                console.log('Updated .claude/settings.json (removed GLM keys).');
            }

            // Note: We deliberately do NOT remove from .gitignore as per requirement interpretation (only mentioned removing settings.json)
            // and usually gitignore entries are safe to keep. 
            // User said: "It will remove the settings.json file from .claude folder. ... selectively only will remove the above items"
            // Did not explicitly say to remove from .gitignore. I will stick to that.

        } catch (error) {
            console.error('Error running glm-off:', error.message);
        }
    });

program
    .command('bedrock-on')
    .description('Configure settings.json for AWS Bedrock support')
    .option('-p, --profile <name>', 'AWS profile name (default: sjmbrprofile)')
    .option('-r, --region <region>', 'AWS region (default: eu-west-1)')
    .action(async (options) => {
        try {
            const claudeDir = path.join(process.cwd(), '.claude');
            const settingsFile = path.join(claudeDir, 'settings.json');

            await fs.ensureDir(claudeDir);

            let settings = {};
            if (await fs.pathExists(settingsFile)) {
                try {
                    settings = await fs.readJson(settingsFile);
                } catch (e) {
                    settings = {};
                }
            }

            if (!settings.env) {
                settings.env = {};
            }

            const newSettings = {
                "CLAUDE_CODE_USE_BEDROCK": "1",
                "AWS_PROFILE": options.profile || "sjmbrprofile",
                "AWS_REGION": options.region || "eu-west-1",
                "IS_DEMO": "true"
            };

            Object.assign(settings.env, newSettings);
            settings.model = "eu.anthropic.claude-opus-4-5-20251101-v1:0";

            await fs.writeJson(settingsFile, settings, { spaces: 2 });
            console.log('Created/Updated .claude/settings.json with Bedrock settings');

            // Add to .gitignore
            const gitignoreFile = path.join(process.cwd(), '.gitignore');
            const gitignoreEntry = '.claude/settings.json';

            let gitignoreContent = '';
            if (await fs.pathExists(gitignoreFile)) {
                gitignoreContent = await fs.readFile(gitignoreFile, 'utf8');
            }

            if (!gitignoreContent.includes(gitignoreEntry)) {
                const separator = gitignoreContent.length > 0 && !gitignoreContent.endsWith('\n') ? '\n' : '';
                await fs.appendFile(gitignoreFile, `${separator}${gitignoreEntry}\n`);
                console.log('Added .claude/settings.json to .gitignore');
            } else {
                console.log('.claude/settings.json already in .gitignore');
            }

        } catch (error) {
            console.error('Error running bedrock-on:', error.message);
        }
    });

program
    .command('bedrock-off')
    .description('Remove AWS Bedrock configuration')
    .action(async () => {
        try {
            const claudeDir = path.join(process.cwd(), '.claude');
            const settingsFile = path.join(claudeDir, 'settings.json');

            if (!await fs.pathExists(settingsFile)) {
                console.log('.claude/settings.json does not exist. Nothing to do.');
                return;
            }

            let settings = await fs.readJson(settingsFile);

            if (settings.env) {
                const keysToRemove = [
                    "CLAUDE_CODE_USE_BEDROCK",
                    "AWS_PROFILE",
                    "AWS_REGION",
                    "IS_DEMO"
                ];

                keysToRemove.forEach(key => delete settings.env[key]);

                if (Object.keys(settings.env).length === 0) {
                    delete settings.env;
                }
            }

            // Remove model setting
            delete settings.model;

            if (Object.keys(settings).length === 0) {
                await fs.remove(settingsFile);
                console.log('Removed .claude/settings.json as it became empty.');
            } else {
                await fs.writeJson(settingsFile, settings, { spaces: 2 });
                console.log('Updated .claude/settings.json (removed Bedrock keys).');
            }

        } catch (error) {
            console.error('Error running bedrock-off:', error.message);
        }
    });

program.parse();
