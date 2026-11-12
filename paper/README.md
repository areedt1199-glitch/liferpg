# บทความ AUCC2027 (Oral, ภาษาไทย) — v3

| ไฟล์ | คืออะไร |
|---|---|
| `liferpg-AUCC2027-oral-th.docx` | บทความบน template ทางการ (`template/template_oral_thai.docx`) ฟอนต์ TH SarabunPSK สร้างจาก `build.mjs` ห้ามแก้ตัวเลขผลด้วยมือ |
| `liferpg-AUCC2027-oral-th.pdf` | PDF จาก LibreOffice ฝังฟอนต์ TH SarabunPSK (`pdf.sh`) |
| `change-summary.docx`, `form-answers.md` | สรุปสิ่งที่แก้ v3 และร่างคำตอบแบบฟอร์ม (`summary.mjs`) |
| `raw-data.xlsx` | ข้อมูลดิบทั้งหมด: งาน 90 ชิ้น+เฉลย, ผลตัดสินทุกครั้ง, log ทดสอบ 69 กรณี, log โมเดลหลัก, ผลโจมตีระบบจริง (`sheets.mjs`) |
| `rater2-blind.xlsx` | ไฟล์ให้ผู้ตัดสินคนที่สองเฉลย (สลับลำดับ ไม่มีเฉลยผู้วิจัย) |
| `evaluation/cases.mjs`, `cases-v3.mjs` | งานทดสอบ 70 + 20 ชิ้น (งานกำกวม 12, แทรกคำสั่งแบบยาก 8) |
| `evaluation/run.mjs` | ส่งงานให้ Gemini ด้วย prompt/schema/model เดียวกับ `src/app/api/review/route.ts` บันทึก modelVersion และรหัสตอบกลับของโมเดลหลัก |
| `evaluation/attack-prod.mjs` | โจมตีระบบที่เผยแพร่จริง 10 แบบด้วย anon key (ไม่แก้ข้อมูลจริง) |
| `evaluation/v2/` | ผลของรอบ v2 (70 ชิ้น) เก็บไว้เทียบ |

## รันทั้งหมดใหม่ (จากโฟลเดอร์ `liferpg`)

```bash
node paper/evaluation/run.mjs run1            # ทำ run2 run3 ด้วย
node paper/evaluation/run.mjs run1 --retry    # ส่งใหม่เฉพาะที่ error
node paper/evaluation/run.mjs main1 --main-only   # ลองเฉพาะโมเดลหลัก (ผลไม่ถูกนับในบทความ)
node paper/evaluation/attack-prod.mjs
npm test > paper/evaluation/npm-test-log-<วันที่>.txt
```

จากนั้น (ต้องมี docx, jszip, exceljs ใน `MODULES`):

```bash
export MODULES=/path/to/node_modules
node paper/sheets.mjs --read-rater   # หลังผู้ตัดสินคนที่สองกรอก rater2-blind.xlsx
paper/pdf.sh
node paper/summary.mjs
node paper/sheets.mjs
```

ฟอนต์: ไฟล์ TH SarabunPSK ที่ติดตั้งในเครื่องนี้ (จาก github.com/SarabunConsortium/TH-Sarabun-PSK, OFL) ชื่อ family คือ "TH Sarabun PSK" `pdf.sh` จึงสร้างสำเนาที่ใช้ชื่อนี้เพื่อทำ PDF ส่วน .docx ใช้ชื่อตาม template คือ "TH SarabunPSK"
