# Weblate Programmer Guide

This describes the process of getting updated English strings into Weblate, and how to get translations back.

## Updating Weblate with new English strings

After English strings have changed or been added in code:

- Commit and push your changes to the `dev` branch
- Switch to the `weblate` branch and merge in `dev`:
  ```
  git checkout weblate
  git merge origin/dev
  git push
  ```

- Get the latest updates from Weblate first to avoid merge conflicts
	If skipped, Weblate will lock on merge conflict during Update. Resolve it using the merge URL and instructions on the Weblate error page.

- Go to Weblate repository management:

  If App/UI was changed:
  https://tools.undrr.org/weblate/projects/delta-resilience/delta-app/#repository

  If content (HIP, assets, sectors) changed:
  https://tools.undrr.org/weblate/projects/delta-resilience/delta-content/

- In Weblate, press:
  - Update
  - Commit
  - Push
  - Lock

- Back in your local repository:
  - Run [App/UI string extraction command](./app-ui/string-extraction.md)
  - For content strings (HIP, assets, sectors), run [Content string extraction command](./content/string-extraction.md)
  - Run DeepL translator: [deepl](deepl.md)
  - Commit and push to the `weblate` branch

- Back in Weblate:
  - Press Update
  - Press Unlock

## Updating dev branch with new Weblate strings

Weblate commits and pushes changes every 24 hours. To get them sooner:

- Go to Weblate repository management (links above)
- Press Commit
- Press Push

Now the `weblate` branch has the latest translations.

Merge them into `dev`:

```bash
git checkout dev
git merge origin/weblate
```
