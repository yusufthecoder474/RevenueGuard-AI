# Publish to yusufthecoder474/RevenueGuard-AI

The repository was not created automatically: the connected GitHub tools can modify existing repositories but do not expose repository creation. The account lookup did not find an existing RevenueGuard-AI repository. The complete source, README, banner and real screenshots are ready in this bundle.

## GitHub CLI (recommended)

Run these commands yourself in PowerShell from the extracted `RevenueGuard-AI` project folder. `gh auth login` is an official interactive GitHub authentication flow; verify the account is yusufthecoder474.

```powershell
winget install --exact --id Git.Git
winget install --exact --id GitHub.cli
```

Close and reopen PowerShell after installation, return to the project folder, then:

```powershell
gh auth login --hostname github.com --web --git-protocol https
gh api user --jq .login
# The output must be yusufthecoder474 before continuing.
git init
git branch -M main
git add .
git status --short
# Review the staged list. .dev.vars, .env, node_modules and .wrangler must be absent.
git commit -m "Build RevenueGuard AI verified reporting MVP"
gh repo create yusufthecoder474/RevenueGuard-AI --public --source . --remote origin --push --description "Source-grounded numerical validation for LLM business reports with TypeScript, Cloudflare Workers, D1 and Zod"
gh repo view --web
```

Use `--private` instead of `--public` if you prefer a private repository. Publishing source to GitHub does not deploy the application to Cloudflare.

## Browser alternative

1. Sign into GitHub as yusufthecoder474 through the official website.
2. Create a new repository named `RevenueGuard-AI`. Leave generated README/license/gitignore options unchecked because the project already includes them.
3. Extract the ZIP. Upload the **contents inside** its `RevenueGuard-AI` folder using Add file → Upload files, preserving subfolders.
4. Include `docs/banner.svg`, `docs/screenshots/`, `data/`, source and configuration files, LICENSE and the package lockfile. Include `.gitignore` and `.env.example` explicitly; some file selectors hide dotfiles. Do not upload node_modules, .wrangler, .dev.vars or any actual keys.
5. Commit and open the repository's main page. README.md displays automatically, with its relative screenshot/banner links.
