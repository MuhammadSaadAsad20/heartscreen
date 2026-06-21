"""
Deploy HeartScreen to a free Hugging Face Space (Docker SDK).

Prerequisite: authenticate once in a terminal:
    hf auth login          (or: huggingface-cli login)
and paste a WRITE access token from https://huggingface.co/settings/tokens

Then run:
    py -3.12 deploy/hf_deploy.py
"""
import os
import sys

from huggingface_hub import HfApi

SPACE_NAME = "heartscreen"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

README = """---
title: HeartScreen
sdk: docker
app_port: 7860
pinned: false
license: mit
---

# HeartScreen

Heart-disease risk prediction web app (Flask + scikit-learn). Four models are
trained locally on the combined UCI Heart Disease dataset and compared on a
dashboard; the best one powers an instant risk prediction. No external APIs.

Educational project — **not a medical device**.
"""

# Files/folders that should NOT be uploaded to the Space.
IGNORE = [
    ".git*", ".git/*", "node_modules/*", "launch/*", ".claude/*",
    "__pycache__/*", "**/__pycache__/*", "*.pyc", "*.log",
    "package.json", "package-lock.json", "README.md",
]


def main():
    api = HfApi()
    try:
        me = api.whoami()
    except Exception as exc:  # not logged in
        print("ERROR: not authenticated with Hugging Face.")
        print("Run  `hf auth login`  (or `huggingface-cli login`) and paste a WRITE token, then retry.")
        print("Details:", exc)
        sys.exit(1)

    user = me.get("name") or me.get("fullname")
    repo_id = f"{user}/{SPACE_NAME}"
    print(f"Authenticated as: {user}")
    print(f"Creating / updating Space: {repo_id}")

    api.create_repo(repo_id=repo_id, repo_type="space", space_sdk="docker",
                    exist_ok=True, private=False)

    # Configured README (front-matter tells HF this is a Docker space on port 7860)
    api.upload_file(path_or_fileobj=README.encode("utf-8"), path_in_repo="README.md",
                    repo_id=repo_id, repo_type="space",
                    commit_message="Configure Docker space")

    print("Uploading project files (this may take a minute)...")
    api.upload_folder(folder_path=ROOT, repo_id=repo_id, repo_type="space",
                      ignore_patterns=IGNORE,
                      commit_message="Deploy HeartScreen Flask app")

    print("\nDone! Your Space is building now.")
    print(f"  Space page : https://huggingface.co/spaces/{repo_id}")
    print(f"  Live app   : https://{user}-{SPACE_NAME}.hf.space")
    print("First build takes ~3-5 minutes (installing dependencies).")


if __name__ == "__main__":
    main()
