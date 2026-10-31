"""
AST-based code validation to prevent dangerous operations in agent-authored Manim code.
Adapted from manim-mcp (MIT License).
"""

from __future__ import annotations

import ast
from dataclasses import dataclass, field
from typing import List, Optional

BLOCKED_MODULES = frozenset({
    "os", "subprocess", "sys", "shutil", "socket", "http", "urllib",
    "requests", "importlib", "ctypes", "multiprocessing", "pickle",
    "tempfile", "glob", "ftplib", "smtplib", "webbrowser", "pathlib",
    "signal", "resource", "pty", "pipes", "fcntl", "termios",
    "code", "codeop", "compileall", "py_compile",
})

ALLOWED_PREFIXES = ("manim", "manim_worker", "numpy", "math", "colour", "scipy")

DANGEROUS_BUILTINS = frozenset({
    "exec", "eval", "compile", "__import__", "open", "input", "breakpoint",
})

BLOCKED_DUNDERS = frozenset({
    "__subclasses__", "__class__", "__bases__", "__globals__",
    "__code__", "__builtins__", "__mro__", "__qualname__",
})


@dataclass
class ValidationResult:
    valid: bool
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    scenes_found: List[str] = field(default_factory=list)


class CodeSandbox:
    def __init__(self, max_code_length: int = 100_000) -> None:
        self.max_code_length = max_code_length

    def validate(self, code: str) -> ValidationResult:
        errors: List[str] = []
        warnings: List[str] = []
        scenes_found: List[str] = []

        if len(code) > self.max_code_length:
            errors.append(f"Code exceeds maximum length of {self.max_code_length} characters")
            return ValidationResult(valid=False, errors=errors, warnings=warnings)

        try:
            tree = ast.parse(code)
        except SyntaxError as e:
            msg = f"Syntax error at line {e.lineno}, column {e.offset}: {e.msg}"
            errors.append(msg)
            return ValidationResult(valid=False, errors=errors, warnings=warnings)

        for node in ast.walk(tree):
            # 1. Check imports: import X
            if isinstance(node, ast.Import):
                for alias in node.names:
                    root_mod = alias.name.split(".")[0]
                    if root_mod in BLOCKED_MODULES:
                        errors.append(f"Blocked import '{alias.name}' at line {node.lineno}")
                    elif not any(alias.name.startswith(p) for p in ALLOWED_PREFIXES):
                        warnings.append(f"Unverified import '{alias.name}' at line {node.lineno}")

            # 2. Check from X import Y
            elif isinstance(node, ast.ImportFrom):
                if node.module:
                    root_mod = node.module.split(".")[0]
                    if root_mod in BLOCKED_MODULES:
                        errors.append(f"Blocked import from '{node.module}' at line {node.lineno}")
                    elif not any(node.module.startswith(p) for p in ALLOWED_PREFIXES):
                        warnings.append(f"Unverified import from '{node.module}' at line {node.lineno}")

            # 3. Check function calls for dangerous builtins
            elif isinstance(node, ast.Call):
                func_name: Optional[str] = None
                if isinstance(node.func, ast.Name):
                    func_name = node.func.id
                elif isinstance(node.func, ast.Attribute):
                    func_name = node.func.attr

                if func_name and func_name in DANGEROUS_BUILTINS:
                    errors.append(f"Call to dangerous function '{func_name}' at line {node.lineno}")

            # 4. Check for blocked dunder attributes
            elif isinstance(node, ast.Attribute):
                if node.attr in BLOCKED_DUNDERS:
                    errors.append(f"Access to blocked dunder attribute '{node.attr}' at line {node.lineno}")

            # 5. Locate Scene classes
            elif isinstance(node, ast.ClassDef):
                for base in node.bases:
                    base_id = ""
                    if isinstance(base, ast.Name):
                        base_id = base.id
                    elif isinstance(base, ast.Attribute):
                        base_id = base.attr
                    if base_id in ("Scene", "ReelScene", "ThreeDScene", "MovingCameraScene"):
                        scenes_found.append(node.name)

        is_valid = len(errors) == 0
        return ValidationResult(valid=is_valid, errors=errors, warnings=warnings, scenes_found=scenes_found)
