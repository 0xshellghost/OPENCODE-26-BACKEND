#!/bin/bash

CURRENT_DB="OPENCODE"
echo "Creating a copy of DB in root directory: $CURRENT_DB"

sudo mysqldump ${CURRENT_DB} > ../${CURRENT_DB}_testing.sql
