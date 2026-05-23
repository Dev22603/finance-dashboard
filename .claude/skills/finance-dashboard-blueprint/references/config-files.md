# Config Files

All configuration files verbatim.

---

## tsconfig.json

```json
{
    "include": ["src", "prisma", "prisma.config.ts"],
    "exclude": ["node_modules"],
    "compilerOptions": {
        "rootDir": "./",
        "outDir": "./dist",
        "target": "ES2022",
        "types": ["node"],
        "sourceMap": true,
        "strict": true,
        "skipLibCheck": true,
        "esModuleInterop": true,
        "module": "NodeNext",
        "moduleResolution": "NodeNext"
    }
}
```

**Key decisions:**
- `"rootDir": "./"` — includes `prisma/` and `prisma.config.ts` outside `src/` in compilation
- `"module"` + `"moduleResolution"`: both `"NodeNext"` — required for `.js` extension imports in ESM-compatible TypeScript
- No path aliases — all imports use relative paths (e.g. `"../lib/prisma"`)
- `"types": ["node"]` — only Node.js globals, no DOM types

---

## prisma.config.ts

```typescript
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
    schema: "prisma/schema.prisma",
    migrations: {
        seed: "tsx ./prisma/seed.ts",
    },
    datasource: {
        url: process.env["DATABASE_URL"],
    },
});
```

---

## .prettierrc

```json
{
    "tabWidth": 4,
    "useTabs": true,
    "semi": true,
    "trailingComma": "all",
    "bracketSpacing": true,
    "bracketSameLine": false,
    "arrowParens": "always",
    "printWidth": 130,
    "endOfLine": "lf"
}
```

**Key decisions:**
- Tabs (not spaces) for indentation
- `printWidth: 130` — wider than default 80
- `trailingComma: "all"` — trailing commas everywhere including function parameters
- `endOfLine: "lf"` — Unix line endings (important for cross-platform teams)

---

## .prettierignore

```
node_modules
dist
src/generated
package-lock.json
```

---

## .gitignore

```
node_modules
dist
.env
src/generated
graphify-out
```

**Note:** `src/generated/` is gitignored — the Prisma client is generated locally. Always run `npm run db:generate` after cloning.
