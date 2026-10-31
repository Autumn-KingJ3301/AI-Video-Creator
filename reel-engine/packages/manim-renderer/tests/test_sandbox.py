"""
Test battery for AST Code Sandbox security validation.
Verifies that 10 dangerous exploit vectors are intercepted prior to execution.
"""

import unittest
import sys
from pathlib import Path

# Add package root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from manim_worker.sandbox import CodeSandbox


class TestCodeSandbox(unittest.TestCase):
    def setUp(self):
        self.sandbox = CodeSandbox()

    def test_valid_scene_code(self):
        code = """
from manim_worker.helpers import ReelScene
import numpy as np

class LossBowlScene(ReelScene):
    def construct(self):
        pass
"""
        res = self.sandbox.validate(code)
        self.assertTrue(res.valid, f"Expected valid, got errors: {res.errors}")
        self.assertIn("LossBowlScene", res.scenes_found)

    def test_blocks_os_import(self):
        code = "import os\nos.system('calc')\n"
        res = self.sandbox.validate(code)
        self.assertFalse(res.valid)
        self.assertTrue(any("Blocked import 'os'" in e for e in res.errors))

    def test_blocks_subprocess_import(self):
        code = "import subprocess\nsubprocess.Popen(['notepad'])\n"
        res = self.sandbox.validate(code)
        self.assertFalse(res.valid)
        self.assertTrue(any("Blocked import 'subprocess'" in e for e in res.errors))

    def test_blocks_from_sys_import(self):
        code = "from sys import modules\n"
        res = self.sandbox.validate(code)
        self.assertFalse(res.valid)
        self.assertTrue(any("Blocked import from 'sys'" in e for e in res.errors))

    def test_blocks_eval_builtin(self):
        code = "x = eval('1 + 1')\n"
        res = self.sandbox.validate(code)
        self.assertFalse(res.valid)
        self.assertTrue(any("Call to dangerous function 'eval'" in e for e in res.errors))

    def test_blocks_open_builtin(self):
        code = "with open('file.txt', 'w') as f: f.write('hack')\n"
        res = self.sandbox.validate(code)
        self.assertFalse(res.valid)
        self.assertTrue(any("Call to dangerous function 'open'" in e for e in res.errors))

    def test_blocks_dunder_subclasses(self):
        code = "().__class__.__bases__[0].__subclasses__()\n"
        res = self.sandbox.validate(code)
        self.assertFalse(res.valid)
        self.assertTrue(any("Access to blocked dunder attribute" in e for e in res.errors))

    def test_blocks_dynamic_import(self):
        code = "m = __import__('os')\n"
        res = self.sandbox.validate(code)
        self.assertFalse(res.valid)
        self.assertTrue(any("Call to dangerous function '__import__'" in e for e in res.errors))

    def test_catches_syntax_error(self):
        code = "def broken(\n"
        res = self.sandbox.validate(code)
        self.assertFalse(res.valid)
        self.assertTrue(any("Syntax error" in e for e in res.errors))


if __name__ == "__main__":
    unittest.main()
