<!--- 👇 DELETE THIS SECTION 👇 -->
# ⚠️ Attention Developers ⚠️

Template use checklist

- [ ] [Request a GitHub organisation admin](https://github.makerx.tech/) create a repository using this template on your behalf
- [ ] New repository configuration
  - [ ] Give MakerX Engineering write access under the `Manage access` in the GitHub repository `settings`
  - [ ] Check `Limit to users explicitly granted read or higher access` in `Code review limits` under `Moderation options` in the GitHub repository `settings`
  - [ ] Check  `Accept content reports from collaborators and prior contributors` in `Reported content` under `Moderation options` in the GitHub repository `settings`
  - [ ] Select `GitHub Actions` as the `Source` under `GitHub Pages` in the GitHub repository `settings`
  - [ ] Tick `Automatically delete head branches` under `General` in the GitHub repository `settings`
  - [ ] Add tags conforming to [GitBook](https://app.gitbook.com/o/-MkvllOg82Xe2JKGkOCg/s/ZaGurUq3HvXx6iRuYaUg/technical-guidance/github-enterprise)
  - [ ] If this checklist is outdated when compared to [GitBook](https://app.gitbook.com/o/-MkvllOg82Xe2JKGkOCg/s/ZaGurUq3HvXx6iRuYaUg/technical-guidance/github-enterprise), submit a PR to add/remove checklist items
- [ ] Check out the source code of your newly created repository
- [ ] Run the powershell script `name-my-package.ps1`
- [ ] Request your repository to have access to the organisation secret `NPM_TOKEN` in the slack channel #general

  ```ps1
  .\name-my-package.ps1
  or
  .\name-my-package.ps1 -PackageName "" -PackageTitle "" -PackageDescription ""
  ```
- [ ] Delete the `name-my-package.ps1` script
- [ ] Add the keywords to the package.json file
- [ ] Run `npm i` to generate a lock file
- [ ] Add/Write your package code
- [ ] Fill in the usage section of this file
- [ ] Website generator
  - [ ] Removal tasks (Optional)
    - [ ] Remove the `.github/workflows/pages.yml` file
    - [ ] Remove the `website-generator.json` file
    - [ ] Remove the support packages
      ```bash
        npm r -D @makerx/repository-website-generator typedoc typedoc-plugin-markdown http-server
      ```
    - [ ] Remove the following script entries from the package.json file:
      1. `generate-doc`
      2. `generate-website`
      3. `serve-generated-website`
  - [ ] Enable additional documentation (Optional)
    - [ ] Add folder `documentation`
    - [ ] Add markdown files and supporting images to `documentation` folder
    - [ ] Update `website-generator.json` config and replace `miscellaneousPages` with:
      ```text
      "miscellaneousPages": {
        path: "/documentation"
      },
      "assetsPath": "/documentation/assets"
      ```
  - [ ] Add any attribution references to the `website-generator.json`. [Read more](https://makerxstudio.github.io/repository-website-generator)
      ```ts
      // Reference type
      {
        group?: string
        title: string
        license: string
        description?: string
        link?: string
      }
      ```
- [ ] Remove this checklist and surrounding section
- [ ] Remove the Attribution section from this README
- [ ] I understand that the NPM package will be *PUBLIC*
- [ ] Promote 🎉 your package 🎉

⚠️ It's important to remember this repository uses [conventional commits](https://www.conventionalcommits.org/en/v1.0.0/) in combination with [semantic-release](https://github.com/semantic-release/semantic-release) to automate package publication. Therefore, your commit messages are critical, and the build process will lint them

---
<!--- 👆 DELETE THIS SECTION 👆 -->

# {{package-title}} ({{package-name}})

> {{package-description}}

[![npm package][npm-img]][npm-url]
[![Build Status][build-img]][build-url]
[![Downloads][downloads-img]][downloads-url]
[![Issues][issues-img]][issues-url]
[![Semantic Release][semantic-release-img]][semantic-release-url]

## Install

```bash
npm install {{package-name}} --save-dev
```

## Usage

** 🚨 TODO 🚨 **

_The usage section should be minimal. Enough to demo the package, but not overload the reader_


[build-img]:https://github.com/MakerXStudio/{{package-name}}/actions/workflows/release.yml/badge.svg
[build-url]:https://github.com/MakerXStudio/{{package-name}}/actions/workflows/release.yml
[downloads-img]:https://img.shields.io/npm/dt/@MakerXStudio/{{package-name}}
[downloads-url]:https://www.npmtrends.com/@makerx/{{package-name}}
[npm-img]:https://img.shields.io/npm/v/@makerx/{{package-name}}
[npm-url]:https://www.npmjs.com/package/@makerx/{{package-name}}
[issues-img]:https://img.shields.io/github/issues/MakerXStudio/{{package-name}}
[issues-url]:https://github.com/MakerXStudio/{{package-name}}/issues
[semantic-release-img]:https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg
[semantic-release-url]:https://github.com/semantic-release/semantic-release

---

**Attribution**

This template was based on the great work of [Ryan Sonshine](https://github.com/ryansonshine/typescript-npm-package-template)
