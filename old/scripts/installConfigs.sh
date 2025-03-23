#!/bin/bash

# Locations
COMPTON_DIR="~/.config"
I3_DIR="~/.config/i3"
POLYBAR_DIR"=~/.config/polybar"

# Compton
sudo mv $COMPTON_DIR/compton.conf $COMPTON_DIR/compton.old
sudo cp ../config/compton_conf $COMPTON_DIR/compton.conf

# i3
sudo mv $I3_DIR/config $I3_DIR/config.old
sudo cp ../config/i3_conf $I3_DIR/config

# Polybar
sudo mv $POLYBAR_DIR/config $POLYBAR_DIR/config.old
sudo cp ../config/polybar_conf $POLYBAR_DIR/config
