#!/usr/bin/env python3
"""Baut die Kachelkarten von Akt I und schreibt sie nach src/karten-bild.js.

Jede Karte wird hier mit ein paar Befehlen beschrieben (Boden, Fels, Leitern,
Wasser, Anker). Das Ergebnis sind Textzeilen, wie sie level.js liest:
  #  Fels   X  Mauer   W  Holz   =  Steg   H  Leiter   ~  Wasser
  ^  Stacheln   %  brüchige Wand   |  Gitter
Buchstaben und Ziffern (außer H, W, X) sind Anker für Objekte aus karten.js.

Aufruf:  python3 mond/werkzeug/karten.py
"""
import pathlib

HIER = pathlib.Path(__file__).resolve().parent
ZIEL = HIER.parent / 'src' / 'karten-bild.js'
BODEN = set('#XW=H%|')


class Karte:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.g = [[' '] * w for _ in range(h)]
        self.anker = {}

    def setze(self, x, y, c):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.g[y][x] = c

    def r(self, x0, y0, x1, y1, c='#'):
        """Rechteck füllen (Grenzen eingeschlossen)."""
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                self.setze(x, y, c)

    def luft(self, x0, y0, x1, y1):
        self.r(x0, y0, x1, y1, ' ')

    def boden(self, x0, x1, y, c='#'):
        """Boden mit Oberkante in Zeile y, gefüllt bis ganz unten."""
        self.r(x0, y, x1, self.h - 1, c)

    def stufen(self, x0, y0, x1, y1, c='#'):
        """Treppe: Oberkante wandert gleichmäßig von (x0, y0) nach (x1, y1)."""
        n = max(1, abs(x1 - x0))
        for i in range(n + 1):
            x = x0 + (i if x1 >= x0 else -i)
            y = round(y0 + (y1 - y0) * i / n)
            self.boden(x, x, y, c)

    def steg(self, x0, x1, y):
        self.r(x0, y, x1, y, '=')

    def leiter(self, x, y0, y1):
        """Leiter von Zeile y0 (oberste Sprosse, auf Höhe des oberen Bodens) bis y1."""
        self.r(x, y0, x, y1, 'H')

    def wasser(self, x0, x1, y0):
        """Füllt ab Zeile y0 nach unten mit Wasser, bis Boden kommt."""
        for x in range(x0, x1 + 1):
            y = y0
            while y < self.h and self.g[y][x] == ' ':
                self.g[y][x] = '~'
                y += 1

    def a(self, x, y, c):
        """Anker genau auf (x, y)."""
        assert c not in 'HWX' and len(c) == 1, c
        assert c not in self.anker, ('Anker doppelt', c)
        assert self.g[y][x] in ' ', ('Anker nicht in Luft', c, x, y, self.g[y][x])
        self.anker[c] = (x, y)
        self.g[y][x] = c

    def marke(self, x, y, c):
        """Anker ohne Objekt, nur als Markierung (etwa welche Spalte ein Hebel öffnet)."""
        assert c not in self.anker, ('Anker doppelt', c)
        self.anker[c] = (x, y)
        self.g[y][x] = c

    def auf(self, x, c, von=0):
        """Anker auf den ersten Boden unterhalb von Zeile „von“ stellen."""
        y = von
        while y < self.h and self.g[y][x] not in BODEN and self.g[y][x] != '~':
            y += 1
        self.a(x, y - 1, c)

    def zeilen(self):
        return [''.join(r).rstrip() for r in self.g]


K = {}

# ---------------------------------------------------------------- Strandung
def kiesstrand():
    k = Karte(120, 26)
    k.stufen(0, 23, 6, 23); k.stufen(6, 23, 11, 18)
    k.boden(12, 23, 18)
    k.boden(24, 26, 16)                 # Fels zum Überspringen
    k.boden(27, 30, 18)
    k.boden(31, 31, 19); k.boden(32, 34, 20); k.boden(35, 35, 19)   # Tümpel
    k.boden(36, 71, 18)
    k.boden(72, 100, 8)                 # Felsnase
    k.luft(72, 14, 100, 17)             # Durchgang unten
    k.r(93, 3, 100, 7)                  # Kappe oben
    k.luft(94, 4, 99, 7)                # kleine Höhle
    k.r(93, 4, 93, 7, '%')              # brüchige Wand davor
    k.leiter(71, 8, 17)
    k.boden(101, 119, 18)
    k.luft(112, 18, 115, 19); k.boden(112, 112, 19); k.boden(115, 115, 19)
    k.wasser(0, 11, 18); k.wasser(31, 35, 18); k.wasser(112, 115, 18)
    k.a(13, 17, 's'); k.a(17, 17, 'b'); k.a(21, 17, 'j'); k.a(30, 17, 'm')
    k.a(39, 17, 'h'); k.a(47, 17, 'e'); k.a(56, 17, 'B'); k.a(62, 17, 'k'); k.a(68, 17, 'l')
    k.a(78, 7, 'q'); k.a(89, 7, 'w'); k.a(97, 7, 'g')
    k.a(86, 17, 'c'); k.a(106, 17, 'p'); k.a(113, 17, 'u'); k.a(118, 17, 'z')
    return k


def wrackfeld():
    k = Karte(150, 32)
    k.boden(0, 101, 24)
    k.luft(38, 24, 41, 25); k.boden(38, 38, 25); k.boden(41, 41, 25)   # Tümpel
    # kleines Wrack
    k.r(22, 22, 23, 23, 'W'); k.r(24, 20, 26, 23, 'W'); k.r(27, 18, 33, 23, 'W'); k.r(34, 20, 34, 23, 'W')
    # die Seraphine
    k.r(55, 14, 101, 14, 'W')           # Deck
    k.r(55, 15, 56, 19, 'W')            # Bordwand links, darunter ein Leck
    k.r(100, 15, 101, 23, 'W')          # Bordwand rechts
    k.leiter(70, 14, 23)                # Luke
    k.r(86, 13, 87, 13, 'W'); k.r(88, 12, 89, 13, 'W'); k.r(90, 11, 91, 13, 'W'); k.r(92, 10, 101, 13, 'W')  # Achterdeck
    # Bucht mit tiefem Wasser, Mastreste als Stege
    k.boden(102, 121, 30)
    k.steg(104, 106, 12); k.steg(110, 112, 13); k.steg(116, 118, 14)
    k.boden(122, 133, 16)
    k.boden(134, 149, 24)
    # Klippe mit Überhang, Leiter und verborgener Bucht dahinter
    k.r(141, 10, 149, 23); k.r(136, 10, 140, 11)
    k.leiter(135, 10, 23)
    k.r(141, 20, 141, 23, '%'); k.luft(142, 20, 147, 23)
    k.wasser(38, 41, 24); k.wasser(102, 121, 24)
    k.a(2, 23, 'a'); k.a(30, 17, '1'); k.a(45, 23, '2'); k.a(62, 23, 't'); k.a(66, 23, 'k')
    k.a(76, 23, '3'); k.a(80, 23, 'l'); k.a(92, 22, 'L'); k.a(94, 23, 'o'); k.a(95, 23, 'p')
    k.a(75, 13, 'm'); k.a(80, 13, '4'); k.a(97, 9, 'f'); k.a(136, 23, '5'); k.a(138, 23, '6')
    k.a(139, 23, 'w'); k.a(143, 23, 'y'); k.a(146, 23, 'b'); k.a(147, 9, 'z'); k.a(12, 23, 'e')
    return k


def bucht():
    k = Karte(64, 30)
    k.r(0, 0, 63, 29)
    k.luft(0, 8, 8, 11)                 # Gang von der Klippe
    k.luft(9, 5, 62, 26)                # Grotte
    k.stufen(9, 12, 20, 20)
    k.boden(21, 29, 20)
    k.boden(33, 34, 20); k.boden(38, 39, 20); k.boden(42, 43, 20)
    k.boden(45, 62, 20)
    k.r(57, 14, 62, 15)                 # Sims
    k.steg(49, 51, 18); k.steg(53, 55, 16)
    k.wasser(30, 44, 21)
    k.a(2, 11, 'a'); k.a(13, 12, 'e'); k.a(22, 19, '1'); k.a(27, 19, '2'); k.a(37, 20, 'l')
    k.a(47, 19, 'g'); k.a(53, 19, 'r'); k.a(60, 19, 's'); k.a(61, 13, 'm')
    return k


def leuchtturm():
    k = Karte(110, 36)
    k.boden(0, 14, 20); k.stufen(14, 20, 19, 18); k.boden(20, 90, 18)
    k.r(91, 18, 97, 19)                 # Überhang über dem Kellertor
    k.boden(91, 109, 26)
    k.leiter(98, 18, 25)
    k.a(2, 19, 'a'); k.a(24, 17, 'e'); k.a(30, 17, 'f'); k.a(34, 17, 'n'); k.a(40, 17, 'L')
    k.a(46, 17, 't'); k.a(46, 16, 'T'); k.a(56, 17, 'g'); k.a(70, 17, 'b'); k.a(84, 17, 'r')
    k.a(92, 25, 'k'); k.a(104, 25, '1'); k.a(107, 25, 'z')
    return k


def leuchtturm_innen():
    k = Karte(34, 64)
    k.r(0, 0, 33, 63, 'X')
    k.luft(4, 4, 29, 59)
    for y in (48, 36, 24, 12):
        k.r(4, y, 29, y, 'X')
    k.leiter(26, 48, 59); k.leiter(6, 36, 47); k.leiter(27, 24, 35); k.leiter(5, 12, 23)
    k.r(18, 7, 29, 7, 'X'); k.r(18, 8, 18, 11, '|')   # Lampenraum mit Gitter
    k.a(16, 59, 't'); k.a(9, 59, 'b'); k.a(13, 59, 'k'); k.a(21, 59, '6')
    k.a(12, 47, '1'); k.a(20, 47, '7')
    k.a(16, 35, '2'); k.a(22, 35, '3')
    k.a(10, 23, 'c'); k.a(20, 23, '4'); k.a(14, 23, '8')
    k.a(15, 11, 'h'); k.marke(18, 0, 'q'); k.a(23, 11, 'w'); k.a(27, 11, 'm'); k.a(10, 11, '9')
    return k


def klippenpfad():
    k = Karte(150, 44)
    k.boden(0, 21, 30)
    k.boden(22, 40, 22)
    k.boden(41, 43, 31)                 # Grube mit Wasser
    k.boden(44, 60, 22)
    k.boden(61, 80, 20)
    k.r(66, 12, 78, 14)                 # Überhang
    k.boden(81, 106, 20)
    k.r(82, 12, 106, 13)                # oberer Sims
    k.boden(107, 149, 12)
    k.leiter(21, 22, 29); k.leiter(81, 12, 19)
    k.luft(5, 32, 105, 37)              # Gang unter der Klippe
    k.leiter(105, 20, 37)
    k.r(60, 37, 62, 37, '^')
    # Nische über dem Pfad
    k.r(138, 1, 149, 7); k.luft(139, 2, 144, 5); k.r(138, 2, 138, 5, '%')
    k.r(133, 6, 137, 7); k.leiter(132, 6, 11)
    k.wasser(41, 43, 26)
    k.a(2, 29, 'a'); k.a(10, 29, '3'); k.a(30, 21, 'h'); k.a(36, 21, 'f'); k.a(52, 21, 'e'); k.a(57, 21, '4')
    k.a(72, 19, 'o'); k.a(120, 11, 'K'); k.a(124, 11, 'm'); k.a(127, 11, 'n'); k.a(142, 5, 'c'); k.a(147, 11, 'z')
    k.a(7, 37, 'k'); k.a(20, 37, 'l'); k.a(40, 37, '1'); k.a(46, 37, '2'); k.a(100, 19, 'w')
    return k


def mole():
    k = Karte(140, 30)
    k.boden(0, 12, 12)
    k.stufen(13, 13, 18, 18)
    k.boden(19, 139, 18, 'X')
    k.luft(44, 18, 47, 18)
    k.r(100, 9, 106, 13, 'X'); k.leiter(99, 9, 17)
    k.wasser(44, 47, 18)
    k.a(2, 11, 'a'); k.a(24, 17, 'L'); k.a(30, 17, 'f'); k.a(38, 17, 's'); k.a(45, 17, '4')
    k.a(58, 17, '1'); k.a(72, 17, '2'); k.a(76, 17, '3'); k.a(90, 17, 'M'); k.a(104, 8, 'c')
    k.a(112, 17, 'v'); k.a(125, 17, '5'); k.a(137, 17, 'z')
    return k


def nebel():
    k = Karte(80, 26)
    k.boden(0, 79, 18, 'X')
    k.a(2, 17, 'a'); k.a(8, 17, 'e'); k.a(34, 17, 'g'); k.a(60, 17, 'v'); k.a(68, 17, 'b'); k.a(77, 17, 'z')
    return k


# ---------------------------------------------------------------- Salzmarsch
def salzpfad():
    k = Karte(170, 30)
    k.boden(0, 169, 26)
    for x0, x1 in ((0, 30), (35, 58), (62, 90), (116, 133)):
        k.boden(x0, x1, 18)
    k.steg(31, 34, 18); k.steg(91, 93, 18); k.steg(96, 100, 18)
    k.boden(101, 115, 20)
    k.steg(134, 166, 18); k.r(167, 18, 169, 25)
    k.leiter(150, 18, 25)
    k.wasser(0, 133, 20); k.wasser(101, 115, 18)
    k.a(2, 17, 'a'); k.a(8, 17, 's'); k.a(14, 17, 'e'); k.a(20, 17, 'B'); k.a(29, 17, 'w'); k.a(45, 17, '1')
    k.a(70, 17, 'b'); k.a(76, 17, '2'); k.a(82, 17, '3'); k.a(108, 17, '4'); k.a(125, 17, 'c')
    k.a(140, 17, 'd'); k.a(145, 17, '5'); k.a(168, 17, 'z')
    k.a(143, 25, '7'); k.a(155, 25, '8'); k.a(158, 25, 'g'); k.a(162, 25, 'y'); k.a(165, 25, 'x')
    return k


def schilf():
    k = Karte(100, 28)
    k.boden(0, 99, 20)
    k.luft(15, 20, 20, 21); k.luft(45, 20, 50, 26); k.boden(47, 48, 19); k.luft(68, 20, 72, 20)
    k.r(97, 0, 99, 19)
    k.wasser(15, 20, 20); k.wasser(45, 46, 20); k.wasser(49, 50, 20); k.wasser(68, 72, 20)
    k.a(3, 19, 'a'); k.a(10, 19, 'p'); k.a(25, 19, 'q'); k.a(30, 19, '1'); k.a(34, 19, '2'); k.a(38, 19, '3')
    k.a(55, 19, 'g'); k.a(62, 19, 'm'); k.a(76, 19, 'r'); k.a(80, 19, 'b'); k.a(90, 19, 'h')
    return k


def pfahldorf():
    k = Karte(150, 36)
    k.boden(0, 10, 24)
    k.boden(11, 116, 32)
    k.steg(11, 63, 24); k.steg(66, 99, 24); k.steg(103, 116, 24)
    k.r(26, 24, 36, 24, 'W')                         # Plattform am Feuer
    k.r(49, 16, 63, 16, 'W'); k.r(73, 16, 86, 16, 'W'); k.r(89, 14, 98, 14, 'W')   # Dächer
    k.steg(64, 72, 16); k.leiter(99, 14, 23)
    k.boden(117, 117, 23); k.boden(118, 149, 22)
    k.wasser(11, 116, 25)
    k.a(2, 23, 'a'); k.a(8, 23, 'e'); k.a(30, 23, 'f'); k.a(34, 23, 'm'); k.a(40, 23, 'N'); k.a(44, 23, 'L')
    k.a(56, 22, 'l'); k.a(57, 23, 'r'); k.a(56, 15, 'c'); k.a(80, 23, 't'); k.a(93, 13, 'd')
    k.a(112, 23, 's'); k.a(122, 21, 'R'); k.a(126, 21, 'g'); k.a(147, 21, 'z')
    return k


def heilerhaus():
    k = Karte(40, 18)
    k.r(0, 0, 39, 17, 'X'); k.luft(3, 4, 36, 13)
    k.a(5, 13, 't'); k.a(14, 13, 'k'); k.a(20, 13, 'w'); k.a(24, 13, 'b'); k.a(27, 13, 'B'); k.a(30, 13, 'l'); k.a(34, 13, 'c')
    k.a(18, 12, 'L')
    return k


def salzgrube():
    k = Karte(60, 80)
    k.r(0, 0, 59, 79)
    k.luft(4, 1, 40, 5)                 # oben
    k.luft(41, 1, 46, 15)               # Loch nach unten
    k.luft(20, 9, 57, 15)               # Ebene 2
    k.r(24, 15, 26, 15, '^')
    k.luft(5, 22, 45, 27)               # Ebene 3
    k.luft(46, 22, 50, 39)
    k.luft(20, 35, 57, 39)              # Ebene 4
    k.r(19, 36, 19, 39, '%'); k.luft(10, 36, 18, 39)
    k.luft(5, 46, 57, 51)               # Ebene 5
    k.r(30, 51, 32, 51, '^')
    k.luft(53, 52, 56, 57)
    k.luft(5, 58, 57, 63)               # Ebene 6
    k.r(38, 63, 39, 63, '^')
    k.luft(8, 64, 12, 65)
    k.luft(5, 66, 57, 73)               # Grund mit der Hexe
    k.r(4, 70, 4, 73, '|')
    k.leiter(3, 6, 73); k.leiter(21, 16, 27); k.leiter(50, 40, 51)
    k.a(6, 5, 't'); k.a(8, 5, 'a'); k.a(14, 5, 'e'); k.a(30, 5, '1')
    k.a(40, 15, '2'); k.a(30, 27, '3'); k.a(36, 27, '4'); k.a(40, 39, '5'); k.a(14, 39, 'c')
    k.a(8, 51, 'h'); k.a(12, 51, 'i'); k.a(24, 51, '6'); k.a(42, 51, '7')
    k.a(24, 63, '8'); k.a(30, 63, '9')
    k.a(6, 73, 'L'); k.marke(4, 0, 'q'); k.a(24, 73, 'g'); k.a(48, 73, 'x')
    return k


def ufer():
    k = Karte(150, 30)
    k.boden(0, 149, 20)
    k.luft(50, 20, 54, 21); k.luft(125, 20, 130, 26)
    k.r(99, 11, 113, 11, 'W'); k.leiter(98, 11, 19)
    k.steg(125, 130, 20)
    k.wasser(50, 54, 20); k.wasser(125, 130, 21)
    k.a(2, 19, 'a'); k.a(14, 19, 'S'); k.a(30, 19, 'B'); k.a(40, 19, '1'); k.a(60, 19, 'C'); k.a(70, 19, '2'); k.a(74, 19, '3')
    k.a(85, 19, 'D'); k.a(88, 19, 'b'); k.a(104, 10, '5'); k.a(108, 10, 'l'); k.a(110, 10, 'L'); k.a(106, 19, 'k')
    k.a(120, 19, '4'); k.a(138, 19, 'T'); k.a(147, 19, 'z')
    return k


def bruecke():
    k = Karte(190, 44)
    k.boden(0, 19, 14); k.boden(171, 189, 14)
    k.r(20, 14, 170, 16, 'X')
    k.r(95, 14, 104, 16, '%')
    k.boden(20, 170, 40)
    k.boden(60, 90, 38); k.boden(110, 140, 38)
    k.leiter(20, 14, 39); k.leiter(170, 14, 39)
    k.wasser(21, 169, 38)
    k.a(2, 13, 'a'); k.a(6, 13, 'b'); k.a(12, 13, 'k'); k.a(16, 13, 'p'); k.a(45, 13, '1'); k.a(70, 13, '2')
    k.a(99, 13, 'e'); k.a(187, 13, 'z')
    k.a(65, 37, 'l'); k.a(80, 37, 'g'); k.a(100, 37, '3'); k.a(120, 37, '4'); k.a(135, 37, '5'); k.a(155, 37, '6')
    return k


# ---------------------------------------------------------------- Velmora
def stadttor():
    k = Karte(120, 34)
    k.boden(0, 119, 20)
    k.luft(20, 20, 45, 20)
    k.r(55, 2, 75, 15, 'X')
    k.leiter(54, 2, 19)
    k.wasser(20, 45, 20)
    k.a(2, 19, 'a'); k.a(8, 19, 'e'); k.a(48, 19, 'w'); k.a(52, 19, 'i'); k.a(70, 1, 'c'); k.a(65, 19, 'G')
    k.a(84, 19, 'L'); k.a(90, 19, 'k'); k.a(100, 19, '1'); k.a(117, 19, 'z')
    return k


def gassen():
    k = Karte(180, 40)
    k.boden(0, 179, 30)
    k.luft(8, 30, 14, 30); k.luft(80, 30, 86, 30); k.luft(140, 30, 146, 30)
    k.r(19, 17, 33, 17, 'X'); k.leiter(34, 17, 29)
    k.steg(35, 37, 15); k.r(39, 13, 53, 13, 'X')
    k.steg(55, 57, 14); k.r(59, 15, 75, 15, 'X')
    k.r(91, 19, 105, 19, 'X')
    k.r(109, 11, 127, 11, 'X'); k.leiter(108, 11, 29)
    k.steg(129, 132, 12); k.r(134, 14, 151, 14, 'X')
    k.steg(153, 155, 12); k.r(157, 11, 173, 11, 'X')
    k.r(160, 12, 160, 25, 'X'); k.r(160, 26, 160, 29, '|')
    k.wasser(8, 14, 30); k.wasser(80, 86, 30); k.wasser(140, 146, 30)
    k.a(2, 29, 'a'); k.a(28, 29, '1'); k.a(46, 12, 'c'); k.a(58, 29, 'L'); k.a(65, 14, '4'); k.a(70, 29, '2'); k.a(76, 29, '3')
    k.a(98, 29, 'b'); k.a(115, 10, '5'); k.a(130, 29, 'M'); k.a(140, 13, 'w'); k.a(150, 29, '6'); k.a(157, 29, 'h')
    k.a(165, 10, 'o'); k.marke(160, 0, 'q'); k.a(177, 29, 'z')
    return k


def blaueshaus():
    k = Karte(36, 18)
    k.r(0, 0, 35, 17, 'X'); k.luft(3, 4, 32, 13)
    k.a(5, 13, 't'); k.a(16, 13, 'k'); k.a(20, 13, 'z'); k.a(18, 12, 'L'); k.a(26, 13, 'f')
    return k


def brunnenplatz():
    k = Karte(110, 32)
    k.boden(0, 109, 22)
    k.stufen(53, 22, 59, 16); k.boden(59, 72, 16); k.stufen(72, 16, 78, 22)
    k.a(2, 21, 'a'); k.a(8, 21, 'k'); k.a(20, 21, 'L'); k.a(24, 21, 'K'); k.a(30, 21, 'f'); k.a(40, 21, 'm')
    k.a(48, 21, 'M'); k.a(66, 15, 't'); k.a(95, 21, 's'); k.a(107, 21, 'z')
    return k


def hafen():
    k = Karte(180, 40)
    k.boden(0, 40, 24, 'X')
    k.boden(41, 179, 36)
    k.steg(41, 60, 24)
    k.r(61, 22, 61, 24, 'W'); k.r(62, 20, 85, 24, 'W')
    k.leiter(69, 12, 19); k.steg(70, 78, 12)
    k.steg(86, 89, 24); k.r(90, 22, 90, 24, 'W'); k.r(91, 20, 91, 24, 'W'); k.r(92, 18, 118, 24, 'W')
    k.leiter(99, 10, 17); k.steg(100, 108, 10)
    k.steg(119, 138, 24)
    k.r(119, 20, 119, 23, 'W'); k.r(120, 22, 120, 23, 'W')   # Kisten zurück aufs Schiff
    k.boden(139, 179, 24, 'X')
    k.wasser(41, 138, 25)
    k.a(2, 23, 'a'); k.a(6, 23, 'e'); k.a(10, 23, 'i'); k.a(20, 23, 'L'); k.a(30, 23, '1'); k.a(50, 23, '2')
    k.a(66, 19, 'm'); k.a(70, 19, '3'); k.a(78, 19, '4'); k.a(74, 11, '7'); k.a(98, 17, '6'); k.a(105, 17, '5')
    k.a(106, 9, 'j'); k.a(112, 17, 'd'); k.a(125, 23, 'M'); k.a(142, 23, 'g'); k.a(168, 23, 'x')
    return k


def hafenbecken():
    k = Karte(70, 30)
    k.r(0, 0, 69, 29, 'X'); k.luft(3, 4, 66, 21)
    k.luft(20, 22, 26, 22); k.wasser(20, 26, 22)
    k.a(6, 21, 't'); k.a(10, 21, 'e'); k.a(18, 21, 'g'); k.a(30, 21, 'k'); k.a(45, 21, 'x'); k.a(52, 21, 'K'); k.a(62, 21, 'u')
    return k


def kapelle():
    k = Karte(100, 30)
    k.r(0, 0, 99, 29, 'X'); k.luft(3, 6, 96, 23)
    k.steg(10, 40, 14); k.leiter(9, 14, 23)
    k.a(5, 23, 't'); k.a(15, 23, 'B'); k.a(21, 23, 'C'); k.a(27, 23, 'D'); k.a(33, 23, 'E'); k.a(45, 23, 'F')
    k.a(30, 22, '1'); k.a(38, 22, '2'); k.a(20, 12, 'f'); k.a(50, 23, 'Y'); k.a(80, 23, 'Z')
    k.a(25, 13, 'c'); k.a(35, 13, '3')
    k.a(55, 23, 'g'); k.a(62, 23, 'w'); k.a(68, 23, 'p'); k.a(72, 23, 'b'); k.a(75, 23, 'A'); k.a(78, 23, 'z')
    k.a(70, 22, 'k'); k.a(82, 22, 'K'); k.a(86, 23, 'd'); k.a(93, 23, 'u')
    return k


def gruft():
    k = Karte(60, 20)
    k.r(0, 0, 59, 19, 'X'); k.luft(3, 5, 56, 14)
    k.a(5, 14, 't'); k.a(15, 14, 'S'); k.a(24, 14, 'T'); k.a(33, 14, 'U'); k.a(28, 13, '1'); k.a(40, 13, '2')
    k.a(46, 14, 'k'); k.a(48, 14, 'b'); k.a(54, 14, 'c'); k.a(50, 13, 'L')
    return k


def turmtreppe():
    k = Karte(36, 72)
    k.r(0, 0, 35, 71, 'X'); k.luft(4, 3, 31, 67)
    for y in (56, 44, 32, 20, 8):
        k.r(4, y, 31, y, 'X')
    k.leiter(29, 56, 67); k.leiter(6, 44, 55); k.leiter(28, 32, 43); k.leiter(7, 20, 31); k.leiter(27, 8, 19)
    k.steg(14, 18, 52); k.steg(18, 22, 28)
    k.a(5, 67, 't'); k.a(10, 67, 'i'); k.a(14, 67, 'f'); k.a(20, 67, 'n'); k.a(25, 67, 'k')
    k.a(16, 55, '1'); k.a(12, 43, '2'); k.a(18, 43, '3'); k.a(16, 31, '4'); k.a(20, 19, '5')
    k.a(24, 55, 'F'); k.a(14, 31, 'G'); k.a(12, 19, 'c'); k.a(16, 7, 'o')
    return k


def glockenturm():
    k = Karte(64, 24)
    k.boden(0, 63, 18, 'X')
    k.r(0, 0, 63, 3, 'X')
    k.a(3, 17, 't'); k.a(5, 17, 'a'); k.a(6, 16, 'k'); k.a(14, 17, 'g'); k.a(40, 17, 'b'); k.a(46, 17, 'x')
    return k


KARTEN = [
    kiesstrand, wrackfeld, bucht, leuchtturm, leuchtturm_innen, klippenpfad, mole, nebel,
    salzpfad, schilf, pfahldorf, heilerhaus, salzgrube, ufer, bruecke,
    stadttor, gassen, blaueshaus, brunnenplatz, hafen, hafenbecken, kapelle, gruft, turmtreppe, glockenturm
]


def main():
    out = ['/* Erzeugt von mond/werkzeug/karten.py. Änderungen am besten dort vornehmen. */',
           'const KARTEN_BILD = {']
    for f in KARTEN:
        k = f()
        out.append(f'  {f.__name__}: [')
        out.extend('    ' + repr(z) + ',' for z in k.zeilen())
        out.append('  ],')
    out.append('};')
    ZIEL.write_text('\n'.join(out) + '\n')
    print('geschrieben:', ZIEL, len(KARTEN), 'Karten')


if __name__ == '__main__':
    main()
