# System Requirements

## Node.js Version

This project requires **Node.js 20 LTS (Long Term Support)**.

### Why Node 20 LTS?

- **Stability**: LTS releases receive long-term support and security updates
- **Performance**: Improved V8 engine performance
- **Compatibility**: Best balance of modern features and ecosystem support
- **Support Timeline**: Active LTS until October 2025, Maintenance until April 2026

### Installation

#### Using NVM (Recommended)

```bash
# Install Node 20 LTS
nvm install 20

# Use Node 20
nvm use 20

# Set as default
nvm alias default 20
```

#### Using Official Installer

Download from: https://nodejs.org/en/download/

Select the **LTS (Long Term Support)** version.

#### Verify Installation

```bash
node --version
# Should output: v20.x.x (where x is the latest patch version)

npm --version
# Should output: 10.x.x or higher
```

### Version Enforcement

This project uses:

- `.nvmrc` file for automatic version switching with NVM
- `package.json` engines field to enforce version requirements
- Node 20 type definitions (`@types/node@^20.17.6`)

### Compatibility

The TypeScript configuration targets ES2022, which is fully supported by Node 20:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "lib": ["ES2022"]
  }
}
```

## Other Requirements

- **npm**: 10.0.0+ (comes with Node 20)
- **TypeScript**: 5.7.3+ (installed as dev dependency)
- **tsx**: 4.20.6+ (for running TypeScript files directly)

## CI/CD Configuration

### GitHub Actions

```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm test
```

### Docker

```dockerfile
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .

CMD ["node", "index.js"]
```

## Troubleshooting

### Wrong Node Version

```bash
# Check current version
node --version

# If not 20.x.x, switch using nvm
nvm use 20

# Or install if not present
nvm install 20
```

### NVM Not Installed

```bash
# Install NVM (Unix/macOS)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install NVM (Windows)
# Use nvm-windows: https://github.com/coreybutler/nvm-windows
```

### Package Installation Fails

```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and lock file
rm -rf node_modules package-lock.json

# Reinstall with correct Node version
nvm use 20
npm install
```

## See Also

- [Node.js Release Schedule](https://nodejs.org/en/about/releases/)
- [NVM Documentation](https://github.com/nvm-sh/nvm)
- [TypeScript Compiler Options](https://www.typescriptlang.org/tsconfig)
