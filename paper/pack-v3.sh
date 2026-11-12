#!/usr/bin/env bash
# Builds every v3 file and copies them, named as the advisor asked, into paper/V.3/.
set -e
cd "$(dirname "$0")"
: "${MODULES:?set MODULES to a node_modules folder with docx, jszip and exceljs}"
./pdf.sh
node summary.mjs
node sheets.mjs
mkdir -p V.3
cp -f liferpg-AUCC2027-oral-th.docx "V.3/V.3_ศุภฤกษ์.docx"
cp -f liferpg-AUCC2027-oral-th.pdf "V.3/V.3_ศุภฤกษ์.pdf"
cp -f change-summary.docx "V.3/V.3_ศุภฤกษ์_สรุปสิ่งที่แก้.docx"
cp -f raw-data.xlsx "V.3/V.3_ศุภฤกษ์_ข้อมูลดิบ.xlsx"
ls -la V.3
