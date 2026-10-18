import Link from "next/link";
import type { ReactNode } from "react";
import { LanguageSwitcher } from "@/components/layout/Sidebar";
import { LogoMark } from "@/components/ui/icons";
import { getServerI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getServerI18n();
  return { title: t.privacy.title };
}

// Set at deploy (e.g. privasi@applytrack.my.id); until then the page says how to reach us instead.
const CONTACT_EMAIL = process.env.CONTACT_EMAIL;
const LAST_UPDATED = "2026-10-17";

type Section = { title: string; body: ReactNode };

const list = (items: ReactNode[]) => (
  <ul className="list-disc space-y-1 pl-5">
    {items.map((item, index) => (
      <li key={index}>{item}</li>
    ))}
  </ul>
);

const contact = (fallback: string) =>
  CONTACT_EMAIL ? (
    <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-primary-700 hover:underline">
      {CONTACT_EMAIL}
    </a>
  ) : (
    fallback
  );

const SECTIONS: Record<"id" | "en", Section[]> = {
  id: [
    {
      title: "Siapa kami",
      body: (
        <p>
          ApplyTrack adalah aplikasi untuk mencatat dan memantau lamaran kerja, dikelola oleh Tim ApplyTrack. Kebijakan ini
          menjelaskan data apa yang kami simpan, untuk apa, dan hak Anda atas data tersebut, sesuai Undang-Undang Nomor 27
          Tahun 2022 tentang Pelindungan Data Pribadi.
        </p>
      ),
    },
    {
      title: "Data yang kami simpan",
      body: list([
        <>
          <strong>Akun:</strong> email, nama (opsional), dan preferensi (bahasa, zona waktu, target lamaran mingguan). Kata
          sandi disimpan dalam bentuk hash, sehingga kami sendiri tidak dapat membacanya.
        </>,
        <>
          <strong>Data yang Anda masukkan:</strong> lamaran (perusahaan, posisi, deskripsi, tautan, tanggal, status, gaji,
          lokasi, sumber, catatan), riwayat perubahan status, dan interview (jadwal, jenis, lokasi atau tautan rapat, nama
          pewawancara, catatan persiapan, hasil, dan evaluasi).
        </>,
        <>
          <strong>Email yang Anda teruskan</strong> (hanya jika Anda mengaktifkan impor otomatis): isi email dibaca untuk
          mengenali lamaran, tetapi <strong>tidak disimpan</strong>. Yang kami simpan hanya pengirim, subjek, ID pesan, waktu
          diterima, dan hasil impornya.
        </>,
        <>
          <strong>Data teknis:</strong> cookie untuk menjaga Anda tetap masuk dan mengingat bahasa pilihan Anda. Alamat IP
          dipakai sementara (beberapa menit) untuk membatasi percobaan masuk yang berlebihan. Penyedia hosting dapat mencatat
          log teknis standar, seperti alamat IP dan waktu akses, untuk keamanan.
        </>,
      ]),
    },
    {
      title: "Untuk apa data digunakan",
      body: (
        <>
          {list([
            "Menjalankan fitur ApplyTrack: menampilkan lamaran, kalender interview, dan analitik Anda.",
            "Menjaga keamanan akun, misalnya memverifikasi saat Anda masuk dan mengirim email atur ulang kata sandi.",
            "Mengimpor lamaran dari email yang Anda teruskan.",
          ])}
          <p className="mt-3">
            Kami <strong>tidak</strong> menjual data Anda, tidak menampilkan iklan, dan tidak memakai pelacak atau analitik
            pihak ketiga. Data hanya diserahkan kepada pihak lain jika diwajibkan oleh hukum.
          </p>
        </>
      ),
    },
    {
      title: "Dasar pemrosesan",
      body: (
        <p>
          Kami memproses data atas persetujuan yang Anda berikan saat membuat akun, dan untuk menjalankan layanan yang Anda
          minta. Anda dapat menarik persetujuan kapan saja dengan menghapus akun.
        </p>
      ),
    },
    {
      title: "Pihak yang membantu kami",
      body: (
        <>
          {list([
            "Penyedia hosting server dan database, tempat aplikasi dan data Anda disimpan.",
            "Resend, untuk mengirim email atur ulang kata sandi.",
            "Cloudflare, untuk mengelola domain dan menerima email yang Anda teruskan.",
          ])}
          <p className="mt-3">
            Server penyedia tersebut dapat berada di luar Indonesia. Kami hanya memakai penyedia dengan standar keamanan yang
            memadai, dan mereka hanya memproses data untuk menjalankan layanan ApplyTrack.
          </p>
        </>
      ),
    },
    {
      title: "Keamanan",
      body: (
        <p>
          Koneksi ke ApplyTrack dienkripsi (HTTPS), kata sandi disimpan dalam bentuk hash, setiap pengguna hanya dapat melihat
          datanya sendiri, dan percobaan masuk dibatasi. Tidak ada sistem yang sepenuhnya kebal. Jika terjadi kegagalan
          pelindungan data pribadi, kami akan memberi tahu Anda paling lambat 3 x 24 jam sesuai UU PDP.
        </p>
      ),
    },
    {
      title: "Berapa lama data disimpan",
      body: (
        <p>
          Data disimpan selama akun Anda aktif. Saat Anda menghapus akun, seluruh data langsung dihapus dari database. Salinan
          cadangan otomatis, jika ada, ikut terhapus mengikuti siklus pencadangan, paling lama 30 hari.
        </p>
      ),
    },
    {
      title: "Hak Anda",
      body: list([
        "Melihat dan memperbaiki data Anda kapan saja langsung di aplikasi.",
        <>
          Menghapus akun beserta seluruh data melalui <strong>Pengaturan → Hapus akun</strong>.
        </>,
        "Berhenti meneruskan email kapan saja dengan menghapus filter penerusan di Gmail Anda.",
        "Meminta salinan data Anda atau mengajukan pertanyaan dan keberatan melalui kontak di bawah.",
      ]),
    },
    {
      title: "Pengguna di bawah umur",
      body: <p>ApplyTrack ditujukan bagi pengguna berusia 18 tahun ke atas.</p>,
    },
    {
      title: "Perubahan kebijakan",
      body: (
        <p>
          Jika kebijakan ini berubah, kami akan memperbarui tanggal di atas dan memberi tahu Anda melalui aplikasi atau email
          untuk perubahan yang penting.
        </p>
      ),
    },
    {
      title: "Kontak",
      body: (
        <p>
          Pertanyaan atau permintaan terkait data pribadi:{" "}
          {contact("alamat email akan diumumkan di halaman ini sebelum ApplyTrack dibuka untuk umum.")}
        </p>
      ),
    },
  ],
  en: [
    {
      title: "Who we are",
      body: (
        <p>
          ApplyTrack is an app for recording and tracking job applications, run by the ApplyTrack Team. This policy explains
          what data we keep, why, and your rights over it, in line with Indonesia&apos;s Personal Data Protection Law (Law No.
          27 of 2022).
        </p>
      ),
    },
    {
      title: "What we keep",
      body: list([
        <>
          <strong>Account:</strong> email, name (optional), and preferences (language, time zone, weekly application goal).
          Passwords are stored as a hash, so even we can&apos;t read them.
        </>,
        <>
          <strong>What you enter:</strong> applications (company, role, description, link, dates, status, salary, location,
          source, notes), status history, and interviews (schedule, type, location or meeting link, interviewer name,
          preparation notes, outcome, and reflections).
        </>,
        <>
          <strong>Emails you forward</strong> (only if you turn on automatic import): the email is read to recognise the
          application but <strong>not stored</strong>. We keep only the sender, subject, message ID, time received, and the
          import result.
        </>,
        <>
          <strong>Technical data:</strong> cookies that keep you signed in and remember your language. Your IP address is used
          briefly (a few minutes) to limit excessive sign-in attempts. Hosting providers may keep standard technical logs,
          such as IP addresses and access times, for security.
        </>,
      ]),
    },
    {
      title: "How we use it",
      body: (
        <>
          {list([
            "To run ApplyTrack: showing your applications, interview calendar, and analytics.",
            "To keep your account secure, such as checking your sign-in and sending password reset emails.",
            "To import applications from the emails you forward.",
          ])}
          <p className="mt-3">
            We do <strong>not</strong> sell your data, show ads, or use third-party trackers or analytics. Data is only shared
            when the law requires it.
          </p>
        </>
      ),
    },
    {
      title: "Legal basis",
      body: (
        <p>
          We process your data with the consent you give when creating an account, and to provide the service you ask for. You
          can withdraw consent at any time by deleting your account.
        </p>
      ),
    },
    {
      title: "Who helps us",
      body: (
        <>
          {list([
            "Our server and database hosting provider, where the app and your data are stored.",
            "Resend, to send password reset emails.",
            "Cloudflare, to manage our domain and receive the emails you forward.",
          ])}
          <p className="mt-3">
            These providers&apos; servers may be outside Indonesia. We only use providers with adequate security standards, and
            they only process data to run ApplyTrack.
          </p>
        </>
      ),
    },
    {
      title: "Security",
      body: (
        <p>
          Connections to ApplyTrack are encrypted (HTTPS), passwords are stored as a hash, each user can only see their own
          data, and sign-in attempts are limited. No system is fully immune. If a personal data breach happens, we will notify
          you within 3 x 24 hours, as the law requires.
        </p>
      ),
    },
    {
      title: "How long we keep it",
      body: (
        <p>
          We keep your data while your account is active. When you delete your account, all of it is removed from the database
          right away. Automatic backups, if any, are cleared on the backup cycle, within 30 days at most.
        </p>
      ),
    },
    {
      title: "Your rights",
      body: list([
        "See and correct your data at any time in the app.",
        <>
          Delete your account and all its data under <strong>Settings → Delete account</strong>.
        </>,
        "Stop forwarding emails at any time by removing the forwarding filter in your Gmail.",
        "Ask for a copy of your data, or send questions and objections, through the contact below.",
      ]),
    },
    {
      title: "Minors",
      body: <p>ApplyTrack is meant for users aged 18 and over.</p>,
    },
    {
      title: "Changes",
      body: (
        <p>
          If this policy changes, we will update the date above and, for important changes, let you know in the app or by
          email.
        </p>
      ),
    },
    {
      title: "Contact",
      body: (
        <p>
          Questions or requests about your personal data:{" "}
          {contact("the email address will be published on this page before ApplyTrack opens to the public.")}
        </p>
      ),
    },
  ],
};

/** Public: readable signed in or out, linked from sign-up, the sign-in pages, and Settings. */
export default async function PrivacyPage() {
  const { t, f, locale } = await getServerI18n();
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5">
          <LogoMark className="size-8 text-primary-600" />
          <span className="text-lg font-semibold tracking-tight text-ink">ApplyTrack</span>
        </Link>
        <div className="w-40">
          <LanguageSwitcher />
        </div>
      </div>
      <article className="rounded-2xl border border-line bg-surface p-6 text-sm leading-relaxed text-ink-muted shadow-card sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{t.privacy.title}</h1>
        <p className="mt-1 text-xs text-ink-subtle">{t.privacy.lastUpdated(f.date(LAST_UPDATED))}</p>
        <div className="mt-6 space-y-6">
          {SECTIONS[locale].map((section) => (
            <section key={section.title}>
              <h2 className="mb-2 text-base font-semibold text-ink">{section.title}</h2>
              {section.body}
            </section>
          ))}
        </div>
      </article>
    </main>
  );
}
