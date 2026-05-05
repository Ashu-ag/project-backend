from fpdf import FPDF

class PDF(FPDF):
    def header(self):
        self.set_font("Helvetica", 'B', 16)
        self.cell(0, 10, "Classroom Application - Interview Q&A", 0, 1, 'C')
        self.ln(5)

    def chapter_title(self, title):
        self.set_font("Helvetica", 'B', 14)
        self.cell(0, 10, title, 0, 1, 'L')
        self.ln(2)

pdf = PDF()
pdf.add_page()
pdf.set_auto_page_break(auto=True, margin=15)

with open('Project_QA.md', 'r', encoding='utf-8') as f:
    text = f.read()

lines = text.split('\n')
for line in lines:
    if line.startswith('## '):
        pdf.chapter_title(line[3:])
    elif line.startswith('# '):
        continue
    elif line.startswith('**Q:'):
        pdf.set_font("Helvetica", 'B', 12)
        pdf.multi_cell(0, 6, line.replace('**', ''))
        pdf.ln(1)
    elif line.startswith('**A:'):
        pdf.set_font("Helvetica", '', 11)
        pdf.multi_cell(0, 6, line.replace('**A:**', 'A:').replace('**', ''))
        pdf.ln(3)
    elif line.strip() == '':
        pdf.ln(2)
    else:
        pdf.set_font("Helvetica", '', 11)
        pdf.multi_cell(0, 6, line.replace('**', ''))

pdf.output('Project_QA.pdf')
