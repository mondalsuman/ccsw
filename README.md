# ccsw

A CLI tool to manage GLM API keys and configure VS Code settings for Anthropic support via GLM.

## Installation

To install the tool globally from the source code:

1. Clone or navigate to this repository.
2. Run `npm link` to make the `ccsw` command available globally.

```bash
cd /path/to/ccsw
npm install
npm link
```

## Usage

### 1. Set GLM API Key (One-time setup)

Store your GLM API key securely on your local machine. This key is stored globally in `~/.ccsw/config.json`.

```bash
ccsw set-glm-key YOUR_GLM_API_KEY
```

### 2. Enable GLM in a Project

Navigate to any project directory where you want to enable GLM settings.

```bash
cd /path/to/your/project
ccsw glm-on
```

This command will:
- Create a `.claude/settings.json` file in your project folder with the necessary environment variables.
- Add `.claude/settings.json` to your `.gitignore` file to prevent committing secrets.

### 3. Disable GLM in a Project

To remove the GLM settings from your current project:

```bash
ccsw glm-off
```

This command will:
- Remove the GLM-related environment variables from `.claude/settings.json`.
- Delete `.claude/settings.json` if it becomes empty.

## Configuration Details

- **Global Config**: `~/.ccsw/config.json` stores your API key.
- **Local Config**: `.claude/settings.json` is created in your project root to configure the VS Code extension.
