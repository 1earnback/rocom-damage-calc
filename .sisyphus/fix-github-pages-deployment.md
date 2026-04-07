# GitHub Pages部署失败修复计划

## 问题描述
GitHub Actions部署失败，错误信息："Dependencies lock file is not found"

## 根本原因
- 项目使用 `pnpm` 作为包管理器（存在 `pnpm-lock.yaml`）
- workflow配置只支持 `npm` 和 `yarn`，完全不支持 `pnpm`
- 导致Actions无法识别包管理器，无法安装依赖

## 当前配置问题

### 1. 包管理器检测逻辑（第34-50行）
```yaml
只检测 yarn.lock，默认使用 npm
❌ 不检查 pnpm-lock.yaml
❌ 不识别 pnpm
```

### 2. Node Setup步骤（第51-55行）
```yaml
cache: ${{ steps.detect-package-manager.outputs.manager }}
❌ cache 参数只支持npm/yarn
❌ 需要改为 'pnpm'
```

### 3. 缓存配置（第70行）
```yaml
key: ${{ runner.os }}-nextjs-${{ hashFiles('**/package-lock.json', '**/yarn.lock') }}-
❌ 应该包含 pnpm-lock.yaml
```

## 修复方案

### 方案1：修改workflow支持pnpm（推荐）

#### 修改步骤：

**Step 1: 在Setup Node之前添加pnpm setup**
```yaml
- name: Setup pnpm
  uses: pnpm/action-setup@v2
  with:
    version: 8
```

**Step 2: 修改Setup Node配置**
```yaml
- name: Setup Node
  uses: actions/setup-node@v4
  with:
    node-version: "20"
    cache: 'pnpm'  # 直接使用 'pnpm' 而不是检测的manager
```

**Step 3: 移除或修改Detect package manager步骤**
- 选项A：完全移除该步骤（推荐，简化配置）
- 选项B：保留步骤，修改检测逻辑支持pnpm

**Step 4: 更新缓存密钥**
```yaml
key: ${{ runner.os }}-nextjs-${{ hashFiles('**/pnpm-lock.yaml') }}-${{ hashFiles('**.[jt]s', '**.[jt]sx') }}
restore-keys: |
  ${{ runner.os }}-nextjs-${{ hashFiles('**/pnpm-lock.yaml') }}-
```

**Step 5: 更新Install dependencies步骤**
```yaml
- name: Install dependencies
  run: pnpm install  # 直接使用pnpm
```

**Step 6: 更新Build步骤**
```yaml
- name: Build with Next.js
  run: pnpm build  # 直接使用pnpm
```

### 方案2：改用npm（备选）

如果不想修改workflow：
```bash
# 在本地生成package-lock.json
rm pnpm-lock.yaml
npm install
git add package-lock.json
git commit -m "Switch to npm for GitHub Actions compatibility"
git push
```

## 推荐配置（完整workflow）

修复后的workflow应该是这样的：

```yaml
name: Deploy Next.js site to Pages

on:
  push:
    branches: ["main"]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: 'pnpm'

      - name: Setup Pages
        uses: actions/configure-pages@v5
        with:
          static_site_generator: next

      - name: Restore cache
        uses: actions/cache@v4
        with:
          path: |
            .next/cache
          key: ${{ runner.os }}-nextjs-${{ hashFiles('**/pnpm-lock.yaml') }}-${{ hashFiles('**.[jt]s', '**.[jt]sx') }}
          restore-keys: |
            ${{ runner.os }}-nextjs-${{ hashFiles('**/pnpm-lock.yaml') }}-

      - name: Install dependencies
        run: pnpm install

      - name: Build with Next.js
        run: pnpm build

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./out

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v5
```

## 验证步骤

修复后需要检查：
1. ✅ workflow成功运行
2. ✅ pnpm安装成功
3. ✅ 构建成功
4. ✅ 部署到GitHub Pages成功
5. ✅ 网站可以正常访问

## 风险评估

- **低风险**：只需修改workflow配置，不涉及代码更改
- **回退方案**：如果出现问题，可以直接回退git commit
- **测试建议**：可以先在功能分支测试，确认无误后再合并

## 下一步行动

1. 🔄 审查此计划
2. ✅ 确认修复方案
3. 📝 实施修改
4. 🔍 验证结果
