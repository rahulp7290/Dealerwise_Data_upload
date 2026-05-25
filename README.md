# Dealer File Manager

A production-ready full-stack admin dashboard for managing fixed monthly dealer file links. Admins can upload the latest dealer files as PDFs or images, and the backend stores them in Supabase Storage while keeping the public download URL unchanged for WhatsApp automations and templates.

## Stack

- Frontend: React + Vite
- Backend: Node.js + Express
- Storage: Supabase Storage

## Project Structure

```text
dealer-file-manager/
  backend/
  frontend/
  package.json
```

## Features

- Password-protected admin login and upload flow
- Four fixed file slots:
  - Price List
  - Scheme
  - Product Catalog
  - Product Details
- Accepts PDF, JPG, JPEG, PNG, and WEBP files up to 20 MB
- Stable backend download links that stay the same after every upload
- Files are stored in Supabase, so your laptop does not need to stay on
- Direct-download behavior from the public link
- Responsive dashboard with loading and alert states

## Local Development

### 1. Install dependencies

```bash
npm run install:all
```

### 2. Configure environment variables

Create the backend env file from [backend/.env.example](C:/Users/acer1/Documents/Codex/2026-05-24/build-a-full-stack-dealer-file-2/backend/.env.example) and the frontend env file from [frontend/.env.example](C:/Users/acer1/Documents/Codex/2026-05-24/build-a-full-stack-dealer-file-2/frontend/.env.example).

Backend variables:

- `PORT`
- `ADMIN_PASSWORD`
- `PUBLIC_BASE_URL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_BUCKET`

Frontend variables:

- `VITE_API_URL`

### 3. Run the backend

```bash
npm run dev:backend
```

### 4. Run the frontend

```bash
npm run dev:frontend
```

## Supabase Setup

1. Create a Supabase project.
2. Open `Storage`.
3. Create a bucket named `dealer-files`, or use any bucket name and set `SUPABASE_BUCKET` to match.
4. Keep the bucket private or public. This app downloads files through the backend using the service role key, so the fixed public app links still work either way.
5. Copy your project URL and service role key into [backend/.env](C:/Users/acer1/Documents/Codex/2026-05-24/build-a-full-stack-dealer-file-2/backend/.env).

## API

### `GET /api/files`

Returns the fixed direct-download URLs:

```json
{
  "pricelist": "http://localhost:5000/api/download/pricelist",
  "scheme": "http://localhost:5000/api/download/scheme",
  "catalog": "http://localhost:5000/api/download/catalog",
  "productdetails": "http://localhost:5000/api/download/productdetails"
}
```

### `POST /api/upload/:type`

Accepted `:type` values:

- `pricelist`
- `scheme`
- `catalog`
- `productdetails`

Request:

- `multipart/form-data`
- field name: `file`
- text field: `password`
- accepted file types: PDF, JPG, JPEG, PNG, WEBP

Response:

```json
{
  "message": "File updated successfully",
  "url": "http://localhost:5000/api/download/pricelist"
}
```

### `GET /api/download/:type`

Downloads the latest uploaded file for the selected type with a fixed link. The backend sends `Content-Disposition: attachment`, so the file downloads directly from the link.

## Deployment

## Backend on Render

1. Create a new Web Service on Render and connect the repository.
2. Set the root directory to `backend`.
3. Use:
   - Build command: `npm install`
   - Start command: `npm start`
4. Add environment variables from [backend/.env.example](C:/Users/acer1/Documents/Codex/2026-05-24/build-a-full-stack-dealer-file-2/backend/.env.example).
5. Set `PUBLIC_BASE_URL` to your deployed backend URL, for example `https://dealer-file-manager-api.onrender.com`.
6. Deploy the backend.

## Frontend on Vercel

1. Create a new Vercel project and connect the repository.
2. Set the root directory to `frontend`.
3. Framework preset: `Vite`.
4. Build command: `npm run build`
5. Output directory: `dist`
6. Add `VITE_API_URL` pointing to your Render backend URL, for example:

```bash
VITE_API_URL=https://dealer-file-manager-api.onrender.com
```

7. Deploy the frontend.

## Storage Notes

- Files are uploaded into fixed Supabase object paths:
  - `pricelist`
  - `scheme`
  - `catalog`
  - `product-details`
- A new upload overwrites the previous file for that slot
- The public app link stays fixed because the backend route is fixed
- The backend infers the download filename from the stored file MIME type, so PDF and image downloads both work

## References

- Supabase public bucket and URL behavior: [Storage Buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals)
- Supabase download behavior and `?download` support: [Serving assets from Storage](https://supabase.com/docs/guides/storage/serving/downloads)
