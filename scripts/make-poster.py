# A5 poster for outreach option B (reports/outreach-options-2026-09-30.md).
# pip install qrcode reportlab ; python3 scripts/make-poster.py reports/assets/poster-a5.pdf
import sys, io
import qrcode
from reportlab.lib.pagesizes import A5
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader

URL = 'https://elitepro-16718.web.app/#/landing'
PRIMARY, ACCENT, TEXT, MUTED = HexColor('#4361ee'), HexColor('#ff6b35'), HexColor('#1a1d26'), HexColor('#5b6070')

out = sys.argv[1]
W, H = A5
c = canvas.Canvas(out, pagesize=A5)
c.setTitle('ElitePro — for personal trainers')
M = 14 * mm

# Header bar
c.setFillColor(PRIMARY); c.rect(0, H - 16 * mm, W, 16 * mm, stroke=0, fill=1)
c.drawImage(ImageReader('public/icon-192-v3.png'), M, H - 13 * mm, 10 * mm, 10 * mm, mask='auto')
c.setFillColor(HexColor('#ffffff')); c.setFont('Helvetica-Bold', 15)
c.drawString(M + 13 * mm, H - 9.8 * mm, 'ElitePro')

# Headline
y = H - 34 * mm
c.setFillColor(TEXT); c.setFont('Helvetica-Bold', 21)
for line in ['Still tracking clients’', 'sessions in your', 'notes app?']:
    c.drawString(M, y, line); y -= 8.5 * mm

y -= 2 * mm
c.setFillColor(MUTED); c.setFont('Helvetica', 11)
for line in ['Programmes, bookings, session packs', 'and invoices — one app, built by a PT.']:
    c.drawString(M, y, line); y -= 5.5 * mm

# Offer
y -= 5 * mm
c.setFillColor(ACCENT); c.setFont('Helvetica-Bold', 12)
c.drawString(M, y, 'FIRST FIVE COACHES'); y -= 7 * mm
c.setFillColor(TEXT); c.setFont('Helvetica', 12)
for item in ['Three months free', 'No card needed', 'No commission on what you collect']:
    c.setFillColor(PRIMARY); c.setFont('Helvetica-Bold', 12); c.drawString(M, y, '✓')
    c.setFillColor(TEXT); c.setFont('Helvetica', 12); c.drawString(M + 6 * mm, y, item)
    y -= 6.5 * mm

# QR code
qr = qrcode.QRCode(border=1, box_size=10); qr.add_data(URL); qr.make(fit=True)
buf = io.BytesIO(); qr.make_image(fill_color='#1a1d26', back_color='white').save(buf, format='PNG'); buf.seek(0)
size = 38 * mm
c.drawImage(ImageReader(buf), M, 16 * mm, size, size)
c.setFillColor(TEXT); c.setFont('Helvetica-Bold', 12)
c.drawString(M + size + 6 * mm, 16 * mm + size - 10 * mm, 'Scan to try it')
c.setFillColor(MUTED); c.setFont('Helvetica', 9)
c.drawString(M + size + 6 * mm, 16 * mm + size - 16 * mm, 'Takes a minute. Add your')
c.drawString(M + size + 6 * mm, 16 * mm + size - 20.5 * mm, 'first client straight away.')
c.setFont('Helvetica', 7.5)
c.drawString(M + size + 6 * mm, 16 * mm + 2 * mm, 'elitepro-16718.web.app')

c.showPage(); c.save()
print('wrote', out)
