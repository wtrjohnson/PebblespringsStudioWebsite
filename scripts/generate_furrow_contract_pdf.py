from pathlib import Path

from PIL import Image as PILImage
from PIL import ImageDraw, ImageFont
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    Image,
    ListFlowable,
    ListItem,
    NextPageTemplate,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "pdf" / "furrow-strategies-website-development-proposal.pdf"
LOGO = ROOT / "public" / "PSLogo.png"
MANROPE = Path.home() / "Library" / "Fonts" / "Manrope-VariableFont_wght.ttf"
MANROPE_STATIC = Path.home() / "Downloads" / "Manrope" / "static"
COVER_IMAGE = ROOT / "output" / "pdf" / "furrow-strategies-cover.png"

PAGE_WIDTH, PAGE_HEIGHT = letter
MARGIN_X = 0.72 * inch
MARGIN_TOP = 0.72 * inch
MARGIN_BOTTOM = 0.62 * inch
ORANGE = colors.HexColor("#ff5c00")
GREEN = colors.HexColor("#0a6c64")
BLACK = colors.HexColor("#090909")
MID = colors.HexColor("#6f6f69")
WASH = colors.HexColor("#e4e4e1")
LIGHT = colors.HexColor("#f4f4f2")
FONT = "Manrope-Regular"
FONT_MEDIUM = "Manrope-Medium"
FONT_BOLD = "Manrope-Bold"

if (MANROPE_STATIC / "Manrope-Regular.ttf").exists():
    pdfmetrics.registerFont(TTFont(FONT, str(MANROPE_STATIC / "Manrope-Regular.ttf")))
    pdfmetrics.registerFont(TTFont(FONT_MEDIUM, str(MANROPE_STATIC / "Manrope-Medium.ttf")))
    pdfmetrics.registerFont(TTFont(FONT_BOLD, str(MANROPE_STATIC / "Manrope-Bold.ttf")))
elif MANROPE.exists():
    FONT = "Manrope"
    FONT_MEDIUM = "Manrope"
    FONT_BOLD = "Manrope"
    pdfmetrics.registerFont(TTFont(FONT, str(MANROPE)))
else:
    FONT = "Helvetica"
    FONT_MEDIUM = "Helvetica"
    FONT_BOLD = "Helvetica-Bold"


def p(text, style):
    return Paragraph(text, style)


def weighted_font(size, weight):
    font = ImageFont.truetype(str(MANROPE), size)

    if hasattr(font, "set_variation_by_axes"):
        font.set_variation_by_axes([weight])

    return font


def draw_tracked_line(draw, position, text, font, fill, tracking):
    x, y = position

    for char in text:
        if char == " ":
            x += draw.textlength(char, font=font) + abs(tracking)
            continue

        draw.text((x, y), char, font=font, fill=fill)
        x += draw.textlength(char, font=font)

        x += tracking


def draw_tracked_block(draw, position, lines, font, fill, tracking, leading):
    x, y = position

    for line in lines:
        draw_tracked_line(draw, (x, y), line, font, fill, tracking)
        y += leading


def build_cover_image():
    scale = 3
    width = int(PAGE_WIDTH * scale)
    height = int(PAGE_HEIGHT * scale)
    margin = int(MARGIN_X * scale)
    top_margin = int(MARGIN_TOP * scale)
    cover = PILImage.new("RGB", (width, height), "white")
    draw = ImageDraw.Draw(cover)

    if LOGO.exists():
        logo_size = int(0.72 * inch * scale)
        logo = PILImage.open(LOGO).convert("RGBA")
        logo = logo.resize((logo_size, logo_size), PILImage.Resampling.LANCZOS)
        cover.paste(logo, (margin, top_margin), logo)

    black = "#090909"
    brand_font = weighted_font(18 * scale, 760)
    proposal_font = weighted_font(24 * scale, 780)

    draw_tracked_block(
        draw,
        (margin, top_margin + int(1.05 * inch * scale)),
        ["Pebblesprings", "Studio"],
        brand_font,
        black,
        tracking=-2.7,
        leading=int(0.25 * inch * scale),
    )
    draw_tracked_block(
        draw,
        (margin, height - int(1.08 * inch * scale)),
        ["Web Development Proposal", "Furrow Strategies"],
        proposal_font,
        black,
        tracking=-3.6,
        leading=int(0.35 * inch * scale),
    )

    COVER_IMAGE.parent.mkdir(parents=True, exist_ok=True)
    cover.save(COVER_IMAGE, "PNG")


def bullet_items(items, style):
    return ListFlowable(
        [ListItem(p(item, style), leftIndent=0) for item in items],
        bulletType="bullet",
        start="circle",
        bulletFontName=FONT,
        bulletFontSize=6,
        bulletColor=ORANGE,
        leftIndent=14,
        bulletIndent=0,
    )


def draw_page(canvas, doc):
    canvas.saveState()
    page = canvas.getPageNumber() - 1
    canvas.setStrokeColor(WASH)
    canvas.setLineWidth(1)
    canvas.line(MARGIN_X, 0.5 * inch, PAGE_WIDTH - MARGIN_X, 0.5 * inch)
    canvas.setFont(FONT, 8)
    canvas.setFillColor(MID)
    canvas.drawString(MARGIN_X, 0.33 * inch, "Pebblesprings Studio")
    canvas.drawRightString(PAGE_WIDTH - MARGIN_X, 0.33 * inch, f"Page {page}")
    canvas.restoreState()


def draw_text_block(canvas, x, y, lines, size, leading, char_space, weight_passes=1):
    offsets = [(0, 0), (0.14, 0), (0, 0.14), (0.14, 0.14)]

    for dx, dy in offsets[:weight_passes]:
        text = canvas.beginText(x + dx, y + dy)
        text.setFont(FONT_BOLD, size)
        text.setLeading(leading)
        text.setCharSpace(char_space)

        for line in lines:
            text.textLine(line)

        canvas.drawText(text)


def draw_cover(canvas, doc):
    canvas.saveState()
    canvas.drawImage(str(COVER_IMAGE), 0, 0, width=PAGE_WIDTH, height=PAGE_HEIGHT)
    canvas.restoreState()


def styles():
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "Title",
            parent=base["Title"],
            fontName=FONT_BOLD,
            fontSize=22,
            leading=24,
            textColor=BLACK,
            spaceAfter=16,
        ),
        "kicker": ParagraphStyle(
            "Kicker",
            parent=base["Normal"],
            fontName=FONT_BOLD,
            fontSize=8,
            leading=10,
            textColor=ORANGE,
            uppercase=True,
            spaceAfter=10,
        ),
        "meta": ParagraphStyle(
            "Meta",
            parent=base["Normal"],
            fontName=FONT,
            fontSize=9.5,
            leading=13,
            textColor=MID,
        ),
        "body": ParagraphStyle(
            "Body",
            parent=base["Normal"],
            fontName=FONT_MEDIUM,
            fontSize=9.8,
            leading=14,
            textColor=BLACK,
            spaceAfter=8,
        ),
        "body_bold": ParagraphStyle(
            "BodyBold",
            parent=base["Normal"],
            fontName=FONT_BOLD,
            fontSize=9.8,
            leading=14,
            textColor=BLACK,
            spaceAfter=8,
        ),
        "section": ParagraphStyle(
            "Section",
            parent=base["Heading2"],
            fontName=FONT_BOLD,
            fontSize=14,
            leading=17,
            textColor=BLACK,
            spaceBefore=14,
            spaceAfter=8,
        ),
        "small": ParagraphStyle(
            "Small",
            parent=base["Normal"],
            fontName=FONT,
            fontSize=8.4,
            leading=11,
            textColor=MID,
        ),
        "table_label": ParagraphStyle(
            "TableLabel",
            parent=base["Normal"],
            fontName=FONT_BOLD,
            fontSize=9.2,
            leading=11,
            textColor=BLACK,
        ),
        "table_text": ParagraphStyle(
            "TableText",
            parent=base["Normal"],
            fontName=FONT_MEDIUM,
            fontSize=9.2,
            leading=12,
            textColor=BLACK,
        ),
        "right": ParagraphStyle(
            "Right",
            parent=base["Normal"],
            fontName=FONT,
            fontSize=9,
            leading=12,
            textColor=MID,
            alignment=TA_RIGHT,
        ),
        "left": ParagraphStyle(
            "Left",
            parent=base["Normal"],
            fontName=FONT,
            fontSize=9,
            leading=12,
            textColor=MID,
            alignment=TA_LEFT,
        ),
    }


def summary_table(s):
    data = [
        [p("Client", s["table_label"]), p("Cory Harris / Furrow Strategies", s["table_text"])],
        [p("Studio", s["table_label"]), p("Pebblesprings Studio", s["table_text"])],
        [p("Project", s["table_label"]), p("Website Development Proposal", s["table_text"])],
        [p("Timeline", s["table_label"]), p("4-6 weeks from signed agreement, deposit, and asset delivery", s["table_text"])],
        [p("Project Fee", s["table_label"]), p("$1,250 total - 50% due at signing, 50% due upon acceptance", s["table_text"])],
    ]
    table = Table(data, colWidths=[1.35 * inch, 5.25 * inch])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), LIGHT),
                ("BOX", (0, 0), (-1, -1), 0.75, WASH),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.white),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    return table


def signature_block(s):
    table = Table(
        [
            [
                p("Pebblesprings Studio", s["table_label"]),
                "",
                p("Furrow Strategies", s["table_label"]),
            ],
            ["", "", ""],
            [p("William Johnson", s["small"]), "", p("Cory Harris", s["small"])],
            [p("Date", s["small"]), "", p("Date", s["small"])],
        ],
        colWidths=[2.88 * inch, 0.54 * inch, 2.88 * inch],
        rowHeights=[0.25 * inch, 0.65 * inch, 0.24 * inch, 0.24 * inch],
    )
    table.setStyle(
        TableStyle(
            [
                ("LINEABOVE", (0, 2), (0, 2), 0.9, BLACK),
                ("LINEABOVE", (2, 2), (2, 2), 0.9, BLACK),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    return table


def build():
    build_cover_image()
    s = styles()
    cover_frame = Frame(
        0,
        0,
        PAGE_WIDTH,
        PAGE_HEIGHT,
        id="cover",
        leftPadding=0,
        rightPadding=0,
        topPadding=0,
        bottomPadding=0,
    )
    frame = Frame(
        MARGIN_X,
        MARGIN_BOTTOM,
        PAGE_WIDTH - (2 * MARGIN_X),
        PAGE_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM,
        id="normal",
    )
    doc = BaseDocTemplate(
        str(OUT),
        pagesize=letter,
        leftMargin=MARGIN_X,
        rightMargin=MARGIN_X,
        topMargin=MARGIN_TOP,
        bottomMargin=MARGIN_BOTTOM,
        title="Furrow Strategies Website Development Proposal",
        author="Pebblesprings Studio",
    )
    doc.addPageTemplates(
        [
            PageTemplate(id="cover", frames=[cover_frame], onPage=draw_cover, autoNextPageTemplate="main"),
            PageTemplate(id="main", frames=[frame], onPage=draw_page),
        ]
    )

    story = [
        NextPageTemplate("main"),
        Spacer(1, 0.01 * inch),
        PageBreak(),
    ]
    story.extend(
        [
            p("Website Development Proposal & Agreement", s["title"]),
            p("Prepared for Cory Harris / Furrow Strategies", s["meta"]),
            p("Prepared by Pebblesprings Studio", s["meta"]),
            p("Proposal date: July 23, 2026", s["meta"]),
            Spacer(1, 0.16 * inch),
            summary_table(s),
            Spacer(1, 0.18 * inch),
            p("Project Overview", s["section"]),
            p(
                "Pebblesprings Studio will design and develop a fully functional website for Furrow Strategies. "
                "The website will be built to establish a clear, professional online presence and provide visitors "
                "with straightforward access to firm information, services, news, and contact options.",
                s["body"],
            ),
            p("Scope of Work", s["section"]),
            bullet_items(
                [
                    "About page",
                    "Services page",
                    "In the News page",
                    "Contact page",
                    "Responsive website development for desktop and mobile visitors",
                    "Contact form setup, submission handling, and response capability",
                    "Deployment support through client-owned Vercel and GitHub accounts",
                ],
                s["body"],
            ),
            PageBreak(),
            p("Deliverables", s["section"]),
            p(
                "The final deliverable is a completed website with the capabilities described above, including "
                "working page navigation, client-provided content integration, contact form submission handling, "
                "and deployment-ready website code.",
                s["body"],
            ),
            p("Timeline", s["section"]),
            p(
                "The expected project timeline is 4-6 weeks. The timeline begins once the agreement is signed, "
                "the initial payment is received, and the client has delivered the required website assets. "
                "Delays in asset delivery, feedback, account access, approvals, or third-party services will pause "
                "the project timeline and may extend the final delivery date accordingly.",
                s["body"],
            ),
            p(
                "If the client does not provide required materials, feedback, approvals, or account access within "
                "14 days of a written request, Pebblesprings Studio may pause the project until the required item is "
                "received. A paused project may be rescheduled based on Pebblesprings Studio's availability.",
                s["body"],
            ),
            p("Pricing & Payment", s["section"]),
            p(
                "The total project fee is <b>$1,250</b>. Payment is due in two installments: 50% at signing "
                "and 50% upon project acceptance. Invoices are due within 14 days of issue. Work will not begin "
                "until the initial payment is received. Final website handoff and launch support may be withheld "
                "until the remaining balance is paid in full.",
                s["body"],
            ),
            p(
                "Any additional services after website completion will be billed at <b>$75/hr</b>, rounded to the "
                "nearest half hour.",
                s["body"],
            ),
            p("Revisions", s["section"]),
            p(
                "This project includes three rounds of revisions. A revision round is defined as a single "
                "consolidated list of changes submitted by the client. Each round must be submitted in writing. "
                "Revisions are limited to adjustments within the agreed scope.",
                s["body"],
            ),
            p(
                "New features, additional pages, or structural changes to the site constitute scope changes and "
                "will be billed accordingly. Additional revision rounds beyond what is included are billed at "
                "$75/hr.",
                s["body"],
            ),
            p("Acceptance & Completion", s["section"]),
            p(
                "The project will be considered accepted and complete when the scoped pages have been delivered "
                "and the client has indicated in writing that no further included revisions are requested.",
                s["body"],
            ),
            p(
                "After Pebblesprings Studio delivers the scoped pages for review, the client will have 14 days to "
                "provide a consolidated written revision list. If no revision list is provided within that period, "
                "the delivered work will be considered accepted and the final payment will become due.",
                s["body"],
            ),
            p("Scope Changes", s["section"]),
            p(
                "Any request beyond the agreed scope - including additional pages, new integrations, new features, "
                "major design changes, or structural changes - will require written confirmation and may be billed "
                "at the developer's hourly rate of $75/hr.",
                s["body"],
            ),
            PageBreak(),
            p("Client Responsibilities", s["section"]),
            p(
                "The client is responsible for delivering all necessary assets prior to the start of development, "
                "including but not limited to logo files, written copy, photos, and any brand guidelines. The client "
                "represents and warrants that they own or have the right to use all content provided to the developer.",
                s["body"],
            ),
            p(
                "The developer is not responsible for copyright issues arising from client-provided content. "
                "The client is responsible for the accuracy, completeness, and legality of all content included "
                "on the site.",
                s["body"],
            ),
            p("Ownership, Accounts & Access", s["section"]),
            p(
                "The client will own the Vercel account and the GitHub repository/code associated with the website. "
                "The Vercel hosting account will be created under the client's name and account information. "
                "The developer retains the right to access the GitHub code repository as needed to provide future "
                "updates, maintenance, and support.",
                s["body"],
            ),
            p(
                "Upon receipt of final payment, the client owns the completed website code and site content, except "
                "for any third-party tools, libraries, services, or assets governed by their own licenses and terms.",
                s["body"],
            ),
            PageBreak(),
            p("Launch Quality & Performance", s["section"]),
            p(
                "Pebblesprings Studio guarantees Lighthouse scores above 90 in Performance, Accessibility, Best "
                "Practices, and SEO at the time of delivery, measured against the delivered site using Google's "
                "Lighthouse testing methodology.",
                s["body"],
            ),
            p(
                "This guarantee applies to the delivered website at handoff and does not guarantee search rankings, "
                "traffic, leads, sales, revenue, or future scores affected by third-party services, hosting changes, "
                "analytics scripts, client edits, content changes, platform updates, or external conditions outside "
                "Pebblesprings Studio's control.",
                s["body"],
            ),
            p("Post-Launch Corrections", s["section"]),
            p(
                "For 14 days after launch or final handoff, Pebblesprings Studio will correct defects in the delivered "
                "work that prevent the website from functioning according to the agreed scope at no additional charge.",
                s["body"],
            ),
            p(
                "Post-launch requests that add features, revise content, change design direction, add pages, alter "
                "structure, troubleshoot third-party changes, or fall outside the agreed scope will be billed at "
                "$75/hr, rounded to the nearest half hour.",
                s["body"],
            ),
            p("Third-Party Services", s["section"]),
            p(
                "This project may involve third-party services including but not limited to Vercel, GitHub, domain "
                "registrars, email delivery tools, analytics tools, and form handling services. The client is "
                "responsible for any ongoing fees charged by third-party services. Pebblesprings Studio is not "
                "responsible for outages, pricing changes, policy changes, or discontinuation of third-party services.",
                s["body"],
            ),
            p("Credentials & Account Access", s["section"]),
            p(
                "The client is responsible for maintaining ownership, billing information, passwords, recovery methods, "
                "and administrative access for all client-owned accounts, including Vercel, GitHub, domain, email, "
                "analytics, and form-related services. The client is also responsible for granting and removing "
                "Pebblesprings Studio's access as needed.",
                s["body"],
            ),
            p("Ongoing Support", s["section"]),
            p(
                "Post-launch updates, maintenance, new pages, content changes, troubleshooting, and other additional "
                "work are available at $75/hr, billed to the nearest half hour. Ongoing support does not constitute "
                "a retainer unless a separate retainer agreement is signed.",
                s["body"],
            ),
            p("Cancellation", s["section"]),
            p(
                "Either party may terminate this agreement with written notice. Upon cancellation, the developer will "
                "deliver all work completed to that point. The deposit is non-refundable if development work has "
                "commenced. If the client cancels after substantial work has been completed, a prorated portion of "
                "the remaining balance may be due based on work completed.",
                s["body"],
            ),
            p(
                "If the developer terminates the agreement, the deposit will be refunded minus any hours already "
                "worked at the hourly rate of $75/hr.",
                s["body"],
            ),
            PageBreak(),
            p("Limitation of Liability", s["section"]),
            p(
                "To the fullest extent permitted by law, Pebblesprings Studio's total liability under this agreement "
                "will not exceed the amount paid by the client under this agreement. Pebblesprings Studio will not "
                "be liable for indirect, incidental, special, consequential, punitive, or exemplary damages, including "
                "lost profits, lost revenue, lost business, loss of goodwill, downtime, or loss of data.",
                s["body"],
            ),
            p("Indemnification", s["section"]),
            p(
                "The client agrees to indemnify and hold Pebblesprings Studio harmless from claims, damages, losses, "
                "liabilities, costs, and expenses arising from client-provided content, client business activities, "
                "the client's breach of this agreement, or the client's misuse of the website or related services.",
                s["body"],
            ),
            p("Portfolio Use & Credit", s["section"]),
            p(
                "Pebblesprings Studio retains the right to display the completed website as part of its professional "
                "portfolio, including on pebblesprings.co and in client-facing materials. Pebblesprings Studio may "
                "include a small website credit in the footer of the completed site unless otherwise agreed in writing.",
                s["body"],
            ),
            p("Governing Law", s["section"]),
            p(
                "This agreement shall be governed by and construed in accordance with the laws of the Commonwealth "
                "of Virginia. Any disputes arising under this agreement shall be resolved in the courts of Virginia.",
                s["body"],
            ),
            p("Entire Agreement", s["section"]),
            p(
                "This proposal and its terms constitute the entire agreement between the parties and supersede any "
                "prior discussions, representations, or understandings, whether written or oral.",
                s["body"],
            ),
            PageBreak(),
            p("Agreement & Signature", s["section"]),
            p(
                "By signing below, both parties agree to the terms outlined in this proposal and authorize the project "
                "to begin upon receipt of the initial payment.",
                s["body"],
            ),
            Spacer(1, 0.35 * inch),
            signature_block(s),
            Spacer(1, 0.45 * inch),
            p("Payment Schedule", s["section"]),
            Spacer(1, 0.25 * inch),
            Table(
                [
                    [p("Initial payment due at signing", s["table_label"]), p("$625", s["table_text"])],
                    [p("Final payment due upon acceptance", s["table_label"]), p("$625", s["table_text"])],
                    [p("Additional services", s["table_label"]), p("$75/hr, billed to the nearest half hour", s["table_text"])],
                ],
                colWidths=[3.25 * inch, 3.1 * inch],
                style=TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, -1), LIGHT),
                        ("BOX", (0, 0), (-1, -1), 0.75, WASH),
                        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.white),
                        ("LEFTPADDING", (0, 0), (-1, -1), 10),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                        ("TOPPADDING", (0, 0), (-1, -1), 8),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                    ]
                ),
            ),
            Spacer(1, 0.3 * inch),
            p("Proposal is valid for 30 days.", s["small"]),
        ]
    )

    doc.build(story)


if __name__ == "__main__":
    build()
