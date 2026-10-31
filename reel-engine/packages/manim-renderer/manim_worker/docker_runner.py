"""
Docker-based containerized Manim runner.
Executes Manim in an isolated official Docker container without requiring host system libraries.
"""

from __future__ import annotations

import os
import shutil
import subprocess
from pathlib import Path
from typing import Optional


class DockerManimRunner:
    def __init__(self, image: str = "manimcommunity/manim:latest") -> None:
        self.image = image

    def is_docker_available(self) -> bool:
        """Check if Docker CLI is installed and accessible on PATH."""
        return shutil.which("docker") is not None

    def is_daemon_running(self) -> bool:
        """Check if the Docker daemon is actively responding."""
        if not self.is_docker_available():
            return False
        try:
            res = subprocess.run(
                ["docker", "info"],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                timeout=5,
            )
            return res.returncode == 0
        except Exception:
            return False

    def render_scene(
        self,
        script_path: str,
        scene_name: str,
        output_mp4_path: str,
        duration_frames: int,
        fps: int = 30,
        quality: str = "-qm", # 1080p
        timeout_seconds: int = 120,
    ) -> bool:
        """
        Renders a Manim scene inside an isolated Docker container.
        Mounts the directory containing script_path to /manim inside the container.
        """
        script_file = Path(script_path).resolve()
        work_dir = script_file.parent
        out_file = Path(output_mp4_path).resolve()
        out_dir = out_file.parent
        out_dir.mkdir(parents=True, exist_ok=True)

        if not self.is_daemon_running():
            raise RuntimeError("Docker daemon is not running. Start Docker Desktop or use local Manim CLI.")

        # Command inside container: manim -qm --format=mp4 --fps 30 -r 1080,1920 -o <output_filename> /manim/<script_name> <scene_name>
        container_mount = f"{work_dir}:/manim"
        docker_cmd = [
            "docker", "run", "--rm",
            "-v", container_mount,
            "-w", "/manim",
            self.image,
            "manim",
            quality,
            "--format=mp4",
            "--fps", str(fps),
            "-r", "1080,1920",
            "-o", out_file.name,
            f"/manim/{script_file.name}",
            scene_name,
        ]

        result = subprocess.run(
            docker_cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=timeout_seconds,
        )

        if result.returncode != 0:
            raise RuntimeError(f"Docker Manim render failed:\n{result.stderr}\n{result.stdout}")

        return out_file.exists()
