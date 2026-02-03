import os
import sys
import argparse
import subprocess
import fileinput
import re

VERSION_FILE = 'connector_app/version.py'

def get_current_version():
    with open(VERSION_FILE, 'r') as f:
        content = f.read()
        match = re.search(r'__version__\s*=\s*"([^"]+)"', content)
        if match:
            return match.group(1)
    return "0.0.0"

def update_version_file(new_version):
    with fileinput.FileInput(VERSION_FILE, inplace=True) as file:
        for line in file:
            print(re.sub(r'__version__\s*=\s*"[^"]+"', f'__version__ = "{new_version}"', line), end='')

def run_git_commands(version, message):
    try:
        tag_name = f"v{version}"
        print(f"Adding files...")
        subprocess.run(["git", "add", "."], check=True)
        print(f"Committing version bump...")
        subprocess.run(["git", "commit", "-m", f"chore: bump version to {version}\n\n{message}"], check=True)
        print(f"Creating tag {tag_name}...")
        subprocess.run(["git", "tag", tag_name], check=True)
        print(f"Pushing to origin...")
        subprocess.run(["git", "push", "origin", "main", "--tags"], check=True)
        print("Done! GitHub Actions should start building the release shortly.")
    except subprocess.CalledProcessError as e:
        print(f"Error executing git command: {e}")
        sys.exit(1)

def main():
    parser = argparse.ArgumentParser(description="ProBPA Connector Release Tool")
    parser.add_argument("version", help="New version number (e.g., 3.3.0)")
    parser.add_argument("-m", "--message", help="Release notes/message", default="Automated release")
    
    args = parser.parse_args()
    
    current = get_current_version()
    print(f"Current version: {current}")
    print(f"New version:     {args.version}")
    
    if args.version == current:
        print("Version is unchanged. Aborting.")
        return

    update_version_file(args.version)
    run_git_commands(args.version, args.message)

if __name__ == "__main__":
    main()
