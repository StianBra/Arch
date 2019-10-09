#!/bin/bash
echo "Installing fonts..."
sudo mkdir /usr/share/fonts/RD

echo "Moving fonts to '/usr/share/fonts/RD'..."
sudo cp ../fonts/*.ttf ../fonts/*.otf /usr/share/fonts/RD

