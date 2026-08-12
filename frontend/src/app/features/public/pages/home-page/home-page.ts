import { isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  PLATFORM_ID,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import {
  CatalogApiService,
  type CatalogBook,
} from '../../../catalog/data-access/catalog-api.service';
import { DigitalLibraryApiService } from '../../../digital-library/data-access/digital-library-api.service';
import type { DigitalCollection } from '../../../digital-library/models/digital-collection.model';

interface LibraryService {
  readonly title: string;
  readonly summary: string;
  readonly route: string;
  readonly action: string;
  readonly tone: 'indigo' | 'jade' | 'saffron' | 'violet';
}

interface MotionMediaContext {
  add(query: string, callback: () => void | (() => void)): void;
  revert(): void;
}

@Component({
  selector: 'sdi-home-page',
  imports: [RouterLink],
  templateUrl: './home-page.html',
  styleUrl: './home-page.css',
})
export class HomePage implements AfterViewInit, OnDestroy {
  private readonly catalogApi = inject(CatalogApiService);
  private readonly digitalApi = inject(DigitalLibraryApiService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly host = inject(ElementRef<HTMLElement>);
  private animationContext?: { revert(): void };
  private motionMedia?: MotionMediaContext;

  protected readonly physicalBooks = signal<CatalogBook[]>([]);
  protected readonly digitalBooks = signal<DigitalCollection[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadError = signal(false);

  protected readonly services: readonly LibraryService[] = [
    {
      title: 'Temukan buku fisik',
      summary:
        'Cari judul, cek jumlah eksemplar yang tersedia, lalu siapkan reservasi sebelum datang.',
      route: '/katalog',
      action: 'Buka katalog',
      tone: 'indigo',
    },
    {
      title: 'Baca koleksi digital',
      summary: 'Jelajahi e-book, modul, dan video yang diterbitkan oleh perpustakaan sekolah.',
      route: '/koleksi-digital',
      action: 'Lihat koleksi digital',
      tone: 'jade',
    },
    {
      title: 'Kelola pinjaman',
      summary:
        'Anggota dapat melihat batas pengembalian, status reservasi, denda, dan riwayatnya sendiri.',
      route: '/masuk',
      action: 'Masuk sebagai anggota',
      tone: 'saffron',
    },
    {
      title: 'Layanan petugas',
      summary:
        'Peminjaman, pengembalian, kunjungan, dan inventaris ditangani dari satu meja kerja.',
      route: '/masuk',
      action: 'Masuk ke dashboard',
      tone: 'violet',
    },
  ];

  constructor() {
    if (isPlatformBrowser(this.platformId)) this.loadCollections();
  }

  ngAfterViewInit(): void {
    void this.setupMotion();
  }

  ngOnDestroy(): void {
    this.motionMedia?.revert();
    this.animationContext?.revert();
  }

  protected coverVariant(book: CatalogBook): number {
    let hash = 0;
    for (const character of book.id) hash = (hash * 31 + character.charCodeAt(0)) % 5;
    return hash;
  }

  protected stockLabel(book: CatalogBook): string {
    if (book.stock.available > 0) return `${book.stock.available} tersedia`;
    return book.stock.total > 0 ? 'Sedang dipinjam' : 'Belum ada eksemplar';
  }

  protected mediaLabel(type: DigitalCollection['media_type']): string {
    return { ebook: 'E-book', module: 'Modul', video: 'Video' }[type];
  }

  private loadCollections(): void {
    forkJoin({
      physical: this.catalogApi.list('', 1),
      digital: this.digitalApi.list({ sort: 'latest' }),
    }).subscribe({
      next: ({ physical, digital }) => {
        this.physicalBooks.set(physical.data.slice(0, 4));
        this.digitalBooks.set(digital.data.slice(0, 4));
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set(true);
        this.loading.set(false);
      },
    });
  }

  private async setupMotion(): Promise<void> {
    if (!isPlatformBrowser(this.platformId) || typeof window.matchMedia !== 'function') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const [{ gsap }, { ScrollTrigger }] = await Promise.all([
      import('gsap'),
      import('gsap/ScrollTrigger'),
    ]);
    gsap.registerPlugin(ScrollTrigger);
    const root: HTMLElement = this.host.nativeElement;

    this.animationContext = gsap.context(() => {
      gsap.from('.hero-copy > *', {
        opacity: 0,
        y: 28,
        duration: 0.85,
        stagger: 0.09,
        ease: 'power3.out',
      });
      gsap.from('.hero-discovery', {
        opacity: 0,
        x: 64,
        duration: 1,
        ease: 'power3.out',
      });

      const serviceIntro = root.querySelector<HTMLElement>('.service-intro');
      const serviceRack = root.querySelector<HTMLElement>('.service-rack');

      this.motionMedia = gsap.matchMedia() as MotionMediaContext;
      this.motionMedia.add('(min-width: 960px)', () => {
        if (!serviceIntro || !serviceRack) return;

        const pinTop = (): number =>
          Math.round(Math.min(176, Math.max(128, window.innerHeight * 0.16)));

        const servicePin = ScrollTrigger.create({
          trigger: serviceRack,
          start: () => `top top+=${pinTop()}`,
          end: () => `bottom top+=${pinTop() + serviceIntro.offsetHeight}`,
          pin: serviceIntro,
          pinSpacing: false,
          invalidateOnRefresh: true,
          anticipatePin: 1,
        });

        return () => servicePin.kill();
      });

      gsap.utils.toArray<HTMLElement>('.collection-card').forEach((card) => {
        gsap.fromTo(
          card,
          { scale: 0.88, opacity: 0.35 },
          {
            scale: 1,
            opacity: 1,
            ease: 'none',
            scrollTrigger: {
              trigger: card,
              start: 'top 92%',
              end: 'center 62%',
              scrub: 0.6,
            },
          },
        );
      });
    }, root);
  }
}
