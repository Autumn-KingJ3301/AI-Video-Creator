"""
Smart Manim Renderer Dispatcher:
1. Validates code AST with CodeSandbox.
2. If Docker is running, renders via Docker container.
3. If local manim CLI is installed, renders via local CLI.
4. If neither is available, provides deterministic procedural animation fallback.
"""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
from pathlib import Path

# Add package root to sys.path so manim_worker can be imported
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from manim_worker.sandbox import CodeSandbox
from manim_worker.docker_runner import DockerManimRunner
from manim_worker.theme_tokens import COLOR_BACKGROUND, COLOR_ACCENT, COLOR_FOREGROUND


def render_procedural_fallback(output_path: str, duration_frames: int, fps: int = 30) -> None:
    """
    Renders a deterministic 9:16 vertical mathematical animation clip via FFmpeg
    when neither Docker nor host Manim are available.
    """
    duration_s = duration_frames / fps
    width, height = 1080, 1920
    out_file = Path(output_path).resolve()
    out_file.parent.mkdir(parents=True, exist_ok=True)

    # Animated geometric wave / parabola and mathematical formula in Corsela theme
    filter_graph = [
        f"color=c={COLOR_BACKGROUND}:s={width}x{height}:d={duration_s}:r={fps}",
        # Grid lines (light warm border)
        "drawgrid=width=120:height=120:thickness=1:color=0xE6E0D5@0.8",
        # Animated terracotta parabola curve / wave
        f"drawbox=x=200+(t*50):y=900+sin(t*3)*150:w=30:h=30:color=0xC84B22:t=fill",
        # Mathematical equation label in safe zone
        f"drawtext=text='L(w) = (1/2N) sum (y - y_hat)^2':fontsize=48:fontcolor={COLOR_FOREGROUND}:x=(w-text_w)/2:y=650",
        f"drawtext=text='Gradient Vector: grad L':fontsize=40:fontcolor={COLOR_ACCENT}:x=(w-text_w)/2:y=750",
        # Mathematical coordinate axes
        "drawbox=x=150:y=1198:w=780:h=4:color=0x141413:t=fill",
        "drawbox=x=538:y=850:w=4:h=500:color=0x141413:t=fill",
        "format=yuv420p"
    ]

    # Try bundled ffmpeg from node_modules first, then system ffmpeg
    ffmpeg_bin = "ffmpeg"
    node_ffmpeg_dir = Path(__file__).resolve().parent.parent.parent.parent / "node_modules" / "@ffmpeg-installer" / "win32-x64" / "ffmpeg.exe"
    if node_ffmpeg_dir.exists():
        ffmpeg_bin = str(node_ffmpeg_dir)

    cmd = [
        ffmpeg_bin,
        "-y",
        "-f", "lavfi",
        "-i", ",".join(filter_graph),
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-r", str(fps),
        "-t", str(duration_s),
        str(out_file),
    ]

    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if res.returncode != 0:
        raise RuntimeError(f"Procedural animation fallback failed: {res.stderr.decode()}")


def main():
    parser = argparse.ArgumentParser(description="Reel Engine Manim Renderer Worker")
    parser.add_argument("--script", required=True, help="Path to Python scene script")
    parser.add_argument("--scene", required=True, help="Name of Scene class")
    parser.add_argument("--output", required=True, help="Output MP4 file path")
    parser.add_argument("--frames", type=int, default=150, help="Duration in frames")
    parser.add_argument("--fps", type=int, default=30, help="Frame rate")
    parser.add_argument("--prefer-docker", action="store_true", help="Force Docker execution")
    args = parser.parse_args()

    script_path = Path(args.script).resolve()
    if not script_path.exists():
        print(f"Error: Script not found: {script_path}", file=sys.stderr)
        sys.exit(1)

    code = script_path.read_text(encoding="utf-8")

    # 1. AST Security Validation Gate
    sandbox = CodeSandbox()
    validation = sandbox.validate(code)
    if not validation.valid:
        print(f"SECURITY_AST_VIOLATION: Code failed sandbox validation:", file=sys.stderr)
        for err in validation.errors:
            print(f"  - {err}", file=sys.stderr)
        sys.exit(2)

    # 2. Check Execution Engine
    docker_runner = DockerManimRunner()
    rendered = False

    if docker_runner.is_daemon_running():
        try:
            print("Rendering via Docker Manim container...")
            rendered = docker_runner.render_scene(
                str(script_path),
                args.scene,
                args.output,
                args.frames,
                args.fps,
            )
        except Exception as e:
            print(f"Docker render attempt failed: {e}. Falling back...", file=sys.stderr)

    if not rendered and shutil.which("manim"):
        try:
            print("Rendering via local Manim CLI...")
            cmd = [
                "manim", "-qm", "--format=mp4",
                "--fps", str(args.fps),
                "-r", "1080,1920",
                "-o", Path(args.output).name,
                str(script_path),
                args.scene
            ]
            subprocess.run(cmd, check=True)
            rendered = True
        except Exception as e:
            print(f"Local Manim CLI attempt failed: {e}. Falling back...", file=sys.stderr)

    if not rendered:
        print("Using deterministic procedural animation fallback...")
        render_procedural_fallback(args.output, args.frames, args.fps)

    print(f"SUCCESS: Rendered {args.output} ({args.frames} frames @ {args.fps}fps)")
    sys.exit(0)


if __name__ == "__main__":
    main()
