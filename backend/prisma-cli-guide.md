# Prisma CLI — Hướng dẫn nhanh

Chạy các lệnh trong thư mục `dqpbp-prisma` (hoặc dùng script tương ứng trong `package.json` của backend / `dqpbp-prisma`).

**Không cần** `npm install -g prisma` — Prisma CLI đã nằm trong package `dqpbp-prisma`, backend link qua `"dqpbp-prisma": "file:../dqpbp-prisma"`.

Prisma 7 cần Node **20.19+**, **22.12+** hoặc **24+** (Node 21 không được hỗ trợ).

## Setup lần đầu (teammate clone repo)

### 1. Env cho Prisma

Copy `sample.env` → `.env` trong `backend/`. Prisma client đọc `DATABASE_URL` (hoặc bộ `DB_HOST` / `DB_USER` / `DB_NAME`).

Package `dqpbp-prisma` cũng cần `DATABASE_URL` khi chạy migrate/generate:

```bash
# dqpbp-prisma/.env
DATABASE_URL="postgresql://postgres:123456@localhost:5432/dqpbp"
```

### 2. Install + build package Prisma

```bash
cd dqpbp-prisma
npm install    # cài prisma CLI + @prisma/client (local)
npm run build    # generate client + compile dist
```

### 3. Install backend (tự link `dqpbp-prisma`)

```bash
cd ../backend
npm install    # link package dqpbp-prisma từ folder ../dqpbp-prisma
```

Backend import client qua:

```js
const { PrismaClient } = require("dqpbp-prisma");
```

**Sau khi pull** code có thay đổi `schema.prisma` hoặc `migrations/`:

```bash
cd dqpbp-prisma
npm run build
npm run db:migrate    # dev | migrate deploy trên prod
```

Hoặc từ `backend/`:

```bash
npm run prisma:build
npm run prisma:migrate
```

## Chỉnh sửa cấu trúc model

Sửa model / field / relation tại:

```
dqpbp-prisma/prisma/schema.prisma
```

Sau khi sửa:

1. `npx prisma validate` — kiểm tra schema
2. `npx prisma migrate dev --name <ten-migration>` — sinh migration + sync DB
3. `npm run build` — generate client + build package cho backend

## Lệnh thường dùng

Chạy trong `dqpbp-prisma/` (hoặc `npm run prisma:*` từ `backend/`).

### `npx prisma migrate dev --name <ten-migration>`

Sinh migration mới và đồng bộ migration tới DB (môi trường dev).

```bash
npx prisma migrate dev --name add-missing-count-difference-type-fields
```

### `npx prisma migrate deploy`

Deploy toàn bộ migrations chưa chạy lên DB (dùng cho staging/production).

```bash
npx prisma migrate deploy
```

### `npx prisma generate`

Generate Prisma Client theo cấu trúc trong `schema.prisma`.

```bash
npx prisma generate
```

Sau khi generate, project này cần build lại package:

```bash
npm run build
```

Backend mới load được client mới.

### `npx prisma db seed`

Chạy seed script (khai báo trong `package.json` → `prisma.seed`).

```bash
npx prisma db seed
```

### `npx prisma validate`

Kiểm tra `schema.prisma` có hợp lệ hay không.

```bash
npx prisma validate
```

### `npx prisma migrate reset`

Reset schema DB — **xóa toàn bộ dữ liệu**, chạy lại migrations và seed (nếu có).

```bash
npx prisma migrate reset
```

## Script trong `package.json`

### `dqpbp-prisma`

| Script | Tương đương |
|--------|-------------|
| `npm run db:generate` | `npx prisma generate` |
| `npm run db:migrate` | `npx prisma migrate dev` |
| `npm run db:push` | `npx prisma db push` |
| `npm run db:seed` | `npx prisma db seed` |
| `npm run db:studio` | `npx prisma studio` |
| `npm run build` | `prisma generate` + compile `dist` (backend dùng package này) |

### `backend`

| Script | Việc gì |
|--------|---------|
| `npm run prisma:build` | Build package `dqpbp-prisma` |
| `npm run prisma:generate` | Generate Prisma Client |
| `npm run prisma:migrate` | `prisma migrate dev` |
| `npm run prisma:push` | `prisma db push` |
| `npm run prisma:seed` | Chạy seed |
| `npm run prisma:studio` | Mở Prisma Studio |
