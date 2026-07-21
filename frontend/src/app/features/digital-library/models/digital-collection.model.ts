export type DigitalMediaType = 'ebook' | 'module' | 'video' | 'audio';
export interface DigitalCollection {
  id: string;
  category_id: string | null;
  title: string;
  slug: string;
  description: string | null;
  media_type: DigitalMediaType;
  author_text: string | null;
  publisher_text: string | null;
  publication_year: number | null;
  mime_type: string | null;
  file_size_bytes: number | null;
  duration_seconds: number | null;
  is_downloadable: boolean;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  categories: { name: string } | null;
  coverUrl: string | null;
  popularity: number;
}
