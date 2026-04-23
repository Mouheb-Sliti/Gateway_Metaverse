#!/usr/bin/env bash

# SPDX-FileCopyrightText: 2025 Orange SA
# SPDX-License-Identifier: MIT
#
# This software is distributed under the MIT License,
# the text of which is available at https://opensource.org/license/mit
# or see the "LICENSE.txt" file for more details.
#
# Authors: See CONTRIBUTORS.txt

# Save the current directory and change to the script's directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

pushd "$SCRIPT_DIR" 1>/dev/null || exit

# Check if helm-docs is installed first
if command -v helm-docs &> /dev/null; then
    pushd "$SCRIPT_DIR/.." 1>/dev/null || exit
    helm-docs -c "." -t "tool/README.md.gotmpl" -o "README.md"
    popd 1>/dev/null || exit
# Check if Docker is installed
elif command -v docker &> /dev/null; then
    docker run --rm --volume "$(pwd)../..:/helm-docs" -u "$(id -u)" jnorwood/helm-docs:latest \
      -c "." \
      -t "tool/README.md.gotmpl" \
      -o "README.md" \
    1>/dev/null  

else
    echo "Neither Docker nor Helm Docs is available."
fi

# Return to the original directory
popd 1>/dev/null || exit
