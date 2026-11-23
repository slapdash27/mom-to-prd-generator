# AGENTS.md - MoM-to-PRD Generator Web App

## 1. Project Overview
Aplikasi web untuk mengonversi catatan rapat mentah (*Minutes of Meeting* / MoM) menjadi dokumen *Product Requirements Document* (PRD) berbahasa Indonesia yang terstruktur, komprehensif, dan siap digunakan oleh tim produk, design, maupun engineering menggunakan LLM.

## 2. Tech Stack & Architecture
- **Framework:** Next.js (App Router, TypeScript strict mode)
- **Styling & UI:** Tailwind CSS, Shadcn UI, Lucide React (icons)
- **AI Integration:** Vercel AI SDK (`ai` package dengan `useCompletion` atau `streamText`)
- **Markdown Rendering:** `react-markdown` + `remark-gfm` (untuk rendering tabel dan checklist PRD)
- **State Management:** React local state / URL state (hindari library global state yang kompleks kecuali dibutuhkan)
- **Document Export:** `docx` + `file-saver` (untuk export `.docx`) dan print stylesheet / `html2pdf.js` (untuk export `.pdf`)

## 3. Folder Structure
Patuhi struktur direktori berikut saat membuat file baru:
```text
src/
├── app/
│   ├── api/
│   │   └── generate-prd/
│   │       └── route.ts       # Endpoint streaming AI untuk konversi MoM ke PRD
│   ├── layout.tsx             # Root layout & font configuration
│   └── page.tsx               # Halaman utama (Split-screen workspace)
├── components/
│   ├── ui/                    # Komponen dasar Shadcn UI
│   ├── mom-input-panel.tsx    # Panel kiri: input teks MoM & tombol generate
│   ├── prd-preview-panel.tsx  # Panel kanan: render Markdown PRD, copy, & export
│   └── header.tsx             # Top navigation bar
├── lib/
│   ├── prompts.ts             # System prompt yang membaca prd-template.md
│   └── utils.ts               # Helper functions (cn, download markdown/docx/pdf, dll.)
├── templates/
│   └── prd-template.md        # Source of truth untuk format & struktur output PRD
└── types/
    └── prd.ts                 # Definisi TypeScript interface/type
```

## 4. Core Domain Rules (MoM to PRD Logic)
Setiap kali menyusun atau memodifikasi logika AI di `src/lib/prompts.ts` dan API route, patuhi aturan berikut:
- **Document Title & Naming:** Judul utama dokumen PRD wajib mengikuti format `# PRD - [PROJECT NAME]` dengan nama proyek/fitur dalam Bahasa Inggris yang ringkas (maksimal 4–6 kata / 1 baris), dan digunakan langsung sebagai nama file saat diekspor ke `.md`, `.docx`, maupun `.pdf`.
- **Strict Template Adherence:** Struktur output PRD WAJIB mengikuti format, urutan heading, dan tabel yang ada di `@src/templates/prd-template.md`.
- **Dynamic Template Loading:** Baca isi `@src/templates/prd-template.md` di server-side dalam `src/lib/prompts.ts` agar setiap perubahan pada file template otomatis diterapkan tanpa mengubah kode prompt.
- **Anti-Hallucination & Empty Fields:** Dilarang mengarang fitur, metrik, link, atau keputusan teknis yang tidak ada di MoM. Isi field yang kosong pada tabel *Document Information*, *Impacted Systems*, *Rollout*, dan *References* dengan tanda `-`. Set *Status* default menjadi `Draft`.
- **User Story & ID Sequencing:** Pada Section 03 (*Requirements & Expected Behavior*), buat sub-section terpisah per User Story dengan format wajib: *"Sebagai [jenis user], saya ingin [kebutuhan], sehingga [manfaat yang ingin dicapai]"*. Penomoran ID (`FR-01`, `FR-02`, dst.) harus berurutan secara global dari atas ke bawah lintas tabel User Story.
- **Open Questions:** Ekstrak semua diskusi dari MoM yang masih ambigu, belum diputuskan, atau butuh tindak lanjut ke dalam tabel *Hal yang Perlu Dikonfirmasi* pada Section 04 beserta dampaknya dan PIC (isi `TBD` jika PIC tidak disebut di MoM).
- **Validation vs Acceptance Criteria:** Pada Section 04 (*Validation*), isi hanya poin verifikasi tingkat tinggi sebelum rilis (seperti UAT atau pengecekan data); jangan menyalin ulang detail *Acceptance Criteria* dari Section 03.

## 5. Coding Standards & Conventions
- **TypeScript:** Dilarang keras menggunakan tipe `any`. Selalu definisikan interface atau type yang eksplisit.
- **Components:** Gunakan Server Components secara default. Tambahkan `'use client'` hanya pada komponen interaktif (seperti form input, tombol copy/download, dan hook Vercel AI SDK).
- **Error Handling:** API route `/api/generate-prd` wajib memiliki validasi input (menolak teks kosong atau terlalu pendek) dan mengembalikan HTTP status code serta pesan error yang jelas jika API Key bermasalah atau rate limit tercapai.
- **UI/UX:** Gunakan layout *split-screen* pada desktop (kiri: Input MoM, kanan: Live Preview PRD) dan *stacked/tabbed* pada layar mobile. Pastikan proses generasi teks menggunakan *streaming* agar pengguna langsung melihat progres penulisan.

## 6. Agent Workflow & Verification Rules
Saat mengerjakan task di proyek ini, ikuti aturan berikut:
1. **Check Before Create:** Selalu periksa file yang sudah ada di `src/components/` sebelum membuat komponen baru agar tidak terjadi duplikasi.
2. **Keep Prompts Separated:** Jangan menulis *system prompt* yang panjang langsung di dalam `route.ts`. Simpan di `src/lib/prompts.ts`.
3. **Mandatory Verification:** Setelah selesai menulis atau mengubah kode, selalu jalankan `npm run typecheck` untuk memastikan tidak ada *type error* sebelum menyatakan task selesai.
4. **Environment Variables:** Jangan pernah melakukan *hardcode* API key. Gunakan `process.env.GOOGLE_GENERATIVE_AI_API_KEY` dan dokumentasikan di `.env.example`.