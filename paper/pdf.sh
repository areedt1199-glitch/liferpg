#!/usr/bin/env bash
# Builds the .docx (official template, TH SarabunPSK) and a PDF of it through LibreOffice.
# The PDF copy uses the font name "TH Sarabun PSK" because that is the family name of the installed TH SarabunPSK files.
set -e
cd "$(dirname "$0")"
: "${MODULES:?set MODULES to a node_modules folder with docx and jszip}"
node build.mjs
FONT_FAMILY="TH Sarabun PSK" OUT_NAME=pdf-build/for-pdf.docx node build.mjs > /dev/null
"/c/Program Files/LibreOffice/program/soffice.exe" --headless --convert-to pdf --outdir "$(cygpath -w "$PWD/pdf-build")" "$(cygpath -w "$PWD/pdf-build/for-pdf.docx")" > /dev/null 2>&1
mv -f pdf-build/for-pdf.pdf liferpg-AUCC2027-oral-th.pdf
node -e "const b=require('fs').readFileSync('liferpg-AUCC2027-oral-th.pdf','latin1');console.log('PDF pages',(b.match(/\/Type\s*\/Page[^s]/g)||[]).length,'| fonts',[...new Set((b.match(/\/BaseFont\s*\/[A-Za-z0-9+#-]+/g)||[]).map(f=>f.replace(/.*\+/,'')))].join(', '))"
