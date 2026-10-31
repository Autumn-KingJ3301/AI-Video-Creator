import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export interface CacheEntryMetadata {
  hash: string;
  sceneId?: string;
  createdAt: string;
  lastAccessedAt: string;
  hitCount: number;
  sizeBytes: number;
  extra?: Record<string, any>;
}

export interface CacheManifest {
  version: string;
  entries: Record<string, CacheEntryMetadata>; // hash -> metadata
  totalHits: number;
  totalMisses: number;
}

export interface CacheStats {
  totalEntries: number;
  totalSizeBytes: number;
  hits: number;
  misses: number;
  hitRatio: number;
}

export class SceneCache {
  private cacheDir: string;
  private manifestPath: string;
  private manifest: CacheManifest;

  constructor(baseDir: string = ".cache") {
    this.cacheDir = join(baseDir, "scenes");
    this.manifestPath = join(baseDir, "manifest.json");
    if (!existsSync(this.cacheDir)) {
      mkdirSync(this.cacheDir, { recursive: true });
    }
    this.manifest = this.loadManifest();
  }

  private loadManifest(): CacheManifest {
    if (existsSync(this.manifestPath)) {
      try {
        const raw = readFileSync(this.manifestPath, "utf-8");
        return JSON.parse(raw);
      } catch {
        // Fall back to clean manifest
      }
    }
    return {
      version: "1.0",
      entries: {},
      totalHits: 0,
      totalMisses: 0,
    };
  }

  public saveManifest(): void {
    try {
      const parentDir = join(this.manifestPath, "..");
      if (!existsSync(parentDir)) {
        mkdirSync(parentDir, { recursive: true });
      }
      writeFileSync(this.manifestPath, JSON.stringify(this.manifest, null, 2), "utf-8");
    } catch (e) {
      // Non-fatal if manifest write fails
    }
  }

  /**
   * Check if a cached clip exists for the given hash.
   */
  public has(hash: string): boolean {
    const clipPath = join(this.cacheDir, `${hash}.mp4`);
    return existsSync(clipPath);
  }

  /**
   * Retrieve the file path of a cached clip. Returns null on cache miss.
   */
  public get(hash: string): string | null {
    const clipPath = join(this.cacheDir, `${hash}.mp4`);
    if (existsSync(clipPath)) {
      this.manifest.totalHits++;
      if (this.manifest.entries[hash]) {
        this.manifest.entries[hash].hitCount++;
        this.manifest.entries[hash].lastAccessedAt = new Date().toISOString();
      }
      this.saveManifest();
      return clipPath;
    }
    this.manifest.totalMisses++;
    this.saveManifest();
    return null;
  }

  /**
   * Store a rendered clip into cache addressing by hash.
   */
  public put(hash: string, sourcePath: string, metadata?: { sceneId?: string; extra?: Record<string, any> }): string {
    if (!existsSync(sourcePath)) {
      throw new Error(`Cannot cache non-existent source file: ${sourcePath}`);
    }
    const destPath = join(this.cacheDir, `${hash}.mp4`);
    copyFileSync(sourcePath, destPath);

    const stats = statSync(destPath);
    this.manifest.entries[hash] = {
      hash,
      sceneId: metadata?.sceneId,
      createdAt: new Date().toISOString(),
      lastAccessedAt: new Date().toISOString(),
      hitCount: 0,
      sizeBytes: stats.size,
      extra: metadata?.extra,
    };
    this.saveManifest();
    return destPath;
  }

  /**
   * Invalidate a single hash, a specific scene ID, or all entries.
   */
  public invalidate(target?: string): void {
    if (!target) {
      // Clear entire cache
      for (const entry of Object.keys(this.manifest.entries)) {
        const p = join(this.cacheDir, `${entry}.mp4`);
        if (existsSync(p)) rmSync(p, { force: true });
      }
      this.manifest.entries = {};
      this.saveManifest();
      return;
    }

    // Target could be a hash or a sceneId
    if (this.manifest.entries[target]) {
      // Target is hash
      const p = join(this.cacheDir, `${target}.mp4`);
      if (existsSync(p)) rmSync(p, { force: true });
      delete this.manifest.entries[target];
    } else {
      // Check if target matches sceneId
      for (const [hash, meta] of Object.entries(this.manifest.entries)) {
        if (meta.sceneId === target) {
          const p = join(this.cacheDir, `${hash}.mp4`);
          if (existsSync(p)) rmSync(p, { force: true });
          delete this.manifest.entries[hash];
        }
      }
    }
    this.saveManifest();
  }

  /**
   * Get cache statistics.
   */
  public getStats(): CacheStats {
    let totalSizeBytes = 0;
    const entries = Object.values(this.manifest.entries);
    for (const entry of entries) {
      totalSizeBytes += entry.sizeBytes || 0;
    }
    const totalRequests = this.manifest.totalHits + this.manifest.totalMisses;
    const hitRatio = totalRequests > 0 ? this.manifest.totalHits / totalRequests : 0;

    return {
      totalEntries: entries.length,
      totalSizeBytes,
      hits: this.manifest.totalHits,
      misses: this.manifest.totalMisses,
      hitRatio,
    };
  }

  public getCacheDir(): string {
    return this.cacheDir;
  }
}
