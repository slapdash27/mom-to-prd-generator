# MoM-to-PRD Generator

Aplikasi web untuk mengonversi catatan rapat (Minutes of Meeting / MoM) menjadi
Product Requirements Document (PRD) berbahasa Indonesia yang terstruktur
menggunakan Gemini.

## Fitur

- Split-screen workspace: input MoM di kiri, live preview PRD di kanan.
- Upload rekaman rapat (`.mp3`, `.m4a`, `.wav`, `.ogg`, `.webm`, maks. 25 MB)
  lewat tombol atau drag-and-drop; rekaman divalidasi sinyalnya, di-downsample
  ke mono 16 kHz, di-encode sebagai MP3 dengan bitrate adaptif hingga 48 kbps
  per ±6 menit, lalu Gemini menyusunnya menjadi MoM terstruktur di editor visual
  sebelum tombol "Buat PRD" ditekan. Progress bar menampilkan tahap kompresi,
  upload, dan penyusunan AI.
- Streaming output dari Gemini sehingga PRD langsung terlihat saat dibuat.
- Export PRD ke Markdown, DOCX, dan PDF.

## Setup lokal

1. Install dependencies:

   ```bash
   npm install
   ```

2. Salin `.env.example` menjadi `.env.local`, lalu isi variabelnya:

   ```env
    GOOGLE_GENERATIVE_AI_API_KEY=your_google_ai_studio_api_key

   ```

3. Jalankan server pengembangan:

   ```bash
   npm run dev
   ```

Buka http://localhost:3000.

## Upload rekaman rapat menjadi MoM

1. Di panel kiri, klik **Upload Rekaman Rapat** atau tarik file audio ke area
   upload. Format yang didukung: `.mp3`, `.m4a`, `.wav`, `.ogg`, `.webm`.
2. Semua file didecode di browser untuk memastikan ada sinyal suara. Audio
   dengan amplitude hening/sangat pelan ditolak sebelum dikirim. Rekaman lalu
   di-downsample ke mono 16 kHz dan di-encode menjadi beberapa potongan MP3
   dengan bitrate adaptif maksimal 48 kbps (40–48 kbps untuk rekaman pendek,
   diturunkan otomatis agar total tetap di bawah 4,2 MB; maks. ±6 menit per
   potongan). Tidak ada akselerasi playback yang membuat suara berubah nada.
3. Endpoint `/api/transcribe-mom` mengirim tiap potongan ke Gemini multimodal
   dan mencatat ukuran byte, durasi, serta indeks potongan di console server.
   MoM dari tiap potongan digabungkan menjadi satu dokumen berisi Topik Rapat,
   Poin Pembahasan Utama, Keputusan yang Disepakati, dan Action Items.
4. Hasil dimasukkan ke editor visual MoM sebagai heading dan daftar yang rapi
   (tanpa karakter Markdown mentah). Jika editor sudah berisi catatan, hasil
   ditambahkan di bawahnya, jadi tetap bisa dicek dan diedit sebelum membuat PRD.

Batas upload adalah 25 MB. Setiap potongan yang dikirim ke server dibatasi
maksimal 4 MB agar aman dari batas payload request Vercel (±4.5 MB). Jika hasil
kompresi masih terlalu besar, UI akan meminta rekaman dipotong. Progress bar
berjalan 0–45% saat mengoptimalkan audio, 45–60% saat mengunggah potongan,
60–99% saat Gemini menyusun MoM, dan 100% saat selesai. Jika Gemini tidak
mendeteksi percakapan yang dapat dipahami, endpoint mengembalikan error
`NO_SPEECH` dan UI menampilkan pesan yang jelas daripada template berisi `-`.
`/api/transcribe-mom` menggunakan `maxDuration = 60` per potongan. Model utama
mengikuti `GEMINI_MODEL` yang dipakai `/api/generate-prd` (default
`gemini-3.5-flash-lite`), bisa ditimpa dengan `TRANSCRIBE_GEMINI_MODEL`. Jika
model mengembalikan 404/model not found, endpoint otomatis mencoba
`gemini-2.5-flash` lalu `gemini-2.0-flash`. Aturan anti-halusinatif tetap
diterapkan: informasi yang tidak disebut di rekaman diisi dengan tanda `-`,
bukan dikarang.


## Prompt menjalankan proyek dengan OpenCode

Use this prompt to run the project (using open code):

1. Clone repositori dari `[LINK_GITHUB_SLAPDASH]` ke folder baru, lalu masuk ke dalam folder proyek tersebut.
2. Jalankan `npm install` untuk menginstal seluruh dependency.
3. Buatkan file `.env.local` berdasarkan `.env.example` dan isi `GOOGLE_GENERATIVE_AI_API_KEY=` dengan key berikut: `[TEMPEL_API_KEY_GEMINI_KAMU]`.
4. Baca file `AGENTS.md` dan `README.md` agar memahami seluruh aturan domain, struktur template PRD, serta arsitektur aplikasi ini.
5. Jalankan `npm run typecheck` untuk memastikan tidak ada error, lalu jalankan server development (`npm run dev`).

=========================
VALUE:
**Link Github: link repo project ini
**GOOGLE_GENERATIVE_AI_API_KEY
- Buat API KEY (gemini), akses link: https://aistudio.google.com/api-keys
-- Kalo belum ada, register dulu laa
