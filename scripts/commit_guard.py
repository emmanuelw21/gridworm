"""Commit guard: keeps personal and security-sensitive details out of git.

Runs before every commit and push (.githooks/), and by hand:
    python scripts/commit_guard.py            everything git would commit
    python scripts/commit_guard.py --staged   only what is staged (the pre-commit hook)

This is a code repository, so ordinary development values are allowed: loopback
addresses with ports (127.0.0.1:8090), made-up test addresses (192.168.1.x, 100.101.102.103,
documentation ranges), and standard program folders (C:\\Program Files\\...).
It blocks the things that point at a real person, machine, account, or secret:
  - email addresses (other than example domains and GitHub noreply)
  - database or service addresses with a password in them
  - real Tailscale machine names (*.ts.net other than placeholders)
  - folders from this computer: a user folder, or any unusual drive path
  - Cloudflare account ids and workers.dev account names
  - keys and tokens (GitHub, OpenAI-style, AWS, private keys)
  - private data folders (localcardstor data, .env files, key files)
Add an exact, reviewed phrase to scripts/commit_guard_allow.txt to let it through.
"""
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def safe_log(text=""):
    """Findings are shown without the matched value's middle, so a real secret is never echoed in full."""
    print(text)
EXAMPLE_HOSTS = ("example.com", "example.org", "example.net", "users.noreply.github.com", "example-account", "your-tailnet", "tailnet-name")
RULES = [
    (r"[\w.+-]+@[\w-]+(?:\.[\w-]+)*\.[A-Za-z]{2,}\b", "an email address"),
    (r"\b[a-z][\w+.-]*://[^\s:/@\"']+:[^\s@/\"']{3,}@", "an address with a password in it"),
    (r"\b[\w-]+\.[\w-]+\.ts\.net\b", "a Tailscale machine name"),
    (r"(?i)[A-Z]:\\+Users\\+(?!<you>|someone|you\b|name\b)[\w.-]+|/home/(?!user\b)\w+|/Users/(?!you\b)\w+", "a user folder"),
    # Any drive path except standard program locations and obvious placeholders.
    (r"(?i)\b[A-Z]:\\+(?!Program Files|Windows\\|Python\d|ProgramData|path\\to|private\\|Scans\\)[\w][\w .-]*", "a folder path from this PC"),
    (r"\b[0-9a-f]{32}\b(?=[^\n]*(?:account|zone))|(?i:account[_ ]?id)[\"']?\s*[:=]\s*[\"']?[0-9a-f]{32}", "a Cloudflare account id"),
    (r"https?://[\w-]+\.(?!example-account\b)[\w-]+\.workers\.dev", "a workers.dev account address"),
    (r"\b(?:ghp|gho|ghu|ghs|github_pat)_[A-Za-z0-9_]{20,}|\bsk-[A-Za-z0-9]{20,}|\bAKIA[0-9A-Z]{16}\b|-----BEGIN [A-Z ]*PRIVATE KEY", "a key or token"),
]
BLOCKED = re.compile(r"(?i)^(?:\.claude|backups?)/|(?:^|/)\.env(?:\.|$)|\.(?:pem|key|p12|pfx)$|(?:^|/)cloudflare-token")


def allowed():
    f = ROOT / "scripts" / "commit_guard_allow.txt"
    return [l.strip() for l in f.read_text(encoding="utf-8").splitlines() if l.strip() and not l.startswith("#")] if f.exists() else []


def candidates(staged):
    cmd = ["git", "diff", "--cached", "--name-only", "--diff-filter=ACMR"] if staged else ["git", "ls-files", "--cached", "--others", "--exclude-standard"]
    return [l for l in subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True).stdout.splitlines() if l]


def scan(staged=False):
    ok, found = allowed(), []
    for rel in candidates(staged):
        if rel == "scripts/commit_guard.py":
            continue
        if BLOCKED.search(rel):
            found.append(f"{rel}: private file")
            continue
        p = ROOT / rel
        if not p.is_file() or p.stat().st_size > 5_000_000:
            continue
        data = p.read_bytes()
        if b"\x00" in data[:4096]:
            continue
        for n, line in enumerate(data.decode("utf-8", "replace").splitlines(), 1):
            for phrase in ok:
                line = line.replace(phrase, "")
            for rx, what in RULES:
                for m in re.finditer(rx, line):
                    if not any(h in m.group(0) for h in EXAMPLE_HOSTS):
                        found.append(f"{rel}:{n}: {what}: {m.group(0)[:60]!r}")
    return found


def main():
    found = scan(staged="--staged" in sys.argv)
    if found:
        safe_log("Commit guard: blocked. Nothing was committed or pushed.\n")
        for f in found:
            safe_log("  -", f)
        safe_log("\nReplace these with placeholders, or add a reviewed exact phrase to scripts/commit_guard_allow.txt.")
        return 1
    safe_log("Commit guard: clean.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
