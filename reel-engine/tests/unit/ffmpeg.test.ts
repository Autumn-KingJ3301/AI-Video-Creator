import { describe, it, expect } from "vitest";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import ffprobeInstaller from "@ffprobe-installer/ffprobe";
import { execFileSync } from "node:child_process";

describe("FFmpeg & FFprobe Runtime Binaries", () => {
  it("should have valid executable FFmpeg path", () => {
    expect(ffmpegInstaller.path).toBeDefined();
    const versionOutput = execFileSync(ffmpegInstaller.path, ["-version"], { encoding: "utf-8" });
    expect(versionOutput).toContain("ffmpeg version");
  });

  it("should have valid executable FFprobe path", () => {
    expect(ffprobeInstaller.path).toBeDefined();
    const versionOutput = execFileSync(ffprobeInstaller.path, ["-version"], { encoding: "utf-8" });
    expect(versionOutput).toContain("ffprobe version");
  });
});
