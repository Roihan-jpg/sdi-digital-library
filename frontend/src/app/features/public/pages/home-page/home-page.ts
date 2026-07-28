import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  Inject,
  OnDestroy,
  PLATFORM_ID,
  ViewEncapsulation,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

// Loaded globally via <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.js" defer>
// in the app's index.html — see the notes at the end of the chat reply.
declare const lucide: { createIcons: () => void } | undefined;

interface FeaturedBook {
  title: string;
  category: string;
  icon: string;
  coverGradient: string;
  status: 'available' | 'popular' | 'new' | 'borrowed';
  statusLabel: string;
  rating: string;
}

interface BookCategory {
  icon: string;
  name: string;
  count: number;
}

interface FilterChip {
  icon: string;
  label: string;
  active: boolean;
}

interface QuickResult {
  thumbGradient: string;
  title: string;
  meta: string;
  category: string;
  status: 'available' | 'popular' | 'new' | 'borrowed';
  statusLabel: string;
}

interface DigitalFeature {
  icon: string;
  title: string;
  description: string;
}

interface BorrowStep {
  icon: string;
  title: string;
  description: string;
}

interface Announcement {
  mediaGradient: string;
  day: string;
  month: string;
  title: string;
  excerpt: string;
}

interface LibraryService {
  icon: string;
  title: string;
  description: string;
}

interface Testimonial {
  quote: string;
  initials: string;
  avatarBg: string;
  avatarColor: string;
  name: string;
  role: string;
}

interface FaqItem {
  question: string;
  answer: string;
}

@Component({
  selector: 'sdi-home-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './home-page.html',
  styleUrl: './home-page.css',
  // The stylesheet ports :root tokens + base resets (*, html, body, a, ul,
  // button, input, :focus-visible) from the source design, which only work
  // if they aren't rewritten to scoped selectors. See the comment at the
  // top of home-page.css for the tradeoff and how to split it later.
  encapsulation: ViewEncapsulation.None,
})
export class HomePage implements AfterViewInit, OnDestroy {
  isScrolled = false;
  mobileMenuOpen = false;
  openFaqIndex: number | null = null;
  searchQuery = '';
  panelSearchQuery = '';
  currentYear = new Date().getFullYear();

  private revealObserver?: IntersectionObserver;

  readonly featuredBooks: FeaturedBook[] = [
    {
      title: 'Menjelajah Alam Semesta untuk Anak',
      category: 'Sains',
      icon: 'flask-conical',
      coverGradient: 'linear-gradient(160deg,#1B8C63,#0B3F30)',
      status: 'available',
      statusLabel: 'Tersedia',
      rating: '4.8',
    },
    {
      title: 'Kisah Teladan 25 Nabi & Rasul',
      category: 'Agama Islam',
      icon: 'moon-star',
      coverGradient: 'linear-gradient(160deg,#2E4A72,#0E1B2A)',
      status: 'popular',
      statusLabel: 'Populer',
      rating: '4.9',
    },
    {
      title: 'Matematika Itu Asyik Jilid 3',
      category: 'Matematika',
      icon: 'calculator',
      coverGradient: 'linear-gradient(160deg,#C99A45,#8A6120)',
      status: 'available',
      statusLabel: 'Tersedia',
      rating: '4.6',
    },
    {
      title: 'Mengenal Dunia Teknologi Sejak Dini',
      category: 'Teknologi',
      icon: 'cpu',
      coverGradient: 'linear-gradient(160deg,#12A39C,#0B4F4A)',
      status: 'new',
      statusLabel: 'Baru',
      rating: '4.7',
    },
    {
      title: 'Kumpulan Dongeng Nusantara',
      category: 'Cerita Anak',
      icon: 'book-heart',
      coverGradient: 'linear-gradient(160deg,#8A5AA8,#3D2352)',
      status: 'borrowed',
      statusLabel: 'Dipinjam',
      rating: '4.9',
    },
    {
      title: 'Jejak Sejarah Indonesia untuk SD',
      category: 'Sejarah',
      icon: 'landmark',
      coverGradient: 'linear-gradient(160deg,#4C6B45,#1E2E1A)',
      status: 'available',
      statusLabel: 'Tersedia',
      rating: '4.5',
    },
  ];

  readonly categories: BookCategory[] = [
    { icon: 'flask-conical', name: 'Sains', count: 420 },
    { icon: 'moon-star', name: 'Agama Islam', count: 560 },
    { icon: 'calculator', name: 'Matematika', count: 310 },
    { icon: 'cpu', name: 'Teknologi', count: 185 },
    { icon: 'landmark', name: 'Sejarah', count: 240 },
    { icon: 'languages', name: 'Bahasa', count: 395 },
    { icon: 'book-heart', name: 'Cerita Anak', count: 505 },
    { icon: 'image', name: 'Komik', count: 225 },
  ];

  readonly filterChips: FilterChip[] = [
    { icon: 'layers', label: 'Kategori', active: true },
    { icon: 'check', label: 'Ketersediaan', active: false },
    { icon: 'clock', label: 'Terbaru', active: false },
    { icon: 'trending-up', label: 'Terpopuler', active: false },
  ];

  readonly quickResults: QuickResult[] = [
    {
      thumbGradient: 'linear-gradient(160deg,#1B8C63,#0B3F30)',
      title: 'Menjelajah Alam Semesta untuk Anak',
      meta: 'Sains · Rina Wulandari',
      category: 'Sains',
      status: 'available',
      statusLabel: 'Tersedia',
    },
    {
      thumbGradient: 'linear-gradient(160deg,#2E4A72,#0E1B2A)',
      title: 'Kisah Teladan 25 Nabi & Rasul',
      meta: 'Agama Islam · Ust. Abdul Karim',
      category: 'Agama',
      status: 'popular',
      statusLabel: 'Populer',
    },
    {
      thumbGradient: 'linear-gradient(160deg,#C99A45,#8A6120)',
      title: 'Matematika Itu Asyik Jilid 3',
      meta: 'Matematika · Dwi Santoso',
      category: 'Matematika',
      status: 'available',
      statusLabel: 'Tersedia',
    },
  ];

  readonly digitalFeatures: DigitalFeature[] = [
    { icon: 'smartphone', title: 'Baca di Mana Saja', description: 'Akses buku digital dari HP, tablet, atau laptop.' },
    { icon: 'bookmark', title: 'Tandai Halaman', description: 'Simpan halaman terakhir yang dibaca secara otomatis.' },
    { icon: 'history', title: 'Riwayat Membaca', description: 'Lihat kembali daftar buku yang pernah dibaca.' },
    { icon: 'monitor', title: 'Tampilan Responsif', description: 'Tata letak menyesuaikan layar perangkat secara otomatis.' },
    { icon: 'moon', title: 'Mode Gelap', description: 'Nyaman dibaca meski dalam pencahayaan minim.' },
  ];

  readonly borrowSteps: BorrowStep[] = [
    { icon: 'search', title: 'Cari', description: 'Temukan buku lewat pencarian atau jelajahi kategori.' },
    { icon: 'book-open', title: 'Pinjam', description: 'Ajukan peminjaman langsung dari halaman buku.' },
    { icon: 'glasses', title: 'Baca', description: 'Baca versi fisik di perpustakaan atau versi digital daring.' },
    { icon: 'rotate-ccw', title: 'Kembalikan', description: 'Kembalikan tepat waktu agar bisa dipinjam siswa lain.' },
  ];

  readonly announcements: Announcement[] = [
    {
      mediaGradient: 'linear-gradient(160deg,#1B8C63,#0B3F30)',
      day: '12',
      month: 'Agu',
      title: 'Pekan Literasi Sekolah 2026',
      excerpt: 'Ikuti rangkaian kegiatan membaca dan lomba resensi buku sepanjang minggu.',
    },
    {
      mediaGradient: 'linear-gradient(160deg,#2E4A72,#0E1B2A)',
      day: '03',
      month: 'Agu',
      title: 'Koleksi Digital Baru Ditambahkan',
      excerpt: '150 judul baru kini tersedia di rak digital, mulai dari sains hingga cerita anak.',
    },
    {
      mediaGradient: 'linear-gradient(160deg,#C99A45,#8A6120)',
      day: '28',
      month: 'Jul',
      title: 'Jadwal Perawatan Sistem',
      excerpt: 'Layanan perpustakaan digital akan libur sejenak untuk pembaruan sistem.',
    },
  ];

  readonly services: LibraryService[] = [
    { icon: 'repeat', title: 'Peminjaman Buku', description: 'Pinjam koleksi fisik dengan proses cepat dan tercatat rapi.' },
    { icon: 'smartphone', title: 'Baca Digital', description: 'Akses ribuan koleksi digital dari perangkat pribadi.' },
    { icon: 'book-marked', title: 'Layanan Referensi', description: 'Bantuan pustakawan untuk menemukan sumber belajar yang tepat.' },
    { icon: 'monitor', title: 'Area Komputer', description: 'Komputer perpustakaan untuk kebutuhan riset dan tugas sekolah.' },
    { icon: 'armchair', title: 'Ruang Belajar', description: 'Ruang nyaman dan tenang untuk membaca serta belajar kelompok.' },
    { icon: 'calendar', title: 'Kegiatan Perpustakaan', description: 'Program literasi, lomba, dan kunjungan kelas rutin setiap bulan.' },
  ];

  readonly testimonials: Testimonial[] = [
    {
      quote: 'Aku suka bisa cari buku dari HP kakak sebelum ke perpustakaan. Jadi nggak bingung lagi cari bukunya di rak mana.',
      initials: 'AZ',
      avatarBg: 'var(--emerald-100)',
      avatarColor: 'var(--emerald-700)',
      name: 'Azka Ramadhan',
      role: 'Siswa Kelas 5',
    },
    {
      quote: 'Fitur riwayat membaca sangat membantu saya memantau minat baca siswa di kelas setiap bulan.',
      initials: 'SN',
      avatarBg: 'var(--teal-100)',
      avatarColor: 'var(--teal-600)',
      name: 'Bu Siti Nurhaliza',
      role: 'Wali Kelas 4',
    },
    {
      quote: 'Tampilannya rapi dan mudah dipakai. Anak saya jadi lebih semangat membaca di rumah.',
      initials: 'HW',
      avatarBg: 'var(--gold-100)',
      avatarColor: 'var(--gold-600)',
      name: 'Bapak Hendra Wijaya',
      role: 'Orang Tua Siswa',
    },
    {
      quote: 'Proses pinjam-kembalikan buku jadi lebih cepat dan tercatat rapi lewat sistem ini.',
      initials: 'RP',
      avatarBg: 'var(--emerald-100)',
      avatarColor: 'var(--emerald-700)',
      name: 'Bu Rina Puspita',
      role: 'Pustakawan Sekolah',
    },
  ];

  readonly faqs: FaqItem[] = [
    {
      question: 'Bagaimana cara mendaftar sebagai anggota perpustakaan?',
      answer:
        'Setiap siswa dan guru SD Islam Tompokersan otomatis terdaftar sebagai anggota. Silakan hubungi pustakawan untuk aktivasi akun digital.',
    },
    {
      question: 'Berapa lama batas waktu peminjaman buku?',
      answer:
        'Buku fisik dapat dipinjam selama 7 hari dan dapat diperpanjang satu kali melalui sistem jika belum ada antrean peminjam lain.',
    },
    {
      question: 'Apakah koleksi digital bisa diunduh untuk dibaca luring?',
      answer:
        'Sebagian koleksi digital dapat disimpan sementara di perangkat untuk dibaca tanpa koneksi internet, tergantung ketentuan penerbit.',
    },
    {
      question: 'Bagaimana jika buku yang dipinjam hilang atau rusak?',
      answer: 'Siswa diminta melapor ke pustakawan agar dapat ditentukan penggantian sesuai kebijakan sekolah yang berlaku.',
    },
    {
      question: 'Apakah orang tua bisa memantau riwayat membaca anak?',
      answer: 'Ya, orang tua dapat meminta ringkasan riwayat membaca anak kepada wali kelas atau pustakawan sekolah.',
    },
  ];

  constructor(
    private readonly host: ElementRef<HTMLElement>,
    @Inject(PLATFORM_ID) private readonly platformId: Object,
  ) {}

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.renderLucideIcons();
    this.setupScrollReveal();
  }

  ngOnDestroy(): void {
    this.revealObserver?.disconnect();
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.isScrolled = window.scrollY > 12;
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen = false;
  }

  toggleFaq(index: number): void {
    this.openFaqIndex = this.openFaqIndex === index ? null : index;
  }

  toggleChip(chip: FilterChip): void {
    chip.active = !chip.active;
  }

  scrollRow(row: HTMLElement, direction: 1 | -1): void {
    row.scrollBy({ left: direction * row.clientWidth * 0.8, behavior: 'smooth' });
  }

  onSearchSubmit(event?: Event): void {
    event?.preventDefault();
    // Wire this up to a real search route/service, e.g.:
    // this.router.navigate(['/katalog'], { queryParams: { q: this.searchQuery || this.panelSearchQuery } });
  }

  private renderLucideIcons(): void {
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  private setupScrollReveal(): void {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const revealEls = this.host.nativeElement.querySelectorAll<HTMLElement>('.reveal');

    if (reduceMotion || !('IntersectionObserver' in window)) {
      revealEls.forEach((el) => el.classList.add('in'));
      return;
    }

    this.revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -60px 0px' },
    );

    revealEls.forEach((el) => this.revealObserver!.observe(el));
  }
}
