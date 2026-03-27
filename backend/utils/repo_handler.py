"""
Repository Handler — clones GitHub repos and discovers source files.
"""
import os
import shutil
import tempfile
import re

try:
    import git
    GIT_AVAILABLE = True
except ImportError:
    GIT_AVAILABLE = False

SUPPORTED_EXTENSIONS = {
    ".py", ".java", ".c", ".h", ".cpp", ".hpp",
    ".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs",
    ".html", ".htm", ".css", ".scss", ".json"
}

IGNORE_DIRS = {
    ".git", "node_modules", "__pycache__", ".venv", "venv", "env",
    ".tox", "build", "dist", "target", "vendor", "out", "bin",
    ".mypy_cache", ".pytest_cache", ".cache", ".DS_Store",
    "coverage", ".next", ".nuxt", "eggs", "wheels",
}

MAX_FILES = 500
MAX_FILE_SIZE = 1 * 1024 * 1024   # 1 MB
MIN_FILE_SIZE = 10                  # 10 bytes


class RepoHandler:

    def __init__(self):
        self.clone_dir = None
        self.repo_info = {}

    def clone_repository(self, url: str, branch: str = None) -> str:
        """Shallow-clone a GitHub repository. Returns the local clone path."""
        if not GIT_AVAILABLE:
            raise RuntimeError("gitpython is not installed. Run: pip install gitpython")

        # Normalize URL
        if not url.endswith(".git"):
            url = url.rstrip("/") + ".git"

        repo_name = re.sub(r"\.git$", "", url.split("/")[-1])

        self.clone_dir = tempfile.mkdtemp(prefix="acrs_")

        # Branch fallback order
        branches_to_try = []
        if branch:
            branches_to_try.append(branch)
        branches_to_try += [None, "master", "main", "develop"]

        last_err = None
        cloned_branch = None

        for br in branches_to_try:
            try:
                kwargs = {"depth": 1, "single_branch": True}
                if br:
                    kwargs["branch"] = br

                repo = git.Repo.clone_from(url, self.clone_dir, **kwargs)
                cloned_branch = br or repo.active_branch.name

                head_commit = repo.head.commit
                self.repo_info = {
                    "url": url.replace(".git", ""),
                    "name": repo_name,
                    "branch": cloned_branch,
                    "commit_hash": head_commit.hexsha[:8],
                    "commit_message": head_commit.message[:200].strip(),
                    "author": str(head_commit.author),
                }
                return self.clone_dir
            except Exception as e:
                last_err = e
                # Clean up and retry
                shutil.rmtree(self.clone_dir, ignore_errors=True)
                self.clone_dir = tempfile.mkdtemp(prefix="acrs_")
                continue

        raise RuntimeError(f"Failed to clone {url}: {last_err}")

    def discover_source_files(self, clone_path: str) -> list:
        """Walk directory tree and return a list of source file metadata dicts."""
        found = []

        for root, dirs, files in os.walk(clone_path):
            # Prune ignored directories in-place
            dirs[:] = [d for d in dirs if d not in IGNORE_DIRS and not d.startswith(".")]

            for fname in files:
                ext = os.path.splitext(fname)[1].lower()
                if ext not in SUPPORTED_EXTENSIONS:
                    continue

                fpath = os.path.join(root, fname)
                try:
                    size = os.path.getsize(fpath)
                except OSError:
                    continue

                if size < MIN_FILE_SIZE or size > MAX_FILE_SIZE:
                    continue

                rel_path = os.path.relpath(fpath, clone_path)
                found.append({
                    "path": rel_path,
                    "abs_path": fpath,
                    "extension": ext,
                    "size_bytes": size,
                })

                if len(found) >= MAX_FILES:
                    return found

        return found

    def read_file(self, abs_path: str) -> str:
        """Read file contents with multiple encoding fallbacks."""
        for enc in ("utf-8", "latin-1", "cp1252", "ascii"):
            try:
                with open(abs_path, "r", encoding=enc, errors="replace") as f:
                    return f.read()
            except Exception:
                continue
        return ""

    def cleanup(self):
        """Remove the cloned repository from disk."""
        if self.clone_dir and os.path.exists(self.clone_dir):
            shutil.rmtree(self.clone_dir, ignore_errors=True)
            self.clone_dir = None
