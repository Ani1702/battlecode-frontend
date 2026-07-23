#!/bin/bash

QUALITY=85
SOURCE_DIR="${1:-.}"

find "$SOURCE_DIR" -type f \( \
    -iname "*.jpg" -o \
    -iname "*.jpeg" -o \
    -iname "*.png" -o \
    -iname "*.bmp" -o \
    -iname "*.gif" -o \
    -iname "*.tif" -o \
    -iname "*.tiff" -o \
    -iname "*.svg" -o \
    -iname "*.webp" \
\) | while IFS= read -r file; do

    # Skip existing webp files
    [[ "${file##*.}" =~ ^[Ww][Ee][Bb][Pp]$ ]] && continue

    output="${file%.*}.webp"

    echo "Converting:"
    echo "  $file"
    echo "  -> $output"

    if magick "$file" -quality "$QUALITY" "$output"; then
        echo "✓ Success"
    else
        echo "✗ Failed: $file"
    fi

done

echo "Finished."