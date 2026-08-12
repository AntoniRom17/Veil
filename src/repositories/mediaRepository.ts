import type { VeilDatabase } from "@/src/db/VeilDatabase";
import type { MediaAsset, MediaPurpose } from "@/src/types/domain";
import type { ProcessedImage } from "@/src/services/imageService";
import { createId } from "@/src/utils/id";

export class MediaRepository {
  constructor(private readonly db: VeilDatabase) {}

  get(id: string): Promise<MediaAsset | undefined> {
    return this.db.media.get(id);
  }

  async create(purpose: MediaPurpose, image: ProcessedImage): Promise<MediaAsset> {
    const timestamp = new Date().toISOString();
    const media: MediaAsset = {
      ...image,
      id: createId(),
      purpose,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await this.db.media.add(media);
    return media;
  }

  remove(id: string): Promise<void> {
    return this.db.media.delete(id);
  }

  async totalBytes(): Promise<number> {
    const media = await this.db.media.toArray();
    return media.reduce((total, asset) => total + asset.byteSize, 0);
  }
}
