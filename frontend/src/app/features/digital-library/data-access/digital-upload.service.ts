import { Injectable, inject } from '@angular/core';
import * as tus from 'tus-js-client';
import { environment } from '../../../../environments/environment';
import { SUPABASE_CLIENT } from '../../../core/auth/supabase.client';
import type { DigitalUploadTarget } from './digital-library-api.service';

@Injectable({ providedIn: 'root' })
export class DigitalUploadService {
  private readonly supabase = inject(SUPABASE_CLIENT);

  uploadMain(
    file: File,
    target: DigitalUploadTarget,
    onProgress: (progress: number) => void,
    signal: AbortSignal,
  ) {
    return new Promise<void>((resolve, reject) => {
      let settled = false;
      const complete = (callback: () => void) => {
        if (settled) return;
        settled = true;
        callback();
      };
      const upload = new tus.Upload(file, {
        endpoint: resumableEndpoint(),
        chunkSize: 6 * 1024 * 1024,
        retryDelays: [0, 1_000, 3_000, 5_000],
        storeFingerprintForResuming: false,
        removeFingerprintOnSuccess: true,
        uploadDataDuringCreation: true,
        headers: { 'x-signature': target.token, 'x-upsert': 'false' },
        metadata: {
          bucketName: target.bucket,
          objectName: target.path,
          contentType: file.type,
          cacheControl: '3600',
        },
        onProgress: (uploaded, total) => onProgress(total ? Math.round((uploaded / total) * 100) : 0),
        onSuccess: () => complete(resolve),
        onError: (error) => complete(() => reject(error)),
      });
      signal.addEventListener(
        'abort',
        () => {
          void upload.abort(true);
          complete(() => reject(new DOMException('Unggahan dibatalkan.', 'AbortError')));
        },
        { once: true },
      );
      if (signal.aborted) {
        void upload.abort(true);
        complete(() => reject(new DOMException('Unggahan dibatalkan.', 'AbortError')));
        return;
      }
      upload.start();
    });
  }

  async uploadCover(file: File, target: DigitalUploadTarget, signal: AbortSignal) {
    if (signal.aborted) throw new DOMException('Unggahan dibatalkan.', 'AbortError');
    const { error } = await this.supabase.storage
      .from(target.bucket)
      .uploadToSignedUrl(target.path, target.token, file, { contentType: file.type });
    if (error) throw error;
  }
}

function resumableEndpoint() {
  const projectRef = new URL(environment.supabaseUrl).hostname.split('.')[0];
  return `https://${projectRef}.storage.supabase.co/storage/v1/upload/resumable`;
}
