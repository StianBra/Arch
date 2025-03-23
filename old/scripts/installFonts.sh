#!/bin/bash
# Created by:	Stian Bratlie
# Contact:	stiabra@stud.ntnu.no
# Last updated:	13.12.2019
# Used for installing fonts (files with type .ttf and .otf) from a given folder, 
# to another folder (typically the system-folder for fonts).
# TODO #1: Parse command-line arguments properly

# Username of the current user
username=$(whoami)

# Gets the source folder of the fonts (one folder above the script, and then down into ./fonts)
sourceDir="$(dirname $(realpath $(dirname ${BASH_SOURCE[0]})))""/fonts"

# Gets the destination folder for the fonts
targetDir="/usr/share/fonts/$username"

echo "Installing fonts..."

# Creates targetDir if it does not already exist
echo "Creating '$targetDir'..."
sudo mkdir -p "$targetDir"

# Moves (installs) the fonts
echo "Moving fonts from '$sourceDir' to '$targetDir'..."
sudo cp $sourceDir/*.ttf $sourceDir/*.otf $targetDir

# Apply new fonts
fc-cache -f -v

# We're done!
echo "Done installing fonts!"
